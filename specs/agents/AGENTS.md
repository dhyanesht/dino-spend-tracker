# AGENTS.md — AI Agent Guide for Dino Spend Tracker

## Overview

This file provides guidance for AI agents (Claude Code, Kilo Code, autonomous agents, etc.) working within the Dino Spend Tracker repository. All domain knowledge is captured in machine-actionable spec documents under `/specs/`. This file is the entry point.

---

## Spec Directory Structure

```
specs/
├── 00-system-architecture/
│   ├── data-model.spec.md           # Full DB schema, tables, types, RLS, triggers
│   ├── auth-and-roles.spec.md       # Auth model, roles, edge function auth
│   └── security-invariants.spec.md  # search_path, RLS, privilege escalation rules
├── 01-transactions/
│   ├── ingestion-and-dedup.spec.md  # CSV import, dedup algorithm, transaction types
│   ├── categorization-rules.spec.md # Subcategory-only assignment, AI categorization contract
│   └── pagination-and-filters.spec.md # Client-side filtering, pagination rules
├── 02-categories-and-groups/
│   ├── virtual-groups.spec.md       # Many-to-many group↔category, hooks API
│   └── import-export.spec.md        # JSON export/import validation rules
├── 03-reporting-and-budgets/
│   ├── overview-pacing.spec.md      # Month-scoped dashboard calculations
│   └── trends-analysis.spec.md      # Historical trends, budget performance, group analytics
└── agents/
    └── AGENTS.md                    # This file
```

---

## How Agents Should Use the Specs

1. **Before making any changes**, read the relevant spec(s) for the domain you're working in. Each spec file contains:
   - Entity definitions with TypeScript interfaces
   - Invariants (strict rules that must never be violated)
   - Test oracles (Given/When/Then acceptance criteria)
   - Source references (file paths and line numbers)

2. **When implementing**, check the spec for:
   - Field names and types must match exactly
   - Invariants must be preserved at all costs
   - Test oracle conditions must pass after your changes

3. **When adding new behavior**, update the relevant spec first, then implement.

4. **When modifying existing behavior that violates an invariant**, flag it and update the spec with a documented exception.

---

## Commands Reference

### Development

```bash
npm run dev        # Start Vite dev server (port 5173)
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Serve production build locally
```

### Supabase

```bash
supabase db push           # Push schema changes
supabase db reset          # Reset local database
supabase functions serve   # Serve edge functions locally
supabase functions deploy  # Deploy edge functions
```

### Testing

```bash
npm run lint        # Lint + type check
# No dedicated test runner configured — rely on lint and manual verification
```

---

## Specialized Agent Personas

### Database Agent
- **Primary files**: `supabase/migrations/*.sql`, `supabase/functions/*`
- **Key specs**: `specs/00-system-architecture/data-model.spec.md`, `security-invariants.spec.md`
- **Focus areas**: Schema changes, RLS policies, `search_path = public` invariant, trigger logic

### UI/Component Agent
- **Primary files**: `src/components/dashboard/*`
- **Key specs**: `specs/01-transactions/pagination-and-filters.spec.md`, `specs/03-reporting-and-budgets/`
- **Focus areas**: React component behavior, client-side state management, date calculations

### Category & Transaction Agent
- **Primary files**: `src/hooks/useTransactions.ts`, `src/hooks/useCategories.ts`, `src/lib/transactionDedup.ts`, `src/lib/validation.ts`
- **Key specs**: `specs/01-transactions/*`, `specs/02-categories-and-groups/*`
- **Focus areas**: Type validation, dedup algorithm, CSV parsing, export/import logic

### Testing Agent
- **Primary files**: All spec files, `src/`
- **Key specs**: All `*.spec.md` files
- **Focus areas**: Verifying test oracles, writing new acceptance criteria, catching invariant violations

### Edge Function Agent
- **Primary files**: `supabase/functions/categorize-transactions/index.ts`, `supabase/functions/seed-category-groups/index.ts`
- **Key specs**: `specs/00-system-architecture/auth-and-roles.spec.md`, `specs/01-transactions/categorization-rules.spec.md`
- **Focus areas**: JWT verification, Lovable AI API integration, request/response contracts

---

## Immutable Rules (Checklist Before Any Commit)

1. **Subcategory-only assignment**: Transactions can only be assigned to subcategories (categories with a non-null `parent_category`). Parent categories must never be directly selectable in assignment UI.

2. **search_path invariant**: ALL `CREATE FUNCTION` statements in migrations and ALL `supabase.rpc()` calls in edge functions MUST set `search_path = public` if the function is `SECURITY DEFINER`. Functions that don't set it are a security vulnerability.

3. **RLS is never bypassed in client code**: The client (`supabase/functions/*` and `src/`) must never use `service_role` key. Use the anon key with user JWT only.

4. **Dedup is overlap-safe**: The dedup window must remain ±3 days with exact bucket category matching. Changing these parameters requires updating both the algorithm and acceptance criteria.

5. **No breaking changes to export format**: The category export JSON schema is part of the user's data contract. Changes must be backward-compatible.

6. **Date calculations use ISO month keys**: Month scoping uses `YYYY-MM` string prefix matching on date fields, not `date` column comparisons or BETWEEN operators.

7. **Budget is parent-level only in trends**: `getBudgetPerformanceData` aggregates by parent category budgets, not subcategory sums. This is by design.

8. **Import processes sequentially**: Category imports must remain sequential to preserve error visibility. Batch inserts that obscure individual failures violate this rule.

9. **Empty state consistency**: When no data exists (no transactions, no spending), components must return `null` or an empty state component — never crash.

10. **MoM/YoY division by zero guard**: Any percentage calculation that divides by a potentially-zero previous period must return `0`, not `NaN` or `Infinity`.

---

## Getting Started

1. Read the root `kilo.json` for project configuration
2. Review `specs/00-system-architecture/` for system fundamentals
3. Navigate to the specific domain spec for the feature you're working on
4. Consult the specialized agent guidelines above for your focus area

---

## Questions & Feedback

For Kilo-specific help: run `/help` in the CLI.
To report issues: https://github.com/Kilo-Org/kilocode/issues
