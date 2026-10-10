# AGENTS.md

This repository is a full-stack spend tracker with a React/TypeScript frontend (`src/`) and Supabase backend (`supabase/`). Machine-actionable specifications live in [`specs/`](./specs/) — read the relevant spec before making changes.

## Spec Index

| Domain | Spec |
|--------|------|
| System Architecture | [specs/00-system-architecture/data-model.spec.md](./specs/00-system-architecture/data-model.spec.md) |
| Auth & Roles | [specs/00-system-architecture/auth-and-roles.spec.md](./specs/00-system-architecture/auth-and-roles.spec.md) |
| Security Invariants | [specs/00-system-architecture/security-invariants.spec.md](./specs/00-system-architecture/security-invariants.spec.md) |
| Transactions (Ingestion & Dedup) | [specs/01-transactions/ingestion-and-dedup.spec.md](./specs/01-transactions/ingestion-and-dedup.spec.md) |
| Category Rules | [specs/01-transactions/categorization-rules.spec.md](./specs/01-transactions/categorization-rules.spec.md) |
| Pagination & Filters | [specs/01-transactions/pagination-and-filters.spec.md](./specs/01-transactions/pagination-and-filters.spec.md) |
| Virtual Category Groups | [specs/02-categories-and-groups/virtual-groups.spec.md](./specs/02-categories-and-groups/virtual-groups.spec.md) |
| Import/Export | [specs/02-categories-and-groups/import-export.spec.md](./specs/02-categories-and-groups/import-export.spec.md) |
| Overview & Pacing | [specs/03-reporting-and-budgets/overview-pacing.spec.md](./specs/03-reporting-and-budgets/overview-pacing.spec.md) |
| Trends Analysis | [specs/03-reporting-and-budgets/trends-analysis.spec.md](./specs/03-reporting-and-budgets/trends-analysis.spec.md) |
| Agent Guide | [specs/agents/AGENTS.md](./specs/agents/AGENTS.md) |

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # Production build
npm run lint       # ESLint
supabase db push   # Apply DB schema
supabase functions serve   # Local edge functions
supabase functions deploy  # Deploy edge functions
```

## Core Invariants

1. **Subcategory-only**: Transactions assigned to subcategories only; parent categories are never directly selectable.
2. **search_path = public**: Every `CREATE FUNCTION` (SECURITY DEFINER or not) must set `search_path = public`.
3. **No service_role in client code**: Use anon key only; RLS enforces tenant isolation.
4. **Dedup overlap-safe**: ±3 day window, exact bucket category matching.
5. **ISO month keys**: Month scoping via `YYYY-MM` string prefix, never BETWEEN.
6. **Sequential imports**: Category CSV imports are sequential; do not batch.
7. **Zero-division guard**: All ratio calculations return 0 when denominator is 0.

See [`specs/agents/AGENTS.md`](./specs/agents/AGENTS.md) for full agent guidance and specialized personas.
