DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE public.account_type AS ENUM ('checking','savings','credit_card','investment','cash','other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_user_primary ON public.accounts(user_id) WHERE is_primary;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'posted',
  ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'expense',
  ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_pair_id UUID,
  ADD COLUMN IF NOT EXISTS income_category TEXT,
  ADD COLUMN IF NOT EXISTS reimbursement_expected_date DATE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_status_check') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('pending','posted'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_transaction_type_check') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN ('expense','income','transfer','refund','reimbursement'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_linked_transaction_id ON public.transactions(linked_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_pair_id ON public.transactions(transfer_pair_id);

-- Backfill
INSERT INTO public.accounts (user_id, name, type, is_primary)
SELECT u.id, 'Checking', 'checking', true FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = u.id);

UPDATE public.transactions SET transaction_type = CASE WHEN type = 'income' THEN 'income' ELSE 'expense' END, status = 'posted';

UPDATE public.transactions t SET account_id = (
  SELECT a.id FROM public.accounts a WHERE a.user_id = t.user_id
  ORDER BY a.is_primary DESC, a.created_at ASC LIMIT 1)
WHERE t.account_id IS NULL AND t.user_id IS NOT NULL;

UPDATE public.transactions SET income_category = 'other'
WHERE transaction_type = 'income' AND income_category IS NULL;

CREATE OR REPLACE FUNCTION public.transaction_balance_effect(r public.transactions)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF r.status IS DISTINCT FROM 'posted' OR r.account_id IS NULL THEN RETURN 0; END IF;
  CASE r.transaction_type
    WHEN 'expense' THEN RETURN -r.amount;
    WHEN 'income', 'refund', 'reimbursement', 'transfer' THEN RETURN r.amount;
    ELSE RETURN 0;
  END CASE;
END;
$$;

UPDATE public.accounts a SET balance = COALESCE((
  SELECT SUM(public.transaction_balance_effect(t)) FROM public.transactions t WHERE t.account_id = a.id), 0);

CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d NUMERIC;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    d := -public.transaction_balance_effect(OLD);
    IF d <> 0 THEN UPDATE public.accounts SET balance = balance + d WHERE id = OLD.account_id; END IF;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    d := public.transaction_balance_effect(NEW);
    IF d <> 0 THEN UPDATE public.accounts SET balance = balance + d WHERE id = NEW.account_id; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS update_account_balance_trigger ON public.transactions;
CREATE TRIGGER update_account_balance_trigger AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

CREATE OR REPLACE FUNCTION public.validate_transaction_integrity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE orig NUMERIC; total NUMERIC;
BEGIN
  IF NEW.transaction_type IN ('refund','reimbursement') AND NEW.linked_transaction_id IS NOT NULL THEN
    SELECT amount INTO orig FROM public.transactions WHERE id = NEW.linked_transaction_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Linked transaction % not found', NEW.linked_transaction_id; END IF;
    SELECT COALESCE(SUM(amount),0) INTO total FROM public.transactions
    WHERE linked_transaction_id = NEW.linked_transaction_id
      AND transaction_type IN ('refund','reimbursement') AND status = 'posted' AND id <> NEW.id;
    IF NEW.status = 'posted' AND total + NEW.amount > orig THEN
      RAISE EXCEPTION 'Refund/reimbursement total % exceeds original expense %', total + NEW.amount, orig;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_transaction_integrity_trigger ON public.transactions;
CREATE TRIGGER validate_transaction_integrity_trigger BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_integrity();

DROP TRIGGER IF EXISTS set_accounts_updated_at_trigger ON public.accounts;
CREATE TRIGGER set_accounts_updated_at_trigger BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_account_balance() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_transaction_integrity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transaction_balance_effect(public.transactions) FROM anon, authenticated, PUBLIC;