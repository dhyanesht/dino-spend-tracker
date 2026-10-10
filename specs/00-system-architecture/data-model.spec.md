# Data Model Specification (Supabase Schema)

**Source of truth:** `supabase/migrations/*.sql`, `src/integrations/supabase/types.ts`, `src/hooks/*.ts`

---

## Schema Overview

| Table | Primary Key | user_id | RLS | Type |
|-------|-------------|---------|-----|------|
| `auth.users` | `id` (uuid) | — | managed | Supabase managed |
| `transactions` | `id` (uuid) | `user_id` FK → `auth.users(id)` ON DELETE CASCADE | yes | user data |
| `categories` | `id` (uuid) | `user_id` FK → `auth.users(id)` ON DELETE CASCADE | yes | user data |
| `category_groups` | `id` (uuid) | `user_id` (no FK, NOT NULL) | yes | user data |
| `category_group_mappings` | `id` (uuid) | `user_id` (no FK, NOT NULL) | yes | user data |
| `stores` | `id` (uuid) | `user_id` FK → `auth.users(id)` ON DELETE CASCADE | yes | user data |
| `user_roles` | `id` (uuid) | `user_id` FK → `auth.users(id)` ON DELETE CASCADE | yes | security |
| `plaid_items` | `id` (uuid) | `user_id` FK → `auth.users(id)` ON DELETE CASCADE | yes | integration |

---

## Enum Types

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
```

| Value | Meaning |
|-------|---------|
| `admin` | Can view/insert/update/delete all rows (RLS bypass) |
| `user` | Can only access own rows (default) |

---

## Table: `transactions`

### Columns

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK | Primary key |
| `user_id` | `UUID` | YES | — | FK → `auth.users(id)` ON DELETE CASCADE | Owning user |
| `description` | `TEXT` | NO | — | — | Merchant/payee name |
| `amount` | `NUMERIC` | NO | — | CHECK `amount > 0` | Always positive; sign comes from `type` |
| `category` | `TEXT` | NO | — | — | Denormalized subcategory name (see Invariants) |
| `date` | `DATE` | NO | `CURRENT_DATE` | — | Transaction date (YYYY-MM-DD) |
| `type` | `TEXT` | NO | — | CHECK `type IN ('expense','income')` | Transaction direction |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — | Creation timestamp |

### Invariants (Never Do)

1. **Never store a negative or zero `amount`.** The Zod schema (`validation.ts:9-12`) and DB CHECK (`amount > 0`) both enforce positivity. The client takes `Math.abs(parsedAmount)`.
2. **Never assign a parent category to a transaction.** The `validate_transaction_category()` trigger fires on INSERT and UPDATE (when category changes). It queries `categories` for `name = NEW.category AND parent_category IS NULL AND user_id = NEW.user_id` — if found, raises an exception.
3. **Never insert a transaction without `user_id`.** RLS `WITH CHECK` policy requires `auth.uid() = user_id`.
4. **Never allow users to set `user_id` to another user's ID.** The `INSERT` mutation (`useTransactions.ts:63`) sets `user_id: user.id` from the auth context.

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_transactions_user_id` | `user_id` | RLS filtering |
| `idx_transactions_date` | `date DESC` | Date-ordered reads |
| `idx_transactions_user_date` | `user_id, date DESC` | Dashboard query (primary) |
| `idx_transactions_category` | `category` | Category-based filtering |

### RLS Policies

| Operation | Policy Name | USING / WITH CHECK |
|-----------|-------------|-------------------|
| SELECT | `Users can view own transactions` | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| INSERT | `Users can insert own transactions` | `auth.uid() = user_id` |
| UPDATE | `Users can update own transactions` | USING: `auth.uid() = user_id OR has_role(..., 'admin')`; CHECK: same |
| DELETE | `Users can delete own transactions` | `auth.uid() = user_id OR has_role(...)` |

### Triggers

