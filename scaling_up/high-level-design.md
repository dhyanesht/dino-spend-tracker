# High-Level Design

## Architecture Overview

### Current Architecture: Monolithic SPA + BaaS

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  React SPA (Vite + TypeScript)                                  │
│  ├── Pages: Auth, Dashboard, Index                              │
│  ├── Components: Charts, Tables, Forms, Dialogs                 │
│  ├── State: TanStack Query (server state)                       │
│  └── Styling: Tailwind CSS + shadcn/ui                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (TLS 1.3)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Edge Functions (Deno)                                 │
│  ├── categorize-transactions (AI integration)                   │
│  └── seed-category-groups (data seeding)                        │
├─────────────────────────────────────────────────────────────────┤
│  Supabase REST API (PostgREST)                                  │
│  └── Auto-generated CRUD for all tables                         │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Auth                                                  │
│  └── JWT-based authentication                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Internal Connection
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase Managed)                                  │
│  ├── Tables: transactions, categories, stores, category_groups  │
│  ├── Auth: auth.users (managed by Supabase)                     │
│  ├── Security: Row Level Security (RLS) policies                │
│  └── Functions: Validation triggers, role checks                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

```
src/
├── pages/                    # Route-level components
│   ├── Index.tsx            # Landing page
│   ├── Auth.tsx             # Authentication page
│   ├── Dashboard.tsx        # Main application
│   └── NotFound.tsx         # 404 page
│
├── components/
│   ├── dashboard/           # Feature components
│   │   ├── ExpenseOverview.tsx
│   │   ├── TransactionsList.tsx
│   │   ├── TrendsAnalysis.tsx
│   │   ├── BudgetManager.tsx
│   │   ├── CategoryManager.tsx
│   │   ├── CSVImporter.tsx
│   │   └── ...
│   │
│   └── ui/                  # Reusable UI components (shadcn)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
│
├── hooks/                   # Custom React hooks
│   ├── useTransactions.ts   # Transaction CRUD
│   ├── useCategories.ts     # Category CRUD
│   ├── useCategoryGroups.ts # Group CRUD
│   ├── useStores.ts         # Store mapping CRUD
│   └── useTransactionFilters.ts
│
├── contexts/                # React contexts
│   └── AuthContext.tsx      # Authentication state
│
├── utils/                   # Utility functions
│   ├── trendsDataUtils.ts   # Chart data calculations
│   └── groupTrendsDataUtils.ts
│
└── integrations/
    └── supabase/
        ├── client.ts        # Supabase client instance
        └── types.ts         # Generated TypeScript types
```

### Backend Components

```
supabase/
├── config.toml              # Supabase configuration
├── functions/               # Edge Functions
│   ├── categorize-transactions/
│   │   └── index.ts         # AI categorization
│   └── seed-category-groups/
│       └── index.ts         # Default groups seeding
│
└── migrations/              # Database migrations
    └── *.sql                # Schema changes
```

---

## Data Flow Diagrams

### Authentication Flow

```
┌──────┐     ┌──────────┐     ┌─────────────┐     ┌────────────┐
│ User │────▶│ Auth Page│────▶│Supabase Auth│────▶│ PostgreSQL │
└──────┘     └──────────┘     └─────────────┘     └────────────┘
    │             │                  │                   │
    │  1. Enter   │  2. signUp/     │  3. Create user   │
    │  credentials│     signIn      │     in auth.users │
    │             │                  │                   │
    │             │◀─────────────────┼───────────────────┤
    │             │  4. Return JWT   │                   │
    │◀────────────┤                  │                   │
    │  5. Redirect│                  │                   │
    │  to Dashboard                  │                   │
```

### Transaction Import Flow

```
┌──────┐    ┌───────────┐    ┌────────────┐    ┌─────────┐    ┌──────┐
│ User │───▶│CSVImporter│───▶│Edge Function│───▶│Lovable AI│───▶│ DB   │
└──────┘    └───────────┘    └────────────┘    └─────────┘    └──────┘
    │            │                 │                │             │
    │ 1. Upload  │                 │                │             │
    │    CSV     │                 │                │             │
    │            │ 2. Parse CSV    │                │             │
    │            │    locally      │                │             │
    │            │                 │                │             │
    │            │ 3. POST /categorize-transactions │             │
    │            │────────────────▶│                │             │
    │            │                 │ 4. Call AI API │             │
    │            │                 │───────────────▶│             │
    │            │                 │◀───────────────│             │
    │            │                 │ 5. Categories  │             │
    │            │◀────────────────│                │             │
    │            │ 6. Suggestions  │                │             │
    │◀───────────│                 │                │             │
    │ 7. Review  │                 │                │             │
    │    & Confirm                 │                │             │
    │───────────▶│                 │                │             │
    │            │ 8. POST /transactions            │             │
    │            │─────────────────────────────────────────────▶│
    │            │                                               │
    │            │◀──────────────────────────────────────────────│
    │            │ 9. Success                                    │
    │◀───────────│                                               │
    │ 10. Updated│                                               │
    │    Dashboard                                               │
```

