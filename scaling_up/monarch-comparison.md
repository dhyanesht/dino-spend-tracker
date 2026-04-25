# Monarch Money — Feature Comparison & Roadmap

A side-by-side analysis of [Monarch Money](https://www.monarch.com/) versus the current Personal Spending Tracker, plus a concrete plan for closing the gaps.

> Sources: monarch.com, monarchmoney.com/features (Tracking, Investments, Recurring), monarch.com Help Center (Goals), and third-party reviews (College Investor, Rob Berger).

---

## A. Monarch feature inventory

Monarch positions itself as an **all-in-one money app**: tracking, budgeting, planning and collaboration in one product. The headline capabilities:

### 1. Account aggregation
- Live bank, credit card, brokerage, loan and crypto syncing via Plaid / Finicity / MX.
- Real-estate value sync via **Zillow Zestimates**.
- Manual accounts for anything that can't sync.

### 2. Net worth
- Daily snapshots of all assets and liabilities.
- Net-worth-over-time chart with asset/liability breakdown and filters.

### 3. Transactions
- Auto-categorization with merchant cleanup.
- **Rules engine** ("if merchant matches X → category Y, tag Z, hide from reports").
- Splits, tags, notes, attachments, hide-from-reports.
- Search, filters, bulk edit.

### 4. Budgeting
- Category and **group** budgets.
- **Flex** budget (one bucket for everything discretionary).
- **Rollover** of unspent / overspent amounts to the next month.

### 5. Cash flow & reports
- Income vs expense over time.
- **Sankey** flow diagrams.
- Custom reports with rich filters.

### 6. Recurring bills & subscriptions
- Auto-detects recurring merchants and amounts.
- Shows upcoming bills; mark expected, paid, or skipped.

### 7. Goals
- Goals 3.0: savings, debt payoff, retirement, custom.
- Linked to specific accounts so progress updates automatically.
- Suggested monthly contributions.

### 8. Investments
- Holdings, allocation and performance across linked brokerages.

### 9. Collaboration
- Free partner and advisor seats with shared household data.

### 10. Apps & notifications
- Native iOS, Android and web.
- Email/push alerts (large transaction, budget threshold, bill due, sync issues).

### 11. Security & integrations
- 2FA, encryption at rest/in transit, read-only Plaid connections.
- CSV import/export.

---

## B. Side-by-side comparison

| Feature area | Monarch | Spend Tracker today | Gap |
|---|---|---|---|
| **Bank/brokerage aggregation** | Plaid/Finicity/MX live sync | Manual entry + CSV import | **Major** |
| **Real-estate / Zillow** | Auto-synced Zestimates | None | **Major** |
| **Net worth tracking** | Daily snapshots, time-series chart | Not modeled (no accounts table) | **Major** |
| **Transactions list** | Rules, splits, tags, notes, attachments, bulk edit | List, filters, search, edit, AI categorize, store mapping, **paginated** | **Medium** |
| **Auto-categorization** | Built-in ML + user rules | Lovable AI Gateway + persistent store→category mapping | **Parity** |
| **Categories** | Unlimited, hierarchical, grouping | Parent/sub, **category groups**, custom colors, budgets | **Parity** |
| **Budgets** | Category, group, **flex**, **rollover** | Per-category monthly budgets only | **Medium** |
| **Overview / dashboard** | Month-scoped, pace, MoM | Month picker, spending pace, MoM, weekly, top categories, pie | **Parity** |
| **Cash flow / Sankey** | Income → expense flow diagram | Income tracked; no Sankey | **Medium** |
| **Recurring bills** | Auto-detect & forecast | None | **Major** |
| **Goals** | Linked to accounts, progress | None | **Major** |
| **Investments** | Holdings, allocation, performance | None | **Major** |
| **Collaboration (household)** | Partner + advisor seats, shared RLS | Single user only | **Major** |
| **Mobile apps** | Native iOS + Android | Responsive web | **Medium** |
| **Reports** | Rich custom reports | Trends, YoY, parent comparison, budget performance | **Minor** |
| **Notifications & alerts** | Email + push | None | **Medium** |
| **Security** | 2FA, read-only sync, encryption | Supabase Auth + RLS, `has_role()`, hardened `search_path`. **No 2FA UI** | **Medium** |
| **CSV import** | Yes | Yes, with column mapping + AI suggest | **Parity** |
| **Pricing model** | Paid SaaS (~$15/mo) | Personal / self-hosted | n/a |

Legend: **Parity** ≈ comparable; **Minor** = polish; **Medium** = real feature work; **Major** = new subsystem.

---

## C. Gap analysis & how to incorporate

For each gap that matters, here is a concrete spec — table changes, edge functions, UI, and trade-offs.

### 1. Account aggregation (Plaid)
- **Tables:**
  - `accounts (id, user_id, name, type, subtype, mask, plaid_item_id, currency, is_manual, created_at)`
  - `plaid_items (id, user_id, access_token_encrypted, institution_id, status, last_synced_at)`
  - `account_balance_snapshots (id, account_id, captured_on date, balance numeric)`
- **Edge functions:** `plaid-link-token`, `plaid-exchange-public-token`, `plaid-sync-transactions` (cron, 1×/day).
- **UI:** "Accounts" page, link flow with Plaid Link SDK, per-account refresh.
- **Trade-offs:** Plaid is paid; access tokens are sensitive (encrypt at rest); requires PII handling decisions.

### 2. Net worth tracking
- Build on the `accounts` + `account_balance_snapshots` tables.
- Daily edge cron snapshots latest balance per account.
- New page **NetWorth** with stacked area chart (assets vs liabilities) and filterable account table.

### 3. Recurring bills / subscriptions
- **Table:** `recurring_series (id, user_id, merchant, avg_amount, cadence_days, last_seen, next_expected, status)`.
- **Edge function:** `detect-recurring` — group transactions by normalized merchant; look for amount stability and consistent cadence (weekly, monthly, yearly).
- **UI:** "Upcoming" widget on Overview, dedicated "Subscriptions" view with skip / cancel-link / mark-paid actions.

### 4. Goals
- **Table:** `goals (id, user_id, name, type [savings|debt|custom], target_amount, target_date, linked_account_ids[], current_amount, created_at)`.
- Suggested monthly contribution = `(target − current) / months_remaining`.
- **UI:** Goals page with progress bars; widget on Overview.

### 5. Transaction enhancements
- **Splits:** `transaction_splits (id, transaction_id, category, amount, note)`. Sum must equal parent amount (DB trigger).
- **Tags:** `tags (id, user_id, name, color)` + `transaction_tags (transaction_id, tag_id)`.
- **Notes & attachments:** `note text` column on `transactions`; `attachments` in Supabase Storage with RLS by `user_id`.
- **Rules engine:** `categorization_rules (id, user_id, match_field, match_op, match_value, set_category, set_tags[], priority)` evaluated on import and via DB trigger on insert.

### 6. Budgets v2
- Add `rollover boolean` and `budget_type [fixed|flex]` to `categories`.
- Add `budgets (id, user_id, period date, category_id, amount, rolled_over_amount)` for per-month overrides.
- "Flex" budget = remaining household spend ÷ remaining days, displayed as one big number.

### 7. Cash flow Sankey
- Reuse existing transactions; add a Sankey view on the Trends tab using `recharts` + `d3-sankey`.
- Nodes: income sources → categories → savings buckets.

### 8. Collaboration / households
- **Tables:** `households (id, name, owner_id)`, `household_members (household_id, user_id, role [owner|partner|advisor|viewer])`.
- Migrate `user_id` columns to `household_id` with a default per-user household for backwards compatibility.
- Update RLS to: `auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = row.household_id)`.
- Reuse the `has_role()` / `user_roles` pattern, scoped to household.

### 9. Investments
- **Phase 1:** manual `holdings (id, account_id, ticker, quantity, cost_basis, last_price, last_priced_at)` plus daily price refresh via a free quotes API.
- **Phase 2:** automatic via Plaid Investments product.

### 10. 2FA & security hardening
- Enable Supabase MFA (TOTP) and surface a Settings → Security page.
- Add session list and revoke; add CSP headers; rotate publishable keys on a schedule.

### 11. Notifications
- **Table:** `notification_preferences (user_id, channel [email|push], event, threshold)`.
- **Edge cron:** evaluate budgets & upcoming bills daily; send email via Resend, push via web push (`PushSubscription`).

### 12. Mobile apps
- Wrap the existing React app with **Capacitor** for iOS/Android shells. Reuse the same Supabase backend.
- Add native push via Capacitor's Push Notifications plugin.

---

## D. Suggested roadmap

| Phase | Theme | Items | Effort |
|---|---|---|---|
| **1** | Quick parity wins | Tags, notes, splits, recurring detection v1, rollover budgets, Sankey | 2 sprints |
| **2** | Net worth foundation | `accounts` + manual balances, daily snapshots, Net Worth chart, Goals v1 | 3 sprints |
| **3** | Aggregation | Plaid Link + sync cron, transaction dedupe vs CSV, investments v1 | 4 sprints |
| **4** | Households & alerts | Household model + RLS migration, partner invites, notifications, 2FA | 3 sprints |
| **5** | Mobile | Capacitor build, push notifications, app store submission | 2 sprints |

---

## E. Out of scope (explicit non-goals)

- Crypto wallet connections
- Tax filing or tax-loss harvesting
- Direct bill pay execution (we surface bills, not pay them)
- Multi-currency conversion (single base currency for now)

---

## F. Differentiators we already have

Even before closing the major gaps, this app has a few angles Monarch doesn't:

- **AI categorization via Lovable AI Gateway** with provider-agnostic key management.
- **Persistent store→category learning** baked into the import flow.
- **Category groups** as a separate dimension from the parent/subcategory tree — a more flexible reporting overlay than Monarch's group budgets.
- **Self-hostable** on Supabase / Lovable Cloud — no monthly subscription.

These are worth preserving and highlighting as we approach Monarch parity.