| Trigger | Timing | Event | Function | Condition |
|---------|--------|-------|----------|-----------|
| `validate_transaction_category_on_insert` | BEFORE | INSERT | `validate_transaction_category()` | — |
| `validate_transaction_category_on_update` | BEFORE | UPDATE | `validate_transaction_category()` | `OLD.category IS DISTINCT FROM NEW.category` |

---

## Table: `categories`

### Columns

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK | Primary key |
| `user_id` | `UUID` | YES | — | FK → `auth.users(id)` ON DELETE CASCADE | Owning user |
| `name` | `TEXT` | NO | — | UNIQUE (`user_id, name`) | Category name |
| `type` | `TEXT` | NO | — | — | `fixed` or `variable` |
| `parent_category` | `TEXT` | YES | — | — | NULL = parent; otherwise references parent by name |
| `monthly_budget` | `NUMERIC` | YES | — | — | Monthly budget amount |
| `color` | `TEXT` | YES | — | — | Hex color code (e.g. `#10B981`) |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — | Creation timestamp |

### Invariants (Never Do)

1. **Never create a parent category (`parent_category = NULL`) and then assign it to a transaction.** The `validate_transaction_category()` trigger checks this.
2. **Never allow duplicate category names per user.** Enforced by `UNIQUE (user_id, name)`.
3. **Never allow a subcategory to reference a parent that doesn't exist.** Currently enforced at the application level (no FK constraint on `parent_category` — it's a denormalized text reference).
4. **Never store a budget on a parent category and expect it to apply to its children.** Budgets are per-subcategory. Parent-level budget is always the **sum** of subcategory budgets (see `trendsDataUtils.ts:289-297`).

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_categories_user_id` | `user_id` | User filtering |
| `idx_categories_parent` | `parent_category` | Parent/child lookups |
| `idx_categories_name` | `name` | Name lookups |

### RLS Policies

| Operation | Policy Name | USING / WITH CHECK |
|-----------|-------------|-------------------|
| SELECT | `Users can view own categories` | `auth.uid() = user_id OR has_role(...)` |
| INSERT | `Users can insert own categories` | `auth.uid() = user_id` |
| UPDATE | `Users can update own categories` | USING: `auth.uid() = user_id OR has_role(...)`; CHECK: same |
| DELETE | `Users can delete own categories` | `auth.uid() = user_id OR has_role(...)` |

> **Privilege grants** (`supabase/migrations/20260607...sql:5-7`): `REVOKE ALL FROM anon`; `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated`; `GRANT ALL TO service_role`.

---

## Table: `category_groups`

### Columns

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK | Primary key |
| `user_id` | `UUID` | NO | — | — | Owning user (no FK) |
| `name` | `TEXT` | NO | — | UNIQUE (`user_id, name`) | Group name |
| `description` | `TEXT` | YES | — | — | Optional description |
| `color` | `TEXT` | NO | `'#3B82F6'` | — | Hex color |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | — | Auto-updated via trigger |

### Invariants (Never Do)

1. **Never allow duplicate group names per user.** Enforced by `UNIQUE (user_id, name)`.
2. **Never allow a category in a group to belong to a different user.** The `category_group_mappings` table has its own `user_id`, and the mapping inserts set `user_id: user.id` from the auth context.
3. **Never orphan a group's `updated_at`.** The `update_category_groups_updated_at` trigger fires on every UPDATE.

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_category_groups_user_id` | `user_id` | User filtering |

### Triggers

| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `update_category_groups_updated_at` | BEFORE | UPDATE | `update_category_groups_updated_at()` |

### RLS Policies

| Operation | Policy Name | USING / WITH CHECK |
|-----------|-------------|-------------------|
| SELECT | `Users can view own groups` | `auth.uid() = user_id` |
| INSERT | `Users can insert own groups` | `auth.uid() = user_id` |
| UPDATE | `Users can update own groups` | USING: `auth.uid() = user_id`; CHECK: `auth.uid() = user_id` |
| DELETE | `Users can delete own groups` | `auth.uid() = user_id` |

