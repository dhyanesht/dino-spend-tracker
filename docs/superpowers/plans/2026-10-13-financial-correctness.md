# Financial Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate double-counting of credit-card payments, exclude refunds/reimbursements from income reports, add account + transfer + refund + reimbursement + pending/posted tracking, and make all spending/income/cash-flow reports financially correct per the design doc.

**Architecture:** A single Supabase migration extends `accounts` + `transactions` and a balance trigger keeps `accounts.balance` in sync. A thin pure-logic module (`src/lib/transactionMath.ts`) mirrors the trigger's balance-effect rules so the math is unit-tested in TypeScript. All report queries move from the legacy `type` column to `transaction_type` (+ `status = 'posted'`). The UI (SmartTransactionDialog, Transactions list, CSV importer, Accounts tab, Refund/Reimbursement reports) consumes new hooks built on the extended schema. An edge function seeds default accounts on signup.

**Tech Stack:** React 18 + TS, Vite, TanStack Query, Zod, Supabase (Postgres), shadcn/UI, react-router-dom; ESLint (typescript-eslint). Edge functions are Deno/TypeScript. No test runner exists today — Task 0 adds Vitest for pure-logic tests; DB migration is verified via `supabase db push`; components via `npm run build` + `npm run lint` + manual smoke.

**Spec:** `docs/superpowers/specs/2026-10-13-financial-correctness-design.md`

## Scope Note

This spec covers 8 subsystems (DB schema, transaction types, reporting, CSV import, UI, API, validation, backward-compat). They are **not independently shippable** — every layer depends on the `accounts` table + `transaction_type` columns introduced by the migration (Task 2). Splitting into per-subsystem plans would strand each plan without its foundation. This plan therefore contains all subsystems as sequential task groups. The single exception is the seed edge function, which is independently testable. If the team prefers, Phase 0–4 (backend/data layer) can be executed and reviewed as one workstream, then Phase 5–13 (UI/reporting) as a second.

## Global Constraints

- `search_path = public` on every `CREATE FUNCTION` (SECURITY DEFINER or not) — per AGENTS.md §Core Invariants #2.
- No `service_role` key in client code; use anon key only; RLS enforces tenant isolation — AGENTS.md #3.
- Month scoping via `YYYY-MM` string prefix, never `BETWEEN` — AGENTS.md #5.
- All ratio/zero-denominator math returns 0 — AGENTS.md #6.
- Transactions assigned to subcategories only; parent categories never directly selectable — AGENTS.md #1.
- Dedup ±3 day window, exact bucket-category match (existing `src/lib/transactionDedup.ts` — unchanged).
- Category CSV imports are sequential (existing CSVImporter — keep sequential inserts).
- Every function gets `search_path = public` and `SECURITY DEFINER`, and `REVOKE EXECUTE ... FROM anon, authenticated, PUBLIC` (pattern from migration `20260607154343`).

## Locked Design Decisions (implementer cannot derive these)

1. **Transfer sign convention** — The spec shows both transfer rows as `amount=$500` and defers source/dest to "the application when creating the pair," leaving the trigger non-deterministic. **Decision:** transfer rows store a *signed* amount — source (money out) `amount=-500`, destination (money in) `amount=+500`, both sharing `transfer_pair_id`. The trigger's transfer effect is simply `NEW.amount` (signed). The UI always works with positive magnitudes; the hook negates the source side before insert. This keeps the trigger a pure per-row function, no cross-row join, net-zero across the pair — and satisfies acceptance 9.1 exactly.
2. **Legacy `type` column** — Spec §8.1 mapping (transfer→`expense`, refund→`income`, reimbursement→`income`). **Decision:** the insert hook computes `type = transaction_type === 'income' ? 'income' : 'expense'` (transfers/refunds/reimbursements collapse to `expense`/`income`). New code never queries `type`; Task 5 removes every report query that does.
3. **Non-expense `category`** — `transactions.category` stays `NOT NULL` (legacy). **Decision:** for income → category = `income_category` value (e.g. `"salary"`); for transfer → `"Transfer"`; for refund/reimbursement → the original expense's category (audit trail). None are real subcategories so the existing `validate_transaction_category` trigger passes them.
4. **One primary account per user** — Spec §5.4 says "Set primary account" but the §1.1 `accounts` schema has no primary flag. **Decision:** add `is_primary BOOLEAN NOT NULL DEFAULT false` + partial unique index `(user_id) WHERE is_primary`.
5. **Pending balance effect** — Spec §3.5 says pending excluded from totals. **Decision:** the trigger's effect function returns `0` when `status <> 'posted'`, so pending rows never move `accounts.balance`; the "include pending" toggle is a client-side recompute against pending rows, not a balance change.
6. **Disallowed edits on posted transactions** — Spec §1.4 offers "disallow updating amount/type/account." **Decision:** the EditTransactionDialog (Task 7) disables `amount`, `transaction_type`, `account_id`, `linked_transaction_id`, `transfer_pair_id` on `posted` rows; only `description`, `category`, `status`, and `reimbursement_expected_date` are editable. The trigger still handles the general `UPDATE` delta so status toggles (pending↔posted) correctly adjust balance.

## File Structure

