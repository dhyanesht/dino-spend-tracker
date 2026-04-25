## Goal

Three documentation deliverables:
1. Refresh `README.md` to reflect the project's current state (overview rework, pagination, category groups, AI categorization, Supabase Cloud, etc.).
2. Create a dedicated **ADR** document at `scaling_up/adr.md` consolidating all Architecture Decision Records (extracted from `README-docs.md` plus new ADRs for recent decisions).
3. Create `scaling_up/monarch-comparison.md` — a feature-by-feature comparison vs. Monarch Money with a roadmap to incorporate the gaps.

No application code changes.

---

## 1. README.md refresh

Replace the current README with an updated version that includes:

- **Project tagline & live URLs** (preview + published).
- **Tech stack table** (React 18, TS, Vite, Tailwind, shadcn/ui, TanStack Query, Supabase, Recharts, Lovable AI Gateway).
- **Feature list, grouped**:
  - Transactions: CSV import, AI auto-categorization, store-mapping intelligence, paginated table (25/50/100), filters, swipeable rows.
  - Overview (reworked): month picker, spending pace card, top categories vs budget, weekly breakdown, category pie, recent transactions, MoM comparison.
  - Categories: parent/subcategory model, custom colors, budgets, category groups.
  - Trends: monthly trends, YoY chart, category & parent comparisons, budget performance.
  - Auth & security: Supabase Auth, RLS, `user_roles` + `has_role()` pattern.
- **Architecture diagram** (ASCII) — SPA → Supabase (DB/Auth/Edge Functions) → Lovable AI.
- **Project structure** (top-level dirs).
- **Local dev setup** (clone, `npm i`, `npm run dev`, env vars).
- **Edge functions** (`categorize-transactions`, `seed-category-groups`).
- **Deployment** (Lovable publish, custom domain).
- **Documentation index** linking to every file in `scaling_up/` (including the new `adr.md` and `monarch-comparison.md`).
- **Performance notes** linking to `PERFORMANCE.md`.

---

## 2. scaling_up/adr.md

A standalone ADR log using the standard format (Status / Context / Decision / Consequences / Alternatives) for each record. Will include:

| ADR | Title | Status |
|-----|-------|--------|
| 001 | Supabase as backend platform | Accepted |
| 002 | TanStack Query for server state | Accepted |
| 003 | shadcn/ui component library | Accepted |
| 004 | Client-side CSV parsing | Accepted |
| 005 | Denormalized category references on transactions | Accepted |
| 006 | Roles in separate `user_roles` table with `has_role()` SECURITY DEFINER | Accepted |
| 007 | Two-tier category model (parent + subcategory) | Accepted |
| 008 | Lovable AI Gateway for transaction categorization | Accepted |
| 009 | Month-scoped Overview (replacing all-time totals) | Accepted |
| 010 | Client-side pagination for Transactions table | Accepted |
| 011 | `SET search_path = public` on all SECURITY DEFINER functions | Accepted |
| 012 | Category groups as a flexible many-to-many overlay | Accepted |

Each ADR ~10–20 lines with a pros/cons table and alternatives considered. Cross-link from `README-docs.md` (replace inline ADRs with a pointer to `adr.md`).

---

## 3. scaling_up/monarch-comparison.md

Structure:

### A. Monarch feature inventory (sourced from monarch.com / monarchmoney.com)
Grouped capabilities:
- Account aggregation (Plaid/Finicity bank, brokerage, crypto, real estate via Zillow, manual accounts)
- Net worth tracking over time (assets, liabilities, trend chart)
- Transactions (auto-categorization, rules, splits, merchant cleanup, search, tags, notes, attachments)
- Budgeting (flex, category, group budgets, rollover)
- Cash flow reports (income vs expense, sankey)
- Recurring bills & subscriptions detection
- Goals (savings, debt payoff, retirement, progress tracking)
- Investments (holdings, allocation, performance)
- Collaboration (partner/advisor with shared access, roles)
- Mobile apps (iOS/Android), web
- Notifications & alerts
- Reports, custom dashboards, filters
- Imports (CSV) and integrations
- Security (2FA, encryption, read-only Plaid)

### B. Side-by-side comparison table