> **Note:** Group policies do NOT grant admin bypass (unlike other tables). Admin override is not implemented for groups.

---

## Table: `category_group_mappings`

### Columns

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK | Primary key |
| `user_id` | `UUID` | NO | — | — | Owning user (no FK) |
| `group_id` | `UUID` | NO | — | FK → `category_groups(id)` ON DELETE CASCADE | Target group |
| `category_id` | `UUID` | NO | — | FK → `categories(id)` ON DELETE CASCADE | Target category |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — | Creation timestamp |

### Invariants (Never Do)

1. **Never create duplicate mappings for the same group+category.** Enforced by `UNIQUE (group_id, category_id)`.
2. **Never allow cross-user group mappings.** Application-level: `user_id` is set from auth context on insert.

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_category_group_mappings_user_id` | `user_id` | User filtering |
| `idx_category_group_mappings_group_id` | `group_id` | Group-based lookups |
| `idx_category_group_mappings_category_id` | `category_id` | Category-based lookups |

### RLS Policies

| Operation | Policy Name | USING / WITH CHECK |
|-----------|-------------|-------------------|
| SELECT | `Users can view own mappings` | `auth.uid() = user_id` |
| INSERT | `Users can insert own mappings` | `auth.uid() = user_id` |
| DELETE | `Users can delete own mappings` | `auth.uid() = user_id` |

> **Note:** No UPDATE policy exists. Mappings are deleted and re-inserted (see `useBatchUpdateGroupMappings`).

---

## Table: `stores`

### Columns

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK | Primary key |
| `user_id` | `UUID` | YES | — | FK → `auth.users(id)` ON DELETE CASCADE | Owning user |
| `name` | `TEXT` | NO | — | — | Store/merchant name pattern |
| `category_name` | `TEXT` | NO | — | — | Target subcategory name |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | — | Last update timestamp |

### Invariants (Never Do)

1. **Never assign a parent category to a store mapping.** The `validate_store_category()` trigger fires on INSERT and UPDATE (when `category_name` changes). It checks for `parent_category IS NULL` on the referenced category.
2. **Never allow duplicate store names per user.** Enforced by `UNIQ (user_id, name)` at the application level (`useAddStore` checks for existing first).
3. **Never store a store mapping for a category that doesn't exist.** Enforced at the DB trigger level (queries `categories` for matching `name` + `user_id`).

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_stores_user_id` | `user_id` | User filtering |
| `idx_stores_name_user_id` | `name, user_id` | Lookup during import |
| `idx_stores_name` | `name` | General name lookups |

### RLS Policies

Same pattern as `transactions` and `categories`: owner or admin.

### Triggers

| Trigger | Timing | Event | Function | Condition |
|---------|--------|-------|----------|-----------|
| `validate_store_category_on_insert` | BEFORE | INSERT | `validate_store_category()` | — |
| `validate_store_category_on_update` | BEFORE | UPDATE | `validate_store_category()` | `OLD.category_name IS DISTINCT FROM NEW.category_name` |

---

## Table: `user_roles`

### Columns

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK | Primary key |
| `user_id` | `UUID` | NO | — | FK → `auth.users(id)` ON DELETE CASCADE | User reference |
| `role` | `app_role` | NO | — | — | `admin` or `user` |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | — | Creation timestamp |

### Invariants (Never Do)

1. **Never allow authenticated users to insert, update, or delete roles.** RLS policies `"Block authenticated role inserts/updates/deletes"` use `WITH CHECK (false)` and `USING (false)`. Additionally, `REVOKE INSERT, UPDATE, DELETE ON user_roles FROM anon, authenticated`.
2. **Never allow a user to assign themselves admin.** Only `service_role` can manage roles (via the `"Service role can manage roles"` policy with `auth.jwt() ->> 'role' = 'service_role'`).
3. **Never allow more than one role row per (user_id, role) pair.** Enforced by `UNIQUE (user_id, role)`.

