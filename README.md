# Personal Spending Tracker

A modern, opinionated web app for tracking personal expenses, budgeting against monthly targets, and understanding spending patterns — built on React + Supabase and powered by AI-assisted categorization.

- **Live (preview):** https://id-preview--dbf29003-d0bb-4982-b6b2-31deddc617d5.lovable.app
- **Live (published):** https://dino-spend-tracker.lovable.app
- **Lovable project:** https://lovable.dev/projects/dbf29003-d0bb-4982-b6b2-31deddc617d5

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS v3 + semantic design tokens |
| UI primitives | shadcn/ui (Radix) |
| Server state | TanStack Query v5 |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI | Lovable AI Gateway (transaction categorization) |
| Charts | Recharts |
| Forms / validation | react-hook-form + Zod |
| Routing | React Router v6 |

---

## Features

### 📊 Overview (month-scoped)
A budgeting-app inspired dashboard that focuses on the **selected month**, not lifetime totals.

- **Month picker** to step through any month
- **Spending Pace** card — actual vs allowed daily pace, days remaining, MoM comparison
- **Top Categories** with budget progress bars
- **Category Pie** scoped to the month
- **Weekly Breakdown** within the month
- **Recent Transactions** for quick context

### 💳 Transactions
- CSV import with column mapping and preview
- AI categorization via the `categorize-transactions` edge function
- Persistent **store-mapping intelligence** — the app learns merchant → category from past choices
- Filters, search, and bulk operations
- **Client-side pagination** (25 / 50 / 100 rows) for fast rendering of thousands of rows
- Swipeable rows on mobile, inline edit dialog

### 🏷️ Categories
- Two-tier model: **parent → subcategory** (transactions live on subcategories)
- Custom colors and per-category monthly budgets
- **Category Groups** — flexible many-to-many overlay for ad-hoc reporting
- Store mappings & duplicate finder

### 📈 Trends
- Monthly trends, year-over-year, parent-category comparison
- Budget performance chart and trend insights

### 🔐 Auth & security
- Supabase email/password auth, JWT sessions
- Row Level Security on every table
- Roles in a separate `user_roles` table accessed via a `has_role()` `SECURITY DEFINER` function with `SET search_path = public`

---

## Architecture

```text
┌─────────────────────────┐      ┌──────────────────────────────┐
│     React SPA (Vite)    │ ───▶ │ Supabase                     │
│  shadcn/ui + Tailwind   │      │  • PostgreSQL + RLS          │
│  TanStack Query         │      │  • Auth (GoTrue, JWT)        │
│  Recharts               │      │  • Edge Functions (Deno)     │
└─────────────────────────┘      └──────────────────────────────┘
            │                                   │
            │                                   ▼
            │                       ┌──────────────────────────┐
            └─────────────────────▶ │   Lovable AI Gateway     │
                                    │ (categorize-transactions)│
                                    └──────────────────────────┘
```

---

## Project structure

```
src/
  components/
    dashboard/          # Feature components (Overview, Transactions, Trends, Budget, …)
      overview/         # Reworked overview cards (MonthPicker, SpendingPaceCard, …)
    ui/                 # shadcn/ui primitives
  hooks/                # useTransactions, useCategories, useCategoryGroups, useStores, …
  pages/                # Index, Auth, Dashboard, NotFound
  integrations/supabase # Generated client + types
  contexts/             # AuthContext
  lib/                  # validation, utils
supabase/
  functions/
    categorize-transactions/   # AI categorization edge function
    seed-category-groups/      # One-shot category-group seeder
scaling_up/               # Long-form architecture & product docs
```

---

## Local development

Prerequisites: Node 18+ and npm (install via [nvm](https://github.com/nvm-sh/nvm)).

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

Environment variables are read from `.env` (Supabase URL + anon key are committed as publishable values).

### Edge functions

| Function | Purpose |
|----------|---------|
| `categorize-transactions` | Calls Lovable AI Gateway to suggest categories for imported rows |
| `seed-category-groups` | Seeds default category groupings for a new account |

---

## Deployment

- **Lovable:** open the project and click **Share → Publish**.
- **Custom domain:** Project → Settings → Domains → Connect Domain ([docs](https://docs.lovable.dev/tips-tricks/custom-domain)).

---

## Documentation

All long-form docs live in [`scaling_up/`](./scaling_up):

| Document | Purpose |
|----------|---------|
| [`enterprise-evaluation.md`](./scaling_up/enterprise-evaluation.md) | Fitness assessment for enterprise use |
| [`use-cases.md`](./scaling_up/use-cases.md) | Functional use cases |
| [`requirements.md`](./scaling_up/requirements.md) | Functional & non-functional requirements |
| [`feature-backlog.md`](./scaling_up/feature-backlog.md) | Prioritized backlog |
| [`high-level-design.md`](./scaling_up/high-level-design.md) | HLD: components, data flow |
| [`low-level-design.md`](./scaling_up/low-level-design.md) | LLD: schemas, APIs, core features |
| [`adr.md`](./scaling_up/adr.md) | **Architecture Decision Records** |
| [`overview-rework-ideas.md`](./scaling_up/overview-rework-ideas.md) | Design notes for the new Overview |
| [`monarch-comparison.md`](./scaling_up/monarch-comparison.md) | **Feature gap analysis vs. Monarch Money** |
| [`README-backend.md`](./scaling_up/README-backend.md) | Backend setup, APIs, deployment |
| [`README-frontend.md`](./scaling_up/README-frontend.md) | Frontend build & component guide |
| [`README-docs.md`](./scaling_up/README-docs.md) | Full documentation hub |

Performance notes: [`PERFORMANCE.md`](./PERFORMANCE.md).
