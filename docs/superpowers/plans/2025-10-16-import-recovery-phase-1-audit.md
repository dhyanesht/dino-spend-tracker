# Phase 1 — Audit Existing Implementation

**Goal:** Understand current import behavior, dedup, transfers, and DB policies before changing schema.

## Scope

- Read `src/components/dashboard/CSVImporter.tsx` end-to-end.
- Read `src/lib/transactionDedup.ts` and related tests.
- Read `src/hooks/useTransactions.ts` (queries, inserts, transfer handling).
- Read `src/hooks/useAccounts.ts` and balance update logic.
- Inspect existing migrations for `transactions`, `accounts`, RLS policies.
- Document invariants that must not change: ±3-day dedup window, exact bucket category matching, subcategory-only, anon key only, search_path=public.

## Deliverables

- `docs/superpowers/audit/import-recovery-audit.md` capturing:
  - Current import flow steps and failure points.
  - Transfer linkage model (`linked_transaction_id`) and deletion semantics.
  - Existing dedup inputs/outputs and ambiguous-match handling.
  - DB constraints, indexes, RLS policies touching transactions/accounts.
  - Queries that affect balances/budgets.

## Acceptance

- Audit doc exists and is referenced by Phase 2.
- No code changes in this phase.