### RLS Policies

| Operation | Policy Name | USING / WITH CHECK |
|-----------|-------------|-------------------|
| SELECT | `Users can view own roles` | `auth.uid() = user_id` |
| INSERT | `Service role can manage roles` | `auth.jwt() ->> 'role' = 'service_role'`; plus `Block authenticated role inserts` (authenticated: `WITH CHECK (false)`) |
| UPDATE | `Block authenticated role updates` | authenticated: `USING (false) WITH CHECK (false)` |
| DELETE | `Block authenticated role deletes` | authenticated: `USING (false)` |

---

## Table: `plaid_items`

### Columns

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `UUID` | NO | `gen_random_uuid()` | PK | Primary key |
| `item_id` | `TEXT` | NO | — | UNIQUE | Plaid item ID |
| `access_token` | `TEXT` | NO | — | — | Encrypted access token |
| `user_id` | `UUID` | YES | — | FK → `auth.users(id)` ON DELETE CASCADE | Owning user |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — | Creation timestamp |

> **Note:** No `updated_at` column. No dedicated RLS policies are defined for `plaid_items` in the migrations, but the pattern follows other tables (owner or admin).

---

## Functions

### `public.has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN`

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

| Property | Value |
|----------|-------|
| Language | SQL |
| Volatility | STABLE |
| Security | SECURITY DEFINER |
| search_path | `public` (explicit) |
| Args | `_user_id UUID`, `_role app_role` |
| Returns | `BOOLEAN` |
| Callers | RLS policies on all user-data tables; any authenticated user (execute revoked from public in latest migration) |

**Behavior:** Returns `true` if the user has the specified role. Used in RLS `USING` clauses to grant admin bypass.

### `public.validate_transaction_category() RETURNS TRIGGER`

- Language: plpgsql, SECURITY DEFINER, `SET search_path = public`
- Fires on: `transactions` INSERT, and UPDATE when `category` changed
- **Invariant:** Rejects if `NEW.category` matches a `categories` row where `parent_category IS NULL` and `user_id = NEW.user_id`
- **Error message:** `'Transactions cannot be assigned to parent categories. Please use a subcategory instead.'`

### `public.validate_store_category() RETURNS TRIGGER`

- Language: plpgsql, SECURITY DEFINER, `SET search_path = public`
- Fires on: `stores` INSERT, and UPDATE when `category_name` changed
- **Invariant:** Rejects if `NEW.category_name` matches a `categories` row where `parent_category IS NULL` and `user_id = NEW.user_id`
- **Error message:** `'Store mappings cannot use parent categories. Please use a subcategory instead.'`

### `public.update_category_groups_updated_at() RETURNS TRIGGER`

- Language: plpgsql, SECURITY DEFINER, `SET search_path = public`
- Fires on: `category_groups` BEFORE UPDATE
- **Behavior:** Sets `NEW.updated_at = now()`

---

## TypeScript Type Contracts

### `Database` type (`src/integrations/supabase/types.ts`)

| Table | Row Type | Key Fields |
|-------|----------|------------|
| `categories` | `Database["public"]["Tables"]["categories"]["Row"]` | `id: string`, `name: string`, `type: string`, `parent_category: string \| null`, `monthly_budget: number \| null`, `color: string \| null`, `user_id: string \| null` |
| `transactions` | `Database["public"]["Tables"]["transactions"]["Row"]` | `id: string`, `description: string`, `amount: number`, `category: string`, `date: string`, `type: string`, `user_id: string \| null`, `created_at: string` |
| `stores` | `Database["public"]["Tables"]["stores"]["Row"]` | `id: string`, `name: string`, `category_name: string`, `user_id: string \| null`, `created_at: string`, `updated_at: string` |
| `category_groups` | `Database["public"]["Tables"]["category_groups"]["Row"]` | `id: string`, `user_id: string`, `name: string`, `description: string \| null`, `color: string`, `created_at: string`, `updated_at: string` |
| `category_group_mappings` | `Database["public"]["Tables"]["category_group_mappings"]["Row"]` | `id: string`, `user_id: string`, `group_id: string`, `category_id: string`, `created_at: string` |
| `user_roles` | `Database["public"]["Tables"]["user_roles"]["Row"]` | `id: string`, `user_id: string`, `role: "admin" \| "user"`, `created_at: string \| null` |