| Feature area | Monarch | Spend Tracker today | Gap |
|---|---|---|---|
| Bank aggregation | Plaid/Finicity live sync | Manual + CSV import | Major |
| Transactions list | ✅ rules, splits, tags, notes, attachments | ✅ list, filters, edit, AI categorize, store mapping; ❌ splits, tags, notes, attachments, rules engine | Medium |
| Categories | ✅ unlimited, hierarchical, groups | ✅ parent/sub, groups, colors, budgets | Parity |
| Budgets | ✅ category, group, flex, rollover | ✅ per-category monthly; ❌ rollover, flex, group budgets | Medium |
| Overview | ✅ month-scoped, pace, MoM | ✅ month picker, pace, MoM, weekly, top categories | Parity |
| Net worth | ✅ accounts/assets/liabilities over time | ❌ none | Major |
| Cash flow / income | ✅ sankey, income vs expense | Partial (income tracked, no sankey) | Medium |
| Recurring bills | ✅ auto-detect, forecast | ❌ none | Major |
| Goals | ✅ savings/debt with linked accounts | ❌ none | Major |
| Investments | ✅ holdings, allocation | ❌ none | Major |
| Collaboration | ✅ partner/advisor | ❌ single user | Major |
| Mobile apps | ✅ native iOS/Android | Responsive web only | Medium |
| Reports | ✅ rich, custom | ✅ Trends/YoY/Budget perf | Minor |
| Notifications | ✅ email/push | ❌ none | Medium |
| Security | ✅ 2FA, read-only sync | ✅ Supabase Auth + RLS; ❌ 2FA | Medium |
| Pricing model | Paid SaaS | Self-hosted / personal | n/a |

### C. Gap analysis & how to incorporate

For each major gap, a short spec:

1. **Account aggregation (Plaid)** — add Supabase Edge Function `plaid-link-token` + `plaid-exchange`; `accounts` and `account_balances` tables; nightly sync via cron. Trade-off: Plaid pricing, PII handling.
2. **Net worth tracking** — `accounts` table (type: depository/credit/loan/investment/real_estate/manual), daily `account_balance_snapshots`, NetWorth page with stacked area chart.
3. **Recurring bills detection** — Edge Function scanning transactions for periodicity (amount + cadence + merchant); `recurring_series` table; "Upcoming" widget on Overview.
4. **Goals** — `goals` table (target_amount, target_date, linked account_ids, type); progress card; contribution suggestions.
5. **Transaction enhancements** — splits (`transaction_splits`), tags (`tags` + `transaction_tags` join), notes/attachments (Supabase Storage), rules engine (`categorization_rules` table evaluated on insert).
6. **Budgets v2** — group budgets via `category_groups`, rollover field, flex budget = remaining ÷ remaining days.
7. **Cash flow Sankey** — Recharts/d3-sankey on Trends tab; income sources → categories → savings.
8. **Collaboration** — `households` table, invite flow, RLS keyed on household membership instead of user_id; reuse existing `user_roles` pattern with household-scoped role.
9. **Investments** — phase 1: manual holdings; phase 2: brokerage via Plaid Investments.
10. **2FA / security hardening** — enable Supabase MFA, add `security` settings page.
11. **Notifications** — `notification_preferences` table + Edge cron (budget threshold, large transaction, bill due) → email via Resend.
12. **Mobile** — Capacitor wrapper around the existing React app for iOS/Android.

### D. Suggested roadmap (phased)

| Phase | Theme | Items |
|---|---|---|
| 1 (1–2 sprints) | Quick wins | Tags, notes, splits, recurring detection, rollover budgets |
| 2 (2–3 sprints) | Net worth foundation | Accounts table, manual balances, net worth chart, goals |
| 3 (3–4 sprints) | Aggregation | Plaid integration, auto-sync, investments |
| 4 (2 sprints) | Collaboration & mobile | Households, sharing, Capacitor mobile build, push notifications |

### E. Out-of-scope / explicit non-goals
Crypto wallets, tax filing, bill pay execution.

---

## Files created/modified

- `README.md` — rewritten
- `scaling_up/adr.md` — new
- `scaling_up/monarch-comparison.md` — new
- `scaling_up/README-docs.md` — small edit: ADR section replaced with link to `adr.md`
