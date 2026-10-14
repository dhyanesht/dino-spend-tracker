-- 1. account_type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE public.account_type AS ENUM ('checking','savings','credit_card','investment','cash','other');
  END IF;
END $$;

-- 2. accounts table (spec §1.1)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.account_type NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_primary ON public.accounts(user_id) WHERE is_primary;

-- 3. transactions extensions (spec §1.2)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'posted',
  ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'expense',
  ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_pair_id UUID,
  ADD COLUMN IF NOT EXISTS income_category TEXT,
  ADD COLUMN IF NOT EXISTS reimbursement_expected_date DATE;

ALTER TABLE public.transactions
  ADD CONSTRAINT IF NOT EXISTS transactions_status_check CHECK (status IN ('pending','posted')),
  ADD CONSTRAINT IF NOT EXISTS transactions_transaction_type_check CHECK (transaction_type IN ('expense','income','transfer','refund','reimbursement'));

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_linked_transaction_id ON public.transactions(linked_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_pair_id ON public.transactions(transfer_pair_id);

-- 4. Backfill existing rows (spec §1.3)
-- 4a. default "Checking" account per user
INSERT INTO public.accounts (user_id, name, type, is_primary)
SELECT u.id, 'Checking', 'checking', true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = u.id AND a.type = 'checking');

-- 4b. legacy rows -> transaction_type = old type, status = posted, account = user's checking
UPDATE public.transactions t
SET transaction_type = COALESCE(t.type, 'expense'),
    status = 'posted'
WHERE t.transaction_type IS NULL OR t.status IS NULL;

UPDATE public.transactions t
SET account_id = (
  SELECT a.id FROM public.accounts a
  WHERE a.user_id = t.user_id AND a.type = 'checking'
  ORDER BY a.is_primary DESC, a.created_at ASC LIMIT 1
)
WHERE t.account_id IS NULL AND t.user_id IS NOT NULL;

ALTER TABLE public.transactions ALTER COLUMN account_id SET NOT NULL;

-- 4c. legacy income rows become true income
UPDATE public.transactions SET income_category = 'other'
WHERE transaction_type = 'income' AND income_category IS NULL;

-- 4d. legacy type column backward compat (decision #2: transfer->expense, refund/reimbursement->income)
UPDATE public.transactions t
SET type = CASE
  WHEN t.transaction_type = 'transfer' THEN 'expense'
  WHEN t.transaction_type IN ('refund','reimbursement') THEN 'income'
  ELSE COALESCE(t.transaction_type, 'expense')
END
WHERE t.type IS DISTINCT FROM CASE
  WHEN t.transaction_type = 'transfer' THEN 'expense'
  WHEN t.transaction_type IN ('refund','reimbursement') THEN 'income'
  ELSE COALESCE(t.transaction_type, 'expense')
END;

-- 5. Balance effect helper (mirrors src/lib/transactionMath.ts)
CREATE OR REPLACE FUNCTION public.transaction_balance_effect(r public.transactions)
RETURNS numeric LANGUAGE plpgsql SET search_path = public AS $$
DECLARE amt numeric := 0;
BEGIN
  IF r.status IS NULL OR r.status <> 'posted' THEN RETURN 0; END IF;
  IF r.account_id IS NULL THEN RETURN 0; END IF;
  CASE r.transaction_type
    WHEN 'expense' THEN amt := -r.amount;
    WHEN 'income','refund','reimbursement' THEN amt := r.amount;
    WHEN 'transfer' THEN amt := r.amount;
    ELSE amt := 0;
  END CASE;
  RETURN amt;
END;
$$;

-- 6. Balance trigger (spec §1.4) — INSERT/UPDATE/DELETE, pending no-op (decision #5)
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    d := public.transaction_balance_effect(NEW);
    IF d <> 0 THEN UPDATE public.accounts SET balance = balance + d, updated_at = now() WHERE id = NEW.account_id; END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD).account_id IS DISTINCT FROM (NEW).account_id
       OR (OLD).transaction_type IS DISTINCT FROM (NEW).transaction_type
       OR (OLD).amount IS DISTINCT FROM (NEW).amount
       OR (OLD).status IS DISTINCT FROM (NEW).status
       OR (OLD).income_category IS DISTINCT FROM (NEW).income_category
       OR (OLD).linked_transaction_id IS DISTINCT FROM (NEW).linked_transaction_id
       OR (OLD).transfer_pair_id IS DISTINCT FROM (NEW).transfer_pair_id THEN
      d := -public.transaction_balance_effect(OLD);
      IF d <> 0 THEN UPDATE public.accounts SET balance = balance + d, updated_at = now() WHERE id = (OLD).account_id; END IF;
      d := public.transaction_balance_effect(NEW);
      IF d <> 0 THEN UPDATE public.accounts SET balance = balance + d, updated_at = now() WHERE id = (NEW).account_id; END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    d := -public.transaction_balance_effect(OLD);
    IF d <> 0 THEN UPDATE public.accounts SET balance = balance + d, updated_at = now() WHERE id = (OLD).account_id; END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_account_balance_trigger ON public.transactions;
CREATE TRIGGER update_account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

-- 7. Integrity trigger (refund/reimbursement sum <= original; spec §9.3)
CREATE OR REPLACE FUNCTION public.validate_transaction_integrity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE orig NUMERIC; total NUMERIC;
BEGIN
  IF NEW.transaction_type IN ('refund','reimbursement') AND NEW.linked_transaction_id IS NOT NULL THEN
    SELECT amount INTO orig FROM public.transactions WHERE id = NEW.linked_transaction_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Linked transaction % not found', NEW.linked_transaction_id; END IF;
    SELECT COALESCE(SUM(amount),0) INTO total
    FROM public.transactions
    WHERE linked_transaction_id = NEW.linked_transaction_id
      AND transaction_type IN ('refund','reimbursement')
      AND status = 'posted';
    IF total + NEW.amount > orig THEN
      RAISE EXCEPTION 'Refund/reimbursement total (% %) exceeds original expense %', total, total + NEW.amount, orig;
    END IF;
  END IF;
  RETURN NEW;
$$;

DROP TRIGGER IF EXISTS validate_transaction_integrity_trigger ON public.transactions;
CREATE TRIGGER validate_transaction_integrity_trigger
  BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_integrity();

-- 8. accounts updated_at trigger
CREATE OR REPLACE FUNCTION public.set_accounts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS set_accounts_updated_at_trigger ON public.accounts;
CREATE TRIGGER set_accounts_updated_at_trigger BEFORE UPDATE ON public.accounts FOR EACH ROW
  EXECUTE FUNCTION public.set_accounts_updated_at();

-- 9. Privilege hygiene (mirror migration 20260607)
REVOKE EXECUTE ON FUNCTION public.update_account_balance() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_transaction_integrity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transaction_balance_effect() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_accounts_updated_at() FROM anon, authenticated, PUBLIC;
