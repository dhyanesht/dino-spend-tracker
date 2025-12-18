# Spend Tracker Documentation

## Table of Contents

1. [Overview](#overview)
2. [Use Cases](#use-cases)
3. [Architecture](#architecture)
4. [Architecture Decision Records](#architecture-decision-records)
5. [Security Model](#security-model)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Deployment Guide](#deployment-guide)

---

## Overview

Spend Tracker is a personal finance management application that helps users:
- Track income and expenses
- Categorize transactions
- Set and monitor budgets
- Analyze spending patterns

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Charts | Recharts |
| Hosting | Lovable Platform |

---

## Use Cases

### UC-01: Import Transactions from CSV

**Actor:** Authenticated User

**Preconditions:**
- User is logged in
- User has a CSV export from their bank

**Main Flow:**
1. User navigates to Import tab
2. User drags CSV file to upload area
3. System parses CSV and displays column preview
4. User maps CSV columns to transaction fields:
   - Date column
   - Description column
   - Amount column
5. User optionally triggers AI categorization
6. System calls `/functions/v1/categorize-transactions`
7. AI returns category suggestions
8. User reviews and confirms transactions
9. System inserts transactions via `/rest/v1/transactions`
10. Dashboard updates with new data

**Alternative Flows:**
- **A1: Invalid CSV format** → Error message, user retries
- **A2: Duplicate transactions** → Warning displayed, user chooses action
- **A3: AI categorization fails** → Transactions default to "Uncategorized"

**Postconditions:**
- Transactions saved to database
- Dashboard reflects new totals

---

### UC-02: Manage Budgets

**Actor:** Authenticated User

**Preconditions:**
- User is logged in
- Categories exist

**Main Flow:**
1. User navigates to Budget tab
2. System displays categories with current budgets
3. User clicks category to edit
4. User enters monthly budget amount
5. System updates category via `/rest/v1/categories`
6. Budget tracking charts update

**Postconditions:**
- Budget saved
- Trends analysis shows budget vs actual

---

### UC-03: Analyze Spending Trends

**Actor:** Authenticated User

**Preconditions:**
- User is logged in
- At least 2 months of transaction data exists

**Main Flow:**
1. User navigates to Trends tab
2. System fetches transactions and categories
3. System calculates:
   - Monthly spending totals
   - Category breakdowns
   - Year-over-year comparisons
   - Budget adherence
4. System renders interactive charts
5. User can filter by category or toggle group view
6. User can change time range

**Postconditions:**
- User sees spending insights

---

### UC-04: Create Store Mapping

**Actor:** Authenticated User

**Preconditions:**
- User is logged in
- Categories exist

**Main Flow:**
1. User navigates to Categories → Store Mappings
2. User clicks "Add Store"
3. User enters store name pattern (e.g., "AMAZON")
4. User selects target category
5. System saves mapping via `/rest/v1/stores`
6. Future imports auto-categorize matching transactions

**Postconditions:**
- Store mapping saved
- CSV imports use mapping for auto-categorization

---

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        SPEND TRACKER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐     ┌─────────────┐     ┌─────────────────────┐   │
│  │  User   │────▶│   React     │────▶│     Supabase        │   │
│  │ Browser │     │     SPA     │     │  (Auth, DB, APIs)   │   │
│  └─────────┘     └─────────────┘     └─────────────────────┘   │
│                         │                      │                │
│                         │                      │                │
│                         ▼                      ▼                │
│                  ┌─────────────┐     ┌─────────────────────┐   │
│                  │   Lovable   │     │    Lovable AI       │   │
│                  │   Hosting   │     │   (Categorization)  │   │
│                  └─────────────┘     └─────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pages                    Components              Hooks         │
│  ┌─────────────┐         ┌─────────────┐        ┌───────────┐  │
│  │ Dashboard   │────────▶│ExpenseOver- │───────▶│useTransac-│  │
│  │             │         │view         │        │tions      │  │
│  └─────────────┘         └─────────────┘        └───────────┘  │
│                          ┌─────────────┐        ┌───────────┐  │
│  ┌─────────────┐         │Transactions │───────▶│useCatego- │  │
│  │    Auth     │         │List         │        │ries       │  │
│  └─────────────┘         └─────────────┘        └───────────┘  │
│                          ┌─────────────┐        ┌───────────┐  │
│  ┌─────────────┐         │TrendsAnaly- │───────▶│useCatGroup│  │
│  │   Index     │         │sis          │        │           │  │
│  └─────────────┘         └─────────────┘        └───────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase Client
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  PostgreSQL   │  │  Edge Funcs   │  │   Supabase Auth   │   │
│  │  ───────────  │  │  ───────────  │  │   ─────────────   │   │
│  │ transactions  │  │ categorize-   │  │ JWT tokens        │   │
│  │ categories    │  │ transactions  │  │ Session mgmt      │   │
│  │ stores        │  │               │  │                   │   │
│  │ cat_groups    │  │ seed-category │  │                   │   │
│  │ user_roles    │  │ -groups       │  │                   │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Decision Records

### ADR-001: Supabase as Backend Platform

**Status:** Accepted

**Context:**
Need a backend solution that provides authentication, database, and API capabilities with minimal development overhead.

**Decision:**
Use Supabase as the Backend-as-a-Service platform.

**Consequences:**

| Pros | Cons |
|------|------|
| Rapid development | Vendor lock-in |
| Built-in auth | Limited customization |
| Auto-generated REST API | Pricing at scale |
| Row Level Security | Learning curve for RLS |
| Real-time subscriptions | Edge function cold starts |

**Alternatives Considered:**
- Firebase: Less SQL-like, proprietary query language
- Custom Node.js: More development time, infrastructure management
- AWS Amplify: More complex setup

---

### ADR-002: TanStack Query for Server State

**Status:** Accepted

**Context:**
Need efficient data fetching with caching, deduplication, and automatic background updates.

**Decision:**
Use TanStack Query (React Query) for all server state management.

**Consequences:**

| Pros | Cons |
|------|------|
| Automatic caching | Additional library |
| Optimistic updates | Learning curve |
| Request deduplication | Not for client-only state |
| Background refetching | |
| DevTools available | |

**Alternatives Considered:**
- Redux + RTK Query: More boilerplate
- SWR: Less feature-rich
- Plain fetch: No caching, manual state management

---

### ADR-003: shadcn/ui Component Library

**Status:** Accepted

**Context:**
Need accessible, customizable UI components that integrate well with Tailwind CSS.

**Decision:**
Use shadcn/ui as the component library (copy-paste model, not npm dependency).

**Consequences:**

| Pros | Cons |
|------|------|
| Full customization | Manual updates |
| No version conflicts | More code to maintain |
| Accessible by default | Initial setup time |
| Tailwind native | |
| Radix primitives | |

**Alternatives Considered:**
- Material UI: Larger bundle, harder to customize
- Chakra UI: Different styling approach
- Headless UI: Less complete

---

### ADR-004: Client-Side CSV Parsing

**Status:** Accepted

**Context:**
Users need to import transactions from CSV files. Could be done server-side or client-side.

**Decision:**
Parse CSV files in the browser before sending to server.

**Consequences:**

| Pros | Cons |
|------|------|
| Faster preview | Large files may slow browser |
| No file upload needed | Memory constraints |
| Works offline | |
| Interactive mapping | |

**Alternatives Considered:**
- Server-side parsing: Slower feedback, file upload required
- Hybrid: More complexity

---

### ADR-005: Denormalized Category References

**Status:** Accepted

**Context:**
Transactions need to reference categories. Could use foreign key (UUID) or category name.

**Decision:**
Store category name (text) directly on transactions instead of category ID.

**Consequences:**

| Pros | Cons |
|------|------|
| Simpler queries | No referential integrity |
| Readable data | Category rename requires migration |
| No joins needed | Potential orphaned references |

**Alternatives Considered:**
- Foreign key to category ID: More complex queries, cascading issues

---

## Security Model

### Authentication

- **Provider:** Supabase Auth (GoTrue)
- **Method:** Email/password, JWT tokens
- **Token Storage:** localStorage (secure httpOnly cookies planned)
- **Session:** Auto-refresh via `onAuthStateChange`

### Authorization

- **Model:** Row Level Security (RLS)
- **Pattern:** User can only access own data
- **Admin Access:** Via `has_role()` function

```sql
-- Example RLS policy
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);
```

### Role Management

```sql
-- Roles stored in separate table (security best practice)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role app_role NOT NULL  -- 'admin' | 'user'
);

-- Security definer function to check roles
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Input Validation

- **Client:** Zod schemas for all forms
- **Server:** PostgreSQL CHECK constraints
- **Triggers:** Category validation on transactions

---

## API Documentation

See [README-backend.md](./README-backend.md) for full API reference.

### Quick Reference

| Resource | Endpoints |
|----------|-----------|
| Transactions | GET, POST, PATCH, DELETE `/rest/v1/transactions` |
| Categories | GET, POST, PATCH, DELETE `/rest/v1/categories` |
| Stores | GET, POST, PATCH, DELETE `/rest/v1/stores` |
| Category Groups | GET, POST, PATCH, DELETE `/rest/v1/category_groups` |
| AI Categorization | POST `/functions/v1/categorize-transactions` |

---

## Database Schema

### Tables Overview

| Table | Description | RLS |
|-------|-------------|-----|
| `transactions` | Financial transactions | ✅ |
| `categories` | Spending categories | ✅ |
| `category_groups` | Custom groupings | ✅ |
| `category_group_mappings` | Group memberships | ✅ |
| `stores` | Store-category mappings | ✅ |
| `user_roles` | User permissions | ✅ |

### Key Relationships

```
auth.users (1) ─── (N) transactions
auth.users (1) ─── (N) categories
auth.users (1) ─── (N) category_groups
categories (N) ─── (M) category_groups (via mappings)
```

---

## Deployment Guide

### Prerequisites

- Supabase project
- Lovable account (or alternative hosting)

### Steps

1. **Database Setup**
   ```bash
   supabase link --project-ref <project-id>
   supabase db push
   ```

2. **Edge Functions**
   ```bash
   supabase functions deploy
   ```

3. **Environment Secrets**
   - Set `LOVABLE_API_KEY` in Supabase dashboard

4. **Frontend**
   - Deploy via Lovable (automatic)
   - Or build and deploy to static host

### Monitoring

- **Logs:** Supabase Dashboard → Logs
- **Metrics:** Supabase Dashboard → Reports
- **Errors:** Edge function logs

---

## Glossary

| Term | Definition |
|------|------------|
| **Transaction** | A single income or expense record |
| **Category** | A classification for transactions (e.g., "Groceries") |
| **Parent Category** | Top-level category containing subcategories |
| **Subcategory** | Category with a parent (transactions must use subcategories) |
| **Category Group** | Custom grouping of multiple categories for reporting |
| **Store Mapping** | Rule to auto-categorize by merchant name |
| **RLS** | Row Level Security - PostgreSQL feature for data isolation |
