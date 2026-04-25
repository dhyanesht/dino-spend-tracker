# Architecture Decision Records (ADRs)

This document is the canonical log of significant architectural decisions for the Personal Spending Tracker. Each record uses the format **Status / Context / Decision / Consequences / Alternatives**.

## Index

| # | Title | Status |
|---|-------|--------|
| ADR-001 | Supabase as backend platform | Accepted |
| ADR-002 | TanStack Query for server state | Accepted |
| ADR-003 | shadcn/ui component library | Accepted |
| ADR-004 | Client-side CSV parsing | Accepted |
| ADR-005 | Denormalized category references on transactions | Accepted |
| ADR-006 | Roles in a separate `user_roles` table with `has_role()` | Accepted |
| ADR-007 | Two-tier category model (parent + subcategory) | Accepted |
| ADR-008 | Lovable AI Gateway for transaction categorization | Accepted |
| ADR-009 | Month-scoped Overview (replacing all-time totals) | Accepted |
| ADR-010 | Client-side pagination for the Transactions table | Accepted |
| ADR-011 | `SET search_path = public` on every `SECURITY DEFINER` function | Accepted |
| ADR-012 | Category groups as a flexible many-to-many overlay | Accepted |

---

## ADR-001: Supabase as backend platform

- **Status:** Accepted
- **Context:** We need auth, a relational database, row-level authorization, and a serverless runtime with minimal ops for a small project.
- **Decision:** Use Supabase (Postgres + GoTrue + Edge Functions) as the backend.

| Pros | Cons |
|------|------|
| Auth, DB, REST, Realtime out of the box | Vendor lock-in |
| Postgres-native RLS for per-user isolation | RLS has a learning curve |
| Edge Functions cover server-side needs (AI calls, seeders) | Cold starts |
| Generous free tier; managed via Lovable Cloud | Pricing scales with rows / function calls |

- **Alternatives considered:** Firebase, custom Node + Postgres, AWS Amplify.

---

## ADR-002: TanStack Query for server state

- **Status:** Accepted
- **Context:** The app is read-heavy with frequent re-fetches and benefits from caching, deduplication and optimistic updates.
- **Decision:** Use TanStack Query for all server data; keep React local state for UI only.

| Pros | Cons |
|------|------|
| Cache, dedupe, background refetch | Not for pure client state |
| Optimistic updates and invalidation | Extra dependency |
| Excellent DevTools | Mental model takes time |

- **Alternatives considered:** RTK Query, SWR, bare `fetch` + `useEffect`.

---

## ADR-003: shadcn/ui component library

- **Status:** Accepted
- **Context:** We need accessible, themeable primitives that integrate naturally with Tailwind.
- **Decision:** Use shadcn/ui (copy-in components on top of Radix), not an installed component library.

| Pros | Cons |
|------|------|
| Full control of source | Manual updates |
| Tailwind-native | More code in the repo |
| Radix accessibility baseline | Some setup time |

- **Alternatives considered:** Material UI, Chakra UI, Headless UI.

---

## ADR-004: Client-side CSV parsing

- **Status:** Accepted
- **Context:** Users import bank exports and want immediate column mapping and preview.
- **Decision:** Parse CSVs in the browser; send mapped, validated rows to Supabase via REST.

| Pros | Cons |
|------|------|
| Instant preview and mapping UI | Memory-bound for very large files |
| No upload step or temp storage | Browser CPU on parse |
| Works offline | |

- **Alternatives considered:** Server-side parsing, hybrid.

---

## ADR-005: Denormalized category references on transactions

- **Status:** Accepted
- **Context:** Every transaction needs a category. Users rename/delete categories rarely.
- **Decision:** Store the **category name** as text on `transactions` rather than a foreign key.

| Pros | Cons |
|------|------|
| Simpler queries, no joins | No referential integrity |
| Human-readable rows | Renames require backfill |
| Trivial legacy import | Risk of typos / drift |

- **Alternatives considered:** FK to `categories.id` with cascading rules.

---

## ADR-006: Roles in a separate `user_roles` table

- **Status:** Accepted
- **Context:** Storing roles on `profiles` is a known privilege-escalation foot-gun. RLS policies must check role safely.
- **Decision:** Dedicated `user_roles` table; check via a `has_role(_user_id, _role)` `SECURITY DEFINER` function.