```
supabase/
  migrations/20261013000000_financial_correctness.sql   # DDL + triggers + backfill
  functions/seed-default-accounts/index.ts            # new edge function
src/
  lib/transactionMath.ts                               # pure logic (balance effect, predicates, net cash flow)
  lib/validation.ts                                  # modify: extend transactionSchema + accountSchema
  integrations/supabase/types.ts                    # modify: Database types (accounts, tx columns)
  hooks/useAccounts.ts                                # new
  hooks/useTransactions.ts                          # modify: extend Transaction + mutations
  hooks/useTransactionFilters.ts                    # modify: account/type/status filters
  hooks/useCategories.ts                            # modify: add account-aware helpers? (no)
  components/dashboard/AccountSelector.tsx          # new (reusable)
  components/dashboard/SmartTransactionDialog.tsx   # modify
  components/dashboard/TransactionFilters.tsx      # modify
  components/dashboard/TransactionTable.tsx         # modify
  components/dashboard/StaticTransactionRow.tsx     # modify
  components/dashboard/SwipeableTransactionRow.tsx  # modify
  components/dashboard/overview/RevenueCard.tsx     # new (cash flow + net worth)
  components/dashboard/RefundReport.tsx             # new
  components/dashboard/ReimbursementReport.tsx      # new
  components/dashboard/AccountsManager.tsx          # new
  components/dashboard/CSVImporter.tsx             # modify
  components/dashboard/ExpenseOverview.tsx         # modify
  components/dashboard/TrendsAnalysis.tsx          # modify
  components/dashboard/BudgetManager.tsx           # modify
  components/dashboard/CategoryManager.tsx         # modify
  pages/Dashboard.tsx                               # modify: tabs
  components/ui/bottom-tab-bar.tsx                 # modify: tabs
  App.tsx                                            # modify: routes
vitest.config.ts                                    # new
tests/unit/transactionMath.test.ts                  # new
tests/unit/validation.test.ts                       # new
```

> Report-query sites currently using the legacy `type` column that must switch to `transaction_type` (verified by grep): `ExpenseOverview.tsx:27,42,49` · `TrendsAnalysis.tsx:58` · `BudgetManager.tsx:61,70` · `CategoryManager.tsx:36` · `TransactionFilters.ts` · `StaticTransactionRow.tsx:65,70,71` · `SwipeableTransactionRow.tsx:62,63` · `overview/RecentTransactions.tsx:43,44`.

## Review Focus

Input classes / failure modes most likely to bite a user. Each line is pinned to a test in the owning task.

1. **A credit-card payment must never be counted as spending** — `transaction_type='transfer'` excluded from expense totals → pinned in Task 3 (`isExpense`). [spec §3.1, §9.1]
2. **A refund must not inflate income nor reduce expenses** — `transaction_type='refund'` excluded from true income; original expense unchanged → pinned in Task 3 (`isTrueIncome`, `sumRefunds`) + Task 5. [spec §3.2, §9.2]
3. **Cumulative refunds must not exceed the original purchase** — sum of linked refunds ≤ original amount; over-limit rejected → pinned in Task 3 (`wouldExceedOriginal`) + Task 2 integrity trigger. [spec §9.3]
4. **Pending transactions must not appear in any default total** — `status='pending'` excluded unless explicitly included → pinned in Task 3 (`isExpense`/`isTrueIncome` require posted) + Task 5 toggle. [spec §3.5, §9.5]
5. **`accounts.balance` must stay correct across transfer pairs and deletes** — source −, dest +, deletes reverse, pending rows are a no-op → pinned in Task 3 (`effect`/`computeBalanceEffect` mirror) + Task 2 trigger. [spec §2.1, §9.1]

---

### Task 1: Test harness (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` — add `devDependencies` `"vitest": "^2.1.0"`, `"@testing-library/react": "^14.0.0"`, `"@testing-library/jest-dom": "^6.0.0"`; add scripts `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:unit": "vitest run tests/unit"`.
- Create: `tests/unit/smoke.test.ts` (trivial: `expect(1+1).toBe(2)`)

**Interfaces:**
- Consumes: `@/` path alias (from tsconfig `paths`).
- Produces: `npm run test` runs under Vitest with jsdom env.

- [ ] **Step 1: Write the smoke test**

```ts
import { describe, it, expect } from 'vitest';
it('smoke', () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 2: Run it / it fails (no runner yet)**

`npx vitest run tests/unit/smoke.test.ts` → Expected: fails with `vitest: command not found`, then after adding the dep + config: PASS.

- [ ] **Step 3: Add `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', globals: false, include: ['tests/unit/**/*.test.ts'], setupFiles: ['./tests/unit/setup.ts'] },
});
```

- [ ] **Step 4: Add setup + run**

`tests/unit/setup.ts`:
```ts
import '@testing-library/jest-dom';
```
`npm run test` → PASS. Commit.

---

### Task 2: Database migration (schema, backfill, balance trigger, integrity)

**Files:**
- Create: `supabase/migrations/20261013000000_financial_correctness.sql`

**Interfaces:**
- Consumes: nothing new (extends `auth.users`, `public.categories`, `public.transactions`, `public.stores`).
- Produces: `accounts` table w/ `account_type` enum + RLS + index; `transactions` new columns (`account_id`,`status`,`transaction_type`,`linked_transaction_id`,`transfer_pair_id`,`income_category`,`reimbursement_expected_date`,`is_primary`?) + indexes; `update_account_balance()` fn + trigger; `validate_transaction_integrity()` fn + trigger; backfill for existing rows; `type` legacy column left in place.

Exact DDL (from spec §1.1, §1.2, §1.4) plus the locked decisions (#1 signed transfers, #5 pending no-op, #6):

- [ ] **Step 1: Write the migration**

```sql
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

-- 3. transactions extensions (spec §1.2) — nullable adds, backfilled below
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

-- 4d. keep category NOT NULL; default non-expense placeholders are applied by the app on insert, never on legacy rows

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
    WHEN 'transfer' THEN amt := r.amount;  -- signed at insert by app (source -, dest +)
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