### Real-time Data Sync

```
┌──────────────┐     ┌───────────────┐     ┌────────────┐
│ React Query  │◀───▶│ Supabase API  │◀───▶│ PostgreSQL │
└──────────────┘     └───────────────┘     └────────────┘
       │                    │                    │
       │ 1. Query with     │                    │
       │    RLS context    │                    │
       │───────────────────▶                    │
       │                    │ 2. Apply RLS      │
       │                    │    policies       │
       │                    │───────────────────▶
       │                    │◀───────────────────
       │                    │ 3. Filtered data  │
       │◀───────────────────                    │
       │ 4. Cache & render │                    │
       │                    │                    │
       │ 5. Mutation       │                    │
       │───────────────────▶                    │
       │                    │ 6. Validate &     │
       │                    │    insert         │
       │                    │───────────────────▶
       │ 7. Invalidate     │                    │
       │    cache          │                    │
       │ 8. Refetch        │                    │
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Network Security                                  │
│  ├── TLS 1.3 encryption in transit                         │
│  ├── CORS policy (origin restriction)                      │
│  └── Rate limiting (Supabase managed)                      │
│                                                             │
│  Layer 2: Authentication                                    │
│  ├── JWT tokens (access + refresh)                         │
│  ├── Secure token storage (httpOnly cookies planned)       │
│  └── Session management via Supabase Auth                  │
│                                                             │
│  Layer 3: Authorization                                     │
│  ├── Row Level Security (RLS) on all tables                │
│  ├── user_id filtering on every query                      │
│  └── Role-based access (admin/user via user_roles)         │
│                                                             │
│  Layer 4: Data Validation                                   │
│  ├── Client-side: Zod schemas                              │
│  ├── Server-side: PostgreSQL constraints                   │
│  └── Triggers: validate_transaction_category               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### RLS Policy Pattern

```sql
-- Example: Transactions table RLS
-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- Admins can see all (via has_role function)
CREATE POLICY "Admins can view all"
ON transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

---

## Deployment Architecture

### Current (Lovable + Supabase)

```
┌─────────────────┐     ┌─────────────────┐
│   Lovable CDN   │     │    Supabase     │
│  (Frontend)     │     │   (Backend)     │
├─────────────────┤     ├─────────────────┤
│ - Static assets │     │ - PostgreSQL    │
│ - React SPA     │     │ - Auth service  │
│ - Global CDN    │     │ - Edge Functions│
│                 │     │ - REST API      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    HTTPS requests     │
         │◀─────────────────────▶│
         │                       │
```

### Future (Enterprise - Multi-Region)

```
                    ┌─────────────────┐
                    │   CloudFlare    │
                    │   (CDN + WAF)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  US-East    │     │  EU-West    │     │  APAC       │
│  Region     │     │  Region     │     │  Region     │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ App Server  │     │ App Server  │     │ App Server  │
│ Read Replica│     │ Read Replica│     │ Read Replica│
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Primary DB │
                    │  (US-East)  │
                    └─────────────┘
```

---

## Technology Decisions

| Decision | Choice | Rationale | Trade-offs |
|----------|--------|-----------|------------|
| Frontend Framework | React | Industry standard, large ecosystem | Bundle size |
| Build Tool | Vite | Fast HMR, modern defaults | Less mature than webpack |
| Styling | Tailwind + shadcn | Rapid development, consistent design | Learning curve |
| State Management | TanStack Query | Server state focus, caching | Not for client state |
| Backend | Supabase | Rapid development, integrated auth | Vendor lock-in |
| Database | PostgreSQL | Reliable, feature-rich, RLS support | Scaling complexity |
| Hosting | Lovable | Integrated deployment | Limited customization |