| Pros | Cons |
|------|------|
| Eliminates self-escalation via UPDATE on profile | Extra table/function |
| Avoids recursive RLS pitfalls | Roles granted by admin/migration |
| Testable from a single function | |

- **Alternatives considered:** `is_admin` boolean on profiles (insecure), JWT custom claims (harder to mutate).

---

## ADR-007: Two-tier category model (parent + subcategory)

- **Status:** Accepted
- **Context:** Users want broad reporting (e.g., "Food") and granular tracking (e.g., "Coffee shops").
- **Decision:** A `categories` row may have a `parent_id`. Transactions must reference a **subcategory**; reports roll up via parent.

| Pros | Cons |
|------|------|
| Fits how users naturally budget | Slightly more complex pickers |
| Enables both rollup and detail views | Validation needed at insert |

- **Alternatives considered:** Flat tags, arbitrary depth tree.

---

## ADR-008: Lovable AI Gateway for transaction categorization

- **Status:** Accepted
- **Context:** Auto-categorizing imported transactions improves the import UX dramatically.
- **Decision:** Call Lovable AI Gateway from the `categorize-transactions` edge function; never expose the key in the browser.

| Pros | Cons |
|------|------|
| Provider-agnostic, key managed by platform | Adds an LLM cost per import |
| Server-side keeps secrets safe | Need fallback when model is down |
| Easy to swap models | Output requires schema validation |

- **Alternatives considered:** Direct OpenAI/Anthropic from edge function, client-side calls (insecure).

---

## ADR-009: Month-scoped Overview

- **Status:** Accepted
- **Context:** The original Overview showed all-time totals — not actionable. Reference apps (Copilot Money, YNAB, Monarch) all default to the current month.
- **Decision:** Rebuild the Overview around a **MonthPicker** with cards (Spending Pace, Top Categories vs Budget, Weekly Breakdown, Category Pie, Recent Transactions, MoM comparison).

| Pros | Cons |
|------|------|
| Drives daily decisions ("am I on pace?") | Some users still want lifetime totals |
| Aligns with industry conventions | More derived calculations |

- **Alternatives considered:** Keep all-time totals, year-scoped overview.
- **Reference:** [`overview-rework-ideas.md`](./overview-rework-ideas.md).

---

## ADR-010: Client-side pagination for the Transactions table

- **Status:** Accepted
- **Context:** Rendering 700+ transactions at once produced thousands of DOM nodes (rows, dialogs, badges) and made the tab feel slow.
- **Decision:** Slice the in-memory transactions array client-side (default 25, options 50/100) with first/prev/next/last controls. Filtering and search still operate on the full set.

| Pros | Cons |
|------|------|
| No backend changes | Initial fetch still loads all rows |
| Instant page switching | Doesn't scale to 100k rows |
| Compatible with existing filters | |

- **Alternatives considered:** Virtualized list, server-side pagination.

---

## ADR-011: `SET search_path` on all `SECURITY DEFINER` functions

- **Status:** Accepted
- **Context:** Supabase's database linter flagged `update_updated_at_column()` for missing an explicit `search_path`, leaving it open to search-path hijacking.
- **Decision:** Every `SECURITY DEFINER` function must include `SET search_path = public` (or its explicit schema(s)).

| Pros | Cons |
|------|------|
| Closes a real privilege-escalation vector | One more line per function |
| Lints clean, documents intent | Must be remembered in every migration |

- **Alternatives considered:** Drop `SECURITY DEFINER` (breaks RLS-aware helpers like `has_role`).

---

## ADR-012: Category groups as a many-to-many overlay

- **Status:** Accepted
- **Context:** Users want ad-hoc groupings ("Discretionary", "Fixed costs") without restructuring the parent/subcategory tree.
- **Decision:** Add `category_groups` and `category_group_mappings`. A category can belong to many groups; reports can pivot on either dimension.

| Pros | Cons |
|------|------|
| Flexible reporting without breaking the tree | Extra join in group reports |
| Users can experiment without destructive edits | Two ways to "categorize" — needs UX clarity |

- **Alternatives considered:** Second `parent_id`, tags on categories.
