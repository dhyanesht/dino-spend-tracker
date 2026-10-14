# Ledger — Financial Correctness (inline execution, 2026-10-14)

Plan: `docs/superpowers/plans/2026-10-13-financial-correctness.md`
Spec: `docs/superpowers/specs/2026-10-13-financial-correctness-design.md`

## Starting state
Earlier session left placeholder stubs (AccountsManager returns null, seed function no-op, tautological tests, an unapplied hand-written migration file). All stubs are replaced by real implementations below.

## Task 1 — Vitest
Already present (vitest.config.ts, setup, scripts). Smoke passes. Done.

## Task 2 — Migration
- Ruling: deleted hand-written `supabase/migrations/20261013000000_financial_correctness.sql` and applied via the migration tool — the file was never applied (no `accounts` table in DB) and migrations must be tool-managed — cost if wrong: none, SQL is reproduced below in the tool-written migration.
- Ruling: `ADD CONSTRAINT IF NOT EXISTS` is invalid Postgres; replaced with guarded DO blocks — plan defect — cost: none.
- Ruling: backfill sets `transaction_type = type` for ALL legacy rows unconditionally. Plan's `WHERE transaction_type IS NULL` never matches (column added NOT NULL DEFAULT 'expense'), which would silently turn legacy income into expenses — cost if wrong: none, legacy `type` only holds expense/income.
- Ruling: `account_id` stays NULLABLE. Plan says SET NOT NULL but FK is ON DELETE SET NULL (contradiction) and legacy rows with null user_id exist — cost: rows without account have zero balance effect (mirrored in `effect`).
- Ruling: primary index made UNIQUE partial — locked decision #4 requires it; plan SQL omitted UNIQUE — cost: set-primary must unset others first (hook does).
- Ruling: integrity trigger excludes `NEW.id` from the sum and drops the stray no-op transfer block / missing `END;` / stray `COMMIT` — plan defects; otherwise updates double-count themselves.
- Ruling: added GRANTs for `accounts` (authenticated + service_role) — platform requirement, missing in plan.
- Ruling: REVOKE signature for `transaction_balance_effect` is `(public.transactions)` — plan used `()` which would error.
- Ruling: balance backfill — after linking legacy rows to Checking, set each account balance = sum of effects, so balances are consistent with history — cost: opening balance reflects only tracked history (user can edit).
- Ruling: auto-create Checking for new signups is done by the seed edge function (Task 13), not a DB trigger on auth.users — follows plan.