-- 7. Integrity trigger (refund/reimbursement sum <= original; decisions spec §7.2 / §9.3)
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
  IF NEW.transaction_type = 'transfer' AND NEW.transfer_pair_id IS NOT NULL AND NEW.amount IS DISTINCT FROM 0 THEN
    -- transfer pair must reference the same pair id on both sides (app enforces creation)
    NULL;
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
-- (existing validate_transaction_category / set_updated_at revocations already exist)
COMMIT;
```

> Note: `validate_transaction_category` keeps subcategory-only enforcement at the DB level; it already passes for non-expense categories (no parent match), so no change required.

- [ ] **Step 2: Dry-run the migration**

`supabase db push --dry-run` (or `supabase db push` against local) → Expected: `Finished supabase db push. ✓ All migrations executed. No schema changes found.` when already applied; on fresh: no errors. Requires Supabase CLI + local or linked project (note pre-condition).

---

### Task 3: Pure-logic module (`transactionMath.ts`) + unit tests

**Files:**
- Create: `src/lib/transactionMath.ts`
- Create: `tests/unit/transactionMath.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the canonical, unit-tested mirror of the balance trigger + the report predicates every component will import.

```ts
// src/lib/transactionMath.ts
export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund' | 'reimbursement';
export type TxStatus = 'pending' | 'posted';
export type IncomeCategory = 'salary' | 'interest' | 'dividends' | 'refund' | 'reimbursement' | 'other';

export const TRUE_INCOME_CATEGORIES: readonly IncomeCategory[] = ['salary', 'interest', 'dividends', 'other'];
export const LEGACY_TYPE_BY_NEW: Record<TransactionType, 'expense' | 'income'> = {
  expense: 'expense', income: 'income', transfer: 'expense', refund: 'income', reimbursement: 'income',
};

export interface MathTransaction {
  id?: string;
  account_id: string | null;
  amount: number;
  transaction_type: TransactionType;
  status: TxStatus;
  income_category: IncomeCategory | null;
  linked_transaction_id: string | null;
  transfer_pair_id: string | null;
}

export const isPosted = (t: MathTransaction) => t.status === 'posted';
export const isExpense = (t: MathTransaction) => isPosted(t) && t.transaction_type === 'expense';
export const isTrueIncome = (t: MathTransaction) =>
  isPosted(t) && t.transaction_type === 'income' &&
  t.income_category != null && TRUE_INCOME_CATEGORIES.includes(t.income_category);
export const isRefund = (t: MathTransaction) => isPosted(t) && t.transaction_type === 'refund';
export const isReimbursement = (t: MathTransaction) => isPosted(t) && t.transaction_type === 'reimbursement';

export const effect = (t: MathTransaction): number => {
  if (!isPosted(t) || !t.account_id) return 0;
  switch (t.transaction_type) {
    case 'expense': return -t.amount;
    case 'income': case 'refund': case 'reimbursement': return t.amount;
    case 'transfer': return t.amount; // signed at insert (source -, dest +)
    default: return 0;
  }
};

export const sumExpenses = (txns: MathTransaction[]) => txns.filter(isExpense).reduce((s, t) => s + t.amount, 0);
export const sumTrueIncome = (txns: MathTransaction[]) => txns.filter(isTrueIncome).reduce((s, t) => s + t.amount, 0);
export const sumRefunds = (txns: MathTransaction[]) => txns.filter(isRefund).reduce((s, t) => s + t.amount, 0);
export const sumReimbursements = (txns: MathTransaction[]) => txns.filter(isReimbursement).reduce((s, t) => s + t.amount, 0);
export const netCashFlow = (txns: MathTransaction[]) =>
  sumTrueIncome(txns) - sumExpenses(txns) + sumRefunds(txns) + sumReimbursements(txns);

// Refund-over-original guard (spec §9.3)
export const wouldExceedOriginal = (originalAmount: number, existing: MathTransaction[], incoming: number) =>
  existing.filter(isRefund).reduce((s, t) => s + t.amount, 0) + incoming > originalAmount;
```

- [ ] **Step 1: Write the failing tests** 

```ts
import { describe, it, expect } from 'vitest';
import { effect, isExpense, isTrueIncome, netCashFlow, sumExpenses, sumRefunds, wouldExceedOriginal, LEGACY_TYPE_BY_NEW } from '@/lib/transactionMath';

const exp = (t) => ({ account_id: 'a1', amount: 100, transaction_type: 'expense', status: 'posted', income_category: null, linked_transaction_id: null, transfer_pair_id: null, ...t });

describe('isExpense excludes transfers/refunds/reimbursements/pending', () => {
  it('excludes a posted transfer', () => {
    expect(isExpense(exp({ transaction_type: 'transfer', amount: -500, transfer_pair_id: 'p1' }))).toBe(false);
  });
  it('excludes a pending expense', () => {
    expect(isExpense(exp({ status: 'pending' }))).toBe(false);
  });
  it('includes a posted expense', () => {
    expect(isExpense(exp({}))).toBe(true);
  });
});

describe('true income', () => {
  it('accepts salary', () => {
    expect(isTrueIncome(exp({ transaction_type: 'income', income_category: 'salary' }))).toBe(true);
  });
  it('rejects refund/reimbursement income_category', () => {
    expect(isTrueIncome(exp({ transaction_type: 'income', income_category: 'refund' }))).toBe(false);
  });
});

describe('net cash flow & double-count guard (spec §9.2)', () => {
  it('100 expense + 30 refund => expenses 100, refunds 30, net spending 70', () => {
    const txns = [
      exp({ amount: 100 }),
      exp({ transaction_type: 'refund', linked_transaction_id: 'e1', income_category: 'refund', amount: 30 }),
    ];
    expect(sumExpenses(txns)).toBe(100);
    expect(sumRefunds(txns)).toBe(30);
    expect(netCashFlow(txns)).toBe(-70); // income(0) - expenses(100) + refunds(30) + reimbursements(0)
  });
  it('transfer pair nets to zero and is excluded (spec §9.1)', () => {
    const txns = [
      exp({ transaction_type: 'transfer', amount: -500, account_id: 'checking', transfer_pair_id: 'p1' }),
      exp({ transaction_type: 'transfer', amount: 500, account_id: 'cc', transfer_pair_id: 'p1' }),
    ];
    expect(sumExpenses(txns)).toBe(0);
    expect(netCashFlow(txns)).toBe(0);
  });
});

describe('balance effect mirror of trigger', () => {
  it('source transfer -500, dest +500; delete reverses', () => {
    const src = exp({ transaction_type: 'transfer', amount: -500, account_id: 'checking' });
    expect(effect(src)).toBe(-500);
    const dst = exp({ transaction_type: 'transfer', amount: 500, account_id: 'cc' });
    expect(effect(dst)).toBe(500);
  });
  it('pending is a no-op', () => {
    expect(effect(exp({ status: 'pending' }))).toBe(0);
  });
  it('null account is a no-op', () => {
    expect(effect(exp({ account_id: null }))).toBe(0);
  });
});

describe('refund over-original guard (spec §9.3)', () => {
  it('allows 50+40 of 120, rejects a further 50', () => {
    const orig = 120;
    const existing = [exp({ transaction_type: 'refund', amount: 50 }), exp({ transaction_type: 'refund', amount: 40 })];
    expect(wouldExceedOriginal(orig, existing, 0)).toBe(false);   // already 90 ≤ 120
    expect(wouldExceedOriginal(orig, existing, 50)).toBe(true);  // 140 > 120
  });
});

describe('legacy type mapping (decision #2)', () => {
  it('maps per spec §8.1', () => {
    expect(LEGACY_TYPE_BY_NEW.transfer).toBe('expense');
    expect(LEGACY_TYPE_BY_NEW.refund).toBe('income');
    expect(LEGACY_TYPE_BY_NEW.reimbursement).toBe('income');
  });
});
```