### Zod Validation Schemas (`src/lib/validation.ts`)

| Schema | Fields | Constraints |
|--------|--------|-------------|
| `transactionSchema` | `description` (1-200 chars, trimmed) | `amount` positive, max 1M, finite; `date` matches `YYYY-MM-DD`, between 1900 and today; `category` non-empty; `type` enum `expense\|income` |
| `categorySchema` | `name` (1-100 chars, trimmed) | `type` enum `fixed\|variable`; `monthly_budget` non-negative, max 1M; `color` matches hex regex `^#([A-Fa-f0-9]{6}\|[A-Fa-f0-9]{3})$`; `parent_category` nullable |
| `storeSchema` | `name` (1-150 chars, trimmed) | `category_name` non-empty |

### Extended Interfaces (from hooks)

| Interface | Source File |
|-----------|-------------|
| `Transaction` (id, description, amount, category, date, type, created_at) | `useTransactions.ts:7-15` — **no `user_id`** in this interface |
| `Category` (id, name, type, monthly_budget, color, created_at, parent_category) | `useCategories.ts:6-14` — **no `user_id`** |
| `Store` (id, name, category_name, created_at, updated_at) | `useStores.ts:6-12` — **no `user_id`** |
| `CategoryGroup` (id, user_id, name, description, color, created_at, updated_at) | `useCategoryGroups.ts:5-13` |

---

## Test Oracles

### Oracle T-01: Parent category rejection on transaction insert
```sql
-- Given: a category named "Food & Dining" with parent_category IS NULL
-- When: INSERT INTO transactions (user_id, description, amount, category, date, type)
--       VALUES ('<uid>', 'Test', 10.00, 'Food & Dining', '2024-01-15', 'expense')
-- Then: RAISE EXCEPTION 'Transactions cannot be assigned to parent categories...'
-- And: the transaction row is NOT inserted
```

### Oracle T-02: Subcategory acceptance on transaction insert
```sql
-- Given: a category named "Groceries" with parent_category = "Everyday"
-- When: INSERT INTO transactions (user_id, description, amount, category, date, type)
--       VALUES ('<uid>', 'Costco', 50.00, 'Groceries', '2024-01-15', 'expense')
-- Then: the row is inserted successfully
-- And: has_category = "Groceries", parent_category = "Everyday" verified
```

### Oracle T-03: Cross-user isolation
```sql
-- Given: user A has a transaction with category "Groceries"
-- When: user B queries transactions
-- Then: user B sees ZERO transactions from user A
```

### Oracle T-04: Unique constraint on (user_id, name) for categories
```sql
-- Given: a category named "Groceries" with user_id = X
-- When: INSERT another category with name = "Groceries", user_id = X
-- Then: ERROR: duplicate key value violates unique constraint "categories_user_id_name_unique"
```

### Oracle T-05: Unique constraint on (group_id, category_id) for mappings
```sql
-- Given: a mapping (group_id=A, category_id=B) exists
-- When: INSERT another mapping with same group_id and category_id
-- Then: ERROR: duplicate key value violates unique constraint "category_group_mappings_group_id_category_id_unique"
```

### Oracle T-06: search_path on SECURITY DEFINER functions
```sql
-- Every SECURITY DEFINER function must include "SET search_path = public"
-- This is verified by:
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE security_definer = 'YES'
AND routine_schema = 'public'
AND routine_definition LIKE '%search_path%';
-- Expected: has_role, validate_transaction_category, validate_store_category,
--           update_category_groups_updated_at all contain "search_path = public"
```