- [ ] **Step 2: Run the tests / confirm they fail**

`npm run test -- transactionMath` → Expected: FAIL (module `src/lib/transactionMath.ts` not found).

- [ ] **Step 3: Implement `src/lib/transactionMath.ts`** (body as above — the signatures/tests don't determine `effect`'s switch or `wouldExceedOriginal`'s arithmetic, so the body is included).

- [ ] **Step 4: Run tests / confirm pass**

`npm run test -- transactionMath` → PASS (all green).

- [ ] **Step 5: Commit**

---

### Task 4: Extend TypeScript types + Zod schemas

**Files:**
- Modify: `src/integrations/supabase/types.ts` — add `accounts` table (Row/Insert/Update), `account_type` + `income_category` enums, extend `transactions` Row/Insert/Update with the new columns.
- Modify: `src/lib/validation.ts` — extend `transactionSchema` per spec §7.1 (with `refine` block) + add `accountSchema`, `accountTypeSchema`, `incomeCategorySchema`.

**Interfaces:**
- Consumes: spec §7.1 zod schema + spec §1.1/§1.2 columns.
- Produces: `AccountInput` type, extended `TransactionInput`; existing imports keep working.

- [ ] **Step 1: Write failing test** (`tests/unit/validation.test.ts`)

```ts
import { transactionSchema, accountSchema } from '@/lib/validation';
it('requires category for expense', () => { expect(transactionSchema.safeParse({ description:'x', amount:5, date:'2026-01-02', transaction_type:'expense', account_id:'00000000-0000-0000-0000-000000000000' }).success).toBe(false); });
it('requires transfer_pair_id for transfer', () => { expect(transactionSchema.safeParse({ description:'x', amount:5, date:'2026-01-02', category:'Food', transaction_type:'transfer', account_id:'00000000-0000-0000-0000-000000000000' }).success).toBe(false); });
it('requires linked_transaction_id for refund', () => { expect(transactionSchema.safeParse({ description:'x', amount:5, date:'2026-01-02', transaction_type:'refund', account_id:'00000000-0000-0000-0000-000000000000' }).success).toBe(false); });
it('requires income_category for income', () => { expect(transactionSchema.safeParse({ description:'x', amount:5, date:'2026-01-02', transaction_type:'income', account_id:'00000000-0000-0000-0000-000000000000' }).success).toBe(false); });
it('defaults type=expense, status=posted, transaction_type=expense', () => { const r = transactionSchema.parse({ description:'x', amount:5, date:'2026-01-02', category:'Food', account_id:'00000000-0000-0000-0000-000000000000' }); expect(r.transaction_type).toBe('expense'); expect(r.status).toBe('posted'); expect(r.type).toBe('expense'); });
it('account schema defaults currency USD, is_active true', () => { const a = accountSchema.parse({ name:'Checking', type:'checking' }); expect(a.currency).toBe('USD'); expect(a.is_active).toBe(true); });
```

- [ ] **Step 2: Run / fails** (`npm run test -- validation` → FAIL: module/parse errors).

- [ ] **Step 3: Implement** — exact schema from spec §7.1:
```ts
export const transactionTypeSchema = z.enum(['expense','income','transfer','refund','reimbursement']);
export const transactionStatusSchema = z.enum(['pending','posted']);
export const incomeCategorySchema = z.enum(['salary','interest','dividends','refund','reimbursement','other']);
export const accountTypeSchema = z.enum(['checking','savings','credit_card','investment','cash','other']);

export const transactionSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(1_000_000).finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1).optional(), // required below only for expense
  type: z.enum(['expense','income']).default('expense'),
  transaction_type: transactionTypeSchema.default('expense'),
  account_id: z.string().uuid(),
  status: transactionStatusSchema.default('posted'),
  linked_transaction_id: z.string().uuid().nullable().optional(),
  transfer_pair_id: z.string().uuid().nullable().optional(),
  income_category: incomeCategorySchema.nullable().optional(),
  reimbursement_expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).refine(data => {
  if (data.transaction_type === 'expense') return Boolean(data.category);
  if (data.transaction_type === 'transfer') return Boolean(data.transfer_pair_id);
  if (data.transaction_type === 'refund' || data.transaction_type === 'reimbursement') return Boolean(data.linked_transaction_id);
  if (data.transaction_type === 'income') return Boolean(data.income_category);
  return true;
}, { message: 'Missing required fields for transaction type' });

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: accountTypeSchema,
  balance: z.number().finite().optional(),
  currency: z.string().trim().min(3).max(3).default('USD'),
  is_active: z.boolean().default(true),
  is_primary: z.boolean().default(false),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
```

- [ ] **Step 4: Run / pass** (`npm run test -- validation` → PASS). Then `npx tsc -b --noEmit` to confirm types.ts compiles (the hand-edit must be structurally valid).

- [ ] **Step 5: Commit.**

---

### Task 5: Accounts hook + AccountSelector

**Files:**
- Create: `src/hooks/useAccounts.ts`
- Create: `src/components/dashboard/AccountSelector.tsx`

**Interfaces:**
- Consumes: `accountSchema`/`AccountInput`; `Account` type.
- Produces: `useAccounts`, `useAddAccount`, `useSetPrimaryAccount` (unsets others), `useUpdateAccount`, `useDeleteAccount` (soft via `is_active=false`); `<AccountSelector>` props `{ value?: string; onChange: (id)=>void; accounts?: Account[]; placeholder?: string }`.

- [ ] **Step 1: Write failing test** — `useAccounts` shape + `useSetPrimaryAccount` payload logic (pure helper `setPrimaryPayload` extracted):

```ts
// src/lib/accountOps.ts  (thin pure helpers, testable)
export const setPrimaryPayload = (id: string) => id; // consumed by hook that calls rpc to unset others first
```
Keep simple: the hook calls supabase RPC or two updates. To keep testable without DB, extract the "unset others" as a pure function is overkill. Instead, test `AccountSelector` rendering with `@testing-library`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import AccountSelector from '@/components/dashboard/AccountSelector';
it('renders accounts and fires onChange', () => {
  const accts = [{ id:'1', name:'Checking', type:'checking', balance:0, is_active:true, is_primary:false }];
  const fn = vi.fn();
  render(<AccountSelector value="" onChange={fn} accounts={accts} />);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('Checking'));
  expect(fn).toHaveBeenCalledWith('1');
});
```

> This requires `@testing-library/react` installed (Task 1 added it). If the engineer prefers not to add component deps, fall back to **manual smoke**: render in dev, confirm dropdown lists accounts + primary marked.

- [ ] **Step 2: Run / fails.**
- [ ] **Step 3: Implement** `useAccounts` (mirrors `useCategories` pattern: `useQuery` select `* order name`, mutations invalidating `['accounts']`) + `AccountSelector` (shadcn `<Select>` over `useAccounts` data, shows balance + primary star).
- [ ] **Step 4: Run / pass** (`npm run test -- accountSelector`) or manual smoke `npm run dev` → Accounts dialog shows seeded accounts.
- [ ] **Step 5: Commit.**

---

### Task 6: Extended transaction hooks (transfer/refund/reimbursement)

**Files:**
- Modify: `src/hooks/useTransactions.ts` — extend `Transaction` interface (add `transaction_type`, `status`, `account_id`, `linked_transaction_id`, `transfer_pair_id`, `income_category`, `reimbursement_expected_date`, `is_primary`); add `useAddTransaction`/`useAddMultipleTransactions` to carry the new fields + `type = LEGACY_TYPE_BY_NEW[transaction_type]`; add `useAddTransfer`, `useAddRefund`, `useAddReimbursement`.

**Interfaces:**
- Consumes: `Transaction` from this file; `transactionSchema`; `TransactionType`/`IncomeCategory` from `transactionMath`.
- Produces: `useAddTransaction`, `useAddTransfer({ sourceAccountId, destAccountId, amount, date, description })`, `useAddRefund({ originalId, originalCategory, accountId, amount, date, description })`, `useAddReimbursement({ originalId, accountId, amount, date, description, expectedDate })`.

- [ ] **Step 1: Write failing test** for pure payload builders in `tests/unit/transactionPayloads.test.ts`. Add a `src/lib/transactionPayloads.ts` with pure builders so the logic is tested independently of supabase.

```ts
// src/lib/transactionPayloads.ts
export const buildTransferRows = (input) => { /* returns two insert objects, same transfer_pair_id, source amount negative */ };
export const buildRefundRow = (input) => ({ transaction_type:'refund', linked_transaction_id, income_category:'refund', balance_effect: +amount, type: LEGACY_TYPE_BY_NEW.refund ('income'), ... });
export const buildReimbursementRow = (input) => ({ transaction_type:'reimbursement', income_category:'reimbursement', linked_transaction_id, reimbursement_expected_date, balance_effect: +amount, type:'income', ... });
```
Tests:
```ts
it('transfer: source negative, dest positive, shared pair id', () => {
  const [src,dst] = buildTransferRows({ sourceAccountId:'c1', destAccountId:'cc1', amount:500, date:'2026-10-13', description:'card pay', userId:'u' });
  expect(src.amount).toBe(-500); expect(dst.amount).toBe(500);
  expect(src.account_id).toBe('c1'); expect(dst.account_id).toBe('cc1');
  expect(src.transfer_pair_id).toBe(dst.transfer_pair_id);
  expect(src.transaction_type).toBe('transfer'); expect(src.type).toBe('expense');
});
it('refund links to original + positive balance_effect', () => {
  const r = buildRefundRow({ originalId:'e1', originalCategory:'Food', accountId:'c1', amount:30, date:'2026-10-13', description:'return', userId:'u' });
  expect(r.transaction_type).toBe('refund');
  expect(r.linked_transaction_id).toBe('e1');
  expect(r.income_category).toBe('refund');
  expect(r.balance_effect).toBe(30);
  expect(r.type).toBe('income');
});
it('reimbursement sets expected date', () => {
  const r = buildReimbursementRow({ originalId:'e1', originalCategory:'Food', accountId:'c1', amount:200, date:'2026-10-13', description:'team lunch repaid', expectedDate:'2026-10-15', userId:'u' });
  expect(r.transaction_type).toBe('reimbursement'); expect(r.reimbursement_expected_date).toBe('2026-10-15');
});
```

- [ ] **Step 2: Run / fails.**
- [ ] **Step 3: Implement builders + wire `useAddTransaction`/`useAddTransfer`/`useAddRefund`/`useAddReimbursement` to supabase insert + invalidate `['transactions','accounts']`.** `useAddTransaction` computes `type = LEGACY_TYPE_BY_NEW[transaction_type]` and defaults `status='posted'`, `transaction_type='expense'`.
- [ ] **Step 4: Run / pass.** Then `npx tsc -b`.
- [ ] **Step 5: Commit.**

---

### Task 7: SmartTransactionDialog extension (account/type/transfer/link/status)

**Files:**
- Modify: `src/components/dashboard/SmartTransactionDialog.tsx`

**Interfaces:**
- Consumes: `useAccounts`, `useAddTransaction`, `useAddTransfer`, `useAddRefund`, `useAddReimbursement`, `useSubcategories` (for expense category).
- Produces: a single dialog that switches form based on `transaction_type`.

- [ ] **Step 1: Write failing test** (`src/components/dashboard/__tests__/SmartTransactionDialog.test.tsx`) — renders type selector + account selector for transfer mode. (Component test; if heavy, fall back to manual smoke.)

```tsx
it('shows two account selectors in transfer mode', async () => {
  render(<TestApp><SmartTransactionDialog /></TestApp>);
  fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));
  // open type select -> pick Transfer
  ...expect two AccountSelector instances...
});
```
- [ ] **Step 2: Run / fails.**
- [ ] **Step 3: Implement** — add `transactionType` state (`'expense'` default); account selector (required); amount field; for `transfer` render from/to account selectors + compute transfer via `useAddTransfer`; for `refund`/`reimbursement` render a "link to original" picker (autocomplete over the user's expenses, by merchant/description) + expected date for reimbursement; add a `status` select (`pending`/`posted`, default `posted`). Reuse `AccountSelector`. Keep store-name auto-categorization for expenses unchanged.
- [ ] **Step 4: Run / pass** (`npm run test -- SmartTransactionDialog`) or manual smoke `npm run dev` → dialog shows account + type + status; transfer shows two accounts; refund shows link picker.
- [ ] **Step 5: Commit.**

---

### Task 8: Transactions filters + list indicators

**Files:**
- Create: `src/lib/transactionFilters.ts` (pure `filterTransactions(txns, filters)` + `FilterSpec` interface) + `tests/unit/transactionFilters.test.ts`.
- Modify: `src/hooks/useTransactionFilters.ts` — add `filterAccount`, `filterStatus`, `filterTransactionType`, `includePending` (default exclude pending).
- Modify: `src/components/dashboard/TransactionFilters.tsx` — add Account / Transaction Type / Status / Include pending UI.
- Modify: `src/components/dashboard/TransactionTable.tsx` — add `Type`, `Status`, `Account` columns.
- Modify: `src/components/dashboard/StaticTransactionRow.tsx` / `SwipeableTransactionRow.tsx` — color the type Badge, show linked/transfer indicators, gray-out pending.
- Modify: `src/components/dashboard/overview/RecentTransactions.tsx` — use `isExpense`/amount sign from type.

**Interfaces:**
- Consumes: `isExpense`, `isRefund`, `isReimbursement`, `isTrueIncome`, `effect` from `transactionMath`; extended `Transaction` interface.
- Produces: `filterTransactions(txns, { account, type, status, includePending, term, date, minAmount, maxAmount })`.

- [ ] **Step 1: Write failing tests** (spec §5.2 + §9.5 pending behavior):
```ts
import { filterTransactions } from '@/lib/transactionFilters';
const t = (o) => ({ account_id:'a1', amount:10, transaction_type:'expense', status:'posted', income_category:null, linked_transaction_id:null, transfer_pair_id:null, category:'Food', date:'2026-10-13', description:'x', type:'expense', id:'1', ...o });
it('excludes pending by default', () => expect(filterTransactions([t({status:'pending'}), t({id:'2'})]).length).toBe(1));
it('includes pending when toggled', () => expect(filterTransactions([t({status:'pending'}), t({id:'2'})], { includePending:true }).length).toBe(2));
it('filters by transaction_type=transfer', () => expect(filterTransactions([t({transaction_type:'transfer', amount:-5, transfer_pair_id:'p1', account_id:'c1'}), t({id:'2'})], { type:'transfer' }).length).toBe(1));
it('filters by account', () => expect(filterTransactions([t({account_id:'a1'}), t({id:'2', account_id:'a2'})], { account:'a1' }).length).toBe(1));
```
- [ ] **Step 2: Run / fails.**
- [ ] **Step 3: Implement `filterTransactions`** + hook + UI. Hook returns `filteredTransactions` computed from `filterTransactions`.
- [ ] **Step 4: Run / pass** (`npm run test -- transactionFilters`) + `npx tsc -b`.
- [ ] **Step 5: Commit.**

---

### Task 9: Reporting fixes + new dashboard cards (Net Worth / Cash Flow)

**Files:**
- Modify: `src/components/dashboard/ExpenseOverview.tsx` — replace `t.type === 'expense'` (lines 27,42,49) with `isExpense(t)` from `transactionMath`; add "Include pending" toggle feeding `sumExpenses`/`netCashFlow`; surface `netCashFlow` + total true income as dashboard numbers.
- Create: `src/components/dashboard/overview/CashFlowCard.tsx` — shows `netCashFlow`, true income, expenses, refunds, reimbursements (spec §3.3, §5.3 "Net Worth / Cash Flow").
- Modify: `src/components/TrendsAnalysis.tsx` + `src/utils/trendsDataUtils.ts` — `transactions.filter(t => t.type === 'expense')` → `isExpense(t)`; exclude pending (pass posted subset).
- Modify: `src/components/dashboard/BudgetManager.tsx` — `t.type === 'expense'` → `isExpense(t)`.
- Modify: `src/components/dashboard/CategoryManager.tsx` — `t.category === categoryName && t.type === 'expense'` → `t.category === categoryName && isExpense(t)`.

**Interfaces:**
- Consumes: `sumExpenses`, `sumTrueIncome`, `sumRefunds`, `sumReimbursements`, `netCashFlow`, `isExpense` from `transactionMath`; `useTransactions`.
- Produces: expense total, true-income total, net cash flow visible on Overview; pending-aware.

- [ ] **Step 1: Write failing test** that pins the fix — `tests/unit/reportingParity.test.ts`:
```ts
import { sumExpenses } from '@/lib/transactionMath';
// After migration, transfers must NOT appear in expenses even though legacy type='expense'
const txns = [
  { transaction_type:'expense', status:'posted', type:'expense', amount:100, account_id:'a1', income_category:null, linked_transaction_id:null, transfer_pair_id:null, category:'Food', date:'2026-10-13', description:'x', id:'1' },
  { transaction_type:'transfer', status:'posted', type:'expense', amount:500, account_id:'a1', income_category:null, linked_transaction_id:null, transfer_pair_id:'p1', category:'Transfer', date:'2026-10-13', description:'y', id:'2' },
];
expect(sumExpenses(txns)).toBe(100); // the transfer (legacy type='expense') is excluded
```
- [ ] **Step 2: Run / fails** (already passing from Task 3 — this is a regression guard; treat as the spec acceptance test).
- [ ] **Step 3: Implement the component changes** (use `isExpense`); add `CashFlowCard` to Overview.
- [ ] **Step 4: Verify** `npx tsc -b` + manual smoke: a $500 transfer no longer inflates Expense Overview; Cash Flow card shows net = income − expenses + refunds + reimbursements.
- [ ] **Step 5: Commit.**

---

### Task 10: Refund & Reimbursement report pages

**Files:**
- Create: `src/components/dashboard/RefundReport.tsx`
- Create: `src/components/dashboard/ReimbursementReport.tsx`
- Modify: `src/pages/Dashboard.tsx` — add `reports` tab slot.
- Modify: `src/components/ui/bottom-tab-bar.tsx` — add a `Reports` entry (spec §5.3).
- Modify: `src/App.tsx` — add `<Route path="/reports" ...>`? Dashboard already routes `/dashboard`; reports can be a tab. Keep as Dashboard tab to avoid router churn.

**Interfaces:**
- Consumes: `useTransactions`, `sumRefunds`/`sumReimbursements`, `isRefund`/`isReimbursement`, `useSubcategories` (to resolve category names + colors).
- Produces: Refund report (lists refunds grouped by linked original + total), Reimbursement report (lists reimbursements + outstanding vs expected).

- [ ] **Step 1: Write failing test** — the grouping math in a pure helper `src/lib/refundReport.ts`:
```ts
export const refundedByOriginal = (txns) => txns.filter(isRefund).reduce((m, t) => { (m[t.linked_transaction_id] = m[t.linked_transaction_id]||0); m[t.linked_transaction_id]+=t.amount; return m; }, {});
```
Test:
```ts
it('groups refunds by original id, sums amounts', () => {
  const txns = [t({transaction_type:'refund', linked_transaction_id:'e1', amount:30}), t({transaction_type:'refund', linked_transaction_id:'e1', amount:20}), t({transaction_type:'refund', linked_transaction_id:'e2', amount:50})];
  expect(refundedByOriginal(txns)).toEqual({ e1: 50, e2: 50 });
});
```
- [ ] **Step 2: Run / fails.**
- [ ] **Step 3: Implement helper + report components.** Refund report: table of `linked_transaction_id` → total refunded + original amount (fetched via `linked_transaction_id` lookup) + remaining. Reimbursement report: list reimbursements with `reimbursement_expected_date` and outstanding sum.
- [ ] **Step 4: Verify** `npx tsc -b` + manual smoke (open Reports tab; see refund/reimbursement totals; spec §9.2 $30 refund shown).
- [ ] **Step 5: Commit.**

---

### Task 11: Accounts management tab

**Files:**
- Create: `src/components/dashboard/AccountsManager.tsx`
- Modify: `src/pages/Dashboard.tsx` — add `accounts` tab.
- Modify: `src/components/ui/bottom-tab-bar.tsx` — add `Accounts` entry.

**Interfaces:**
- Consumes: `useAccounts`, `useAddAccount`, `useUpdateAccount`, `useDeleteAccount`, `useSetPrimaryAccount`, `AccountSelector`.
- Produces: Accounts CRUD list (name, type, balance, currency, active, primary), inline edit, soft-delete, set-primary (unsets others).

- [ ] **Step 1: Write failing test** — `useSetPrimaryAccount` calls supabase to set `is_primary=true` for the chosen account and `false` for the user's others. Test the mutation payload shape via a pure `setPrimaryMutations(userId, id)` helper returning the two update objects.
- [ ] **Step 2: Run / fails.**
- [ ] **Step 3: Implement** `AccountsManager` (table + add form using `accountSchema`).
- [ ] **Step 4: Verify** `npx tsc -b` + manual smoke (Dashboard → Accounts tab → add "Credit Card", set primary, balances load from `accounts.balance`).
- [ ] **Step 5: Commit.**

---

### Task 12: CSV importer enhancements (account mapping, transfer & refund detection, status)

**Files:**
- Modify: `src/components/dashboard/CSVImporter.tsx`
- Create: `src/lib/csvDetection.ts` (pure helpers) + `tests/unit/csvDetection.test.ts`

**Interfaces:**
- Consumes: `useAccounts` (default account), `useAddTransfer` (for paired transfers), `useAddRefund` (for linked refunds), `transactionSchema`, `isExpense`.
- Produces: detection helpers `detectAccountColumn(headers)`, `isTransferPayment(row)`, `isRefundDescription(desc)`, `parseStatus(str)`, and an "Unmatched Transfers" pairing panel.

- [ ] **Step 1: Write failing tests** (spec §4.1–4.4):
```ts
it('detects account column', () => { expect(detectAccountColumn(['Date','Description','Amount','Account Name'])).toBe(3); });
it('defaults to null (handled by caller -> primary checking)', () => { expect(detectAccountColumn(['Date','Description','Amount'])).toBeNull(); });
it('flags negative amount as payment', () => { expect(isTransferPayment(-500, 'AMAZON')).toBe(true); });
it('flags PAYMENT/PYMT in positive checking row as payment', () => { expect(isTransferPayment(500, 'PAYMENT THANK YOU')).toBe(true); });
it('detects refund description', () => { expect(isRefundDescription('TARGET RETURN REFUND')).toBe(true); });
it('maps status string', () => { expect(parseStatus('pending')).toBe('pending'); expect(parseStatus('posted')).toBe('posted'); expect(parseStatus('')).toBe('posted'); });
```
- [ ] **Step 2: Run / fails.**
- [ ] **Step 3: Implement** `csvDetection.ts` + wire into `CSVImporter.parseTransactions`: add `account` column mapping (default to primary checking from `useAccounts`); route negative-amount rows and `PAYMENT|PYMT` rows into an `unmatchedTransfers` list (each keeps its `account_id` candidate); route refund-description rows into the normal list with a `suggestedRefundOf` link to the most-recent same-merchant expense in the ±3d window (reuse `transactionDedup` helpers); add `status` column mapping (default `posted`, map `pending`/`posted` strings). Render an "Unmatched Transfers" panel: user picks source + dest accounts → `useAddTransfer`. Wire import to insert refunds via `useAddRefund` (linked) and transfers via `useAddTransfer`.
- [ ] **Step 4: Verify** `npm run test -- csvDetection` + manual smoke (import a card CSV with a -$500 payment → appears in Unmatched Transfers panel; pair → both accounts adjust).
- [ ] **Step 5: Commit.**

> Note spec §6 "Sequential imports": keep category/store insertions sequential (existing path already is).

---

### Task 13: Seed default accounts edge function

**Files:**
- Create: `supabase/functions/seed-default-accounts/index.ts`
- Modify: `supabase/config.toml` — add `[functions.seed-default-accounts] verify_jwt = true`.
- Modify: `src/contexts/AuthContext.tsx` (or a hook) — invoke `seed-default-accounts` once after first successful sign-in.

**Interfaces:**
- Consumes: `useAccounts` to check existence (client skips if accounts exist); the function creates Checking, Savings, Credit Card, Cash for the calling user.
- Produces: idempotent function returning `{ created: string[] }`.

- [ ] **Step 1: Write the function** per `seed-category-groups/index.ts` pattern — guard on "no accounts yet", insert the 4 default accounts, `is_primary` on Checking.
- [ ] **Step 2: Verify** `supabase functions serve` + invoke from the app after sign-in; accounts appear in `Accounts` tab. (Local only — needs Supabase CLI.)
- [ ] **Step 3: Commit.**

---

### Task 14: End-to-end verification against acceptance criteria

- [ ] `npm run lint` → 0 errors.
- [ ] `npx tsc -b` → 0 type errors.
- [ ] `npm run build` → succeeds.
- [ ] `supabase db push` → migration applies cleanly on a fresh project.
- [ ] `npm run test -- unit` → all green.
- [ ] Manual acceptance 9.1–9.7 (local Supabase):
  - 9.1: create Checking + Credit Card; record $500 transfer; balances move correctly; Expense Overview shows $0.
  - 9.2: $100 Target expense + $30 refund → Overview $100; Refund report $30; net spend $70.
  - 9.3: $120 expense + $50 + $40 refunds OK; +$50 rejected (integrity trigger).
  - 9.4: $200 reimbursable expense + $200 reimbursement → Overview $200, Reimbursement $200, net $0.
  - 9.5: pending txns hidden by default; "include pending" shows them.
  - 9.6: card CSV payment → unmatched row; pair → both sides share pair id.
  - 9.7: migrated historical reports unchanged.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-13-financial-correctness.md`.

A few things to confirm before implementation:

1. **Test runner:** This repo has *no* test runner today (`AGENTS.md`: "No dedicated test runner configured — rely on lint and manual verification"). Task 1 adds Vitest because the financial math (transfers/refunds/pending) is high-risk and needs automated unit tests. If you'd rather avoid the new dependency, every `npm run test` gate collapses to manual smoke — say the word and I'll drop Vitest and switch the verification style.

2. **Local Supabase:** `supabase` CLI is not installed in this environment, so `supabase db push` and edge-function checks (Tasks 2, 13, 14) can only be verified locally where the CLI is available. That's expected — flag it now so I'm not blocked later.

3. **Transfer sign convention (decision #1):** I deviated from the design doc's "amount=$500 both" by using signed amounts (source −, dest +) so the trigger is a deterministic per-row function. If you'd rather keep both amounts positive and add an explicit `transfer_role` column instead, tell me and I'll revise the migration.

Does the plan capture what you want, and which execution approach should we use?

- **Subagent-driven** — a fresh subagent per task + independent reviewer before the next; most thorough for the DB trigger math.
- **Native** — I implement all tasks in this session, then one review of the branch; fastest.
