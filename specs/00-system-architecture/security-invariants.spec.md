# Security Invariants Specification

**Source of truth:** `supabase/migrations/*.sql`, `src/integrations/supabase/client.ts`, `supabase/config.toml`, `scaling_up/adr.md` (ADR-006, ADR-011), `scaling_up/requirements.md` (NFR-11 through NFR-15)

---

## Security Layer Map

```
Layer 1: Network  — TLS 1.3, CORS, rate limiting (Supabase managed)
Layer 2: Auth     — JWT (access_token + refresh_token) via Supabase GoTrue
Layer 3: Authz    — Row Level Security (RLS) on all tables + has_role() function
Layer 4: Validation — Zod schemas (client) + PostgreSQL CHECK constraints + TRIGGER constraints
```

---

## Invariant: search_path on SECURITY DEFINER Functions

**ADR-011** (`scaling_up/adr.md:184-196`)

> Every `SECURITY DEFINER` function must include `SET search_path = public` (or its explicit schema(s)).

### Applies To

| Function | Definition Location | search_path |
|----------|-------------------|-------------|
| `public.has_role(_user_id, _role)` | `supabase/migrations/20251018174132...sql:27-39` | `SET search_path = public` |
| `public.validate_transaction_category()` | `supabase/migrations/20251020041945...sql:2-18` | `SET search_path = public` |
| `public.validate_store_category()` | `supabase/migrations/20251020041945...sql:34-50` | `SET search_path = public` |
| `public.update_category_groups_updated_at()` | `supabase/migrations/20251030153625...sql:4-14` | `SET search_path = public` |

### Verification Query

```sql
SELECT
  routine_name,
  routine_definition,
  COUNT(*) AS search_path_clauses
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND security_definer = 'YES'
  AND routine_definition ILIKE '%search_path%public%'
GROUP BY routine_name, routine_definition;
```

**Expected result:** 4 rows (one per function listed above).

### Failure Mode

If `search_path` is omitted on a `SECURITY DEFINER` function, an attacker who has created a function or type in the `public` schema (or a schema earlier in the search path) can hijack the function's behavior, potentially escalating privileges. The Supabase database linter flags this warning.

---

## Invariant: RLS on All User-Data Tables

Every table that stores per-user data has `ROW LEVEL SECURITY` enabled.

| Table | RLS Enabled | Source |
|-------|-------------|--------|
| `transactions` | Yes | Implied (RLS created in migration `20251018...`) |
| `categories` | Yes | Implied (RLS created in migration `20251018...`) |
| `category_groups` | Yes | `ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY` |
| `category_group_mappings` | Yes | `ALTER TABLE public.category_group_mappings ENABLE ROW LEVEL SECURITY` |
| `stores` | Yes | `ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY` |
| `user_roles` | Yes | `ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY` |
| `plaid_items` | Yes (assumed) | RLS assumed from pattern |

### Test Oracle: Anonymous access returns zero rows

```sql
-- Given: no user session (anon role)
-- When: SELECT * FROM transactions
-- Then: 0 rows returned (RLS USING clause evaluates auth.uid() = NULL, which is false)
```

---

## Invariant: No Privilege Escalation via `user_roles`

**ADR-006** (`scaling_up/adr.md:105-118`) stores roles in a separate table, not on `profiles`. The latest migration hardens this further.

### What Is Blocked

| Actor | Action | Blocked By |
|-------|--------|------------|
| Authenticated user | `INSERT INTO user_roles` | Policy `"Block authenticated role inserts"` (`WITH CHECK (false)`) |
| Authenticated user | `UPDATE user_roles` | Policy `"Block authenticated role updates"` (`USING (false) WITH CHECK (false)`) |
| Authenticated user | `DELETE user_roles` | Policy `"Block authenticated role deletes"` (`USING (false)`) |
| Anonymous user | `INSERT/UPDATE/DELETE user_roles` | `REVOKE INSERT, UPDATE, DELETE ON user_roles FROM anon, authenticated` |
| Authenticated/anon | `EXECUTE` on trigger functions | `REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated, PUBLIC` |

### Functions Revoke-Checked

```sql
REVOKE EXECUTE ON FUNCTION public.update_category_groups_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_transaction_category() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_store_category() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
```

### Test Oracle: Privilege escalation attempt

```sql
-- Given: authenticated user with no admin role
-- When: INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), 'admin')
-- Then: ERROR 42501 (insufficient privileges) or policy returns false
-- And: no row is inserted
```

---

## Invariant: Denormalized Category on Transactions Cannot Be a Parent

**ADR-005** (`scaling_up/adr.md:89-103`) and **ADR-007** (`scaling_up/adr.md:121-134`) establish that:
1. Transactions store the **category name** as text (not a FK)
2. Transactions must reference a **subcategory** (i.e., `parent_category IS NOT NULL`)

### Enforcement Mechanism

```sql
CREATE OR REPLACE FUNCTION public.validate_transaction_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.categories
    WHERE name = NEW.category
      AND parent_category IS NULL
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Transactions cannot be assigned to parent categories. Please use a subcategory instead.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_transaction_category_on_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_category();

CREATE TRIGGER validate_transaction_category_on_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.category IS DISTINCT FROM NEW.category)
  EXECUTE FUNCTION public.validate_transaction_category();
```

### Same invariant for stores

```sql
CREATE OR REPLACE FUNCTION public.validate_store_category()
-- ... same pattern, checking NEW.category_name instead of NEW.category
```

### Test Oracle: Parent category rejected

```sql
-- Given: category "Food & Dining" exists with parent_category = NULL
-- When: INSERT INTO transactions (user_id, description, amount, category, date, type)
--       VALUES ('<uid>', 'Lunch', 15.00, 'Food & Dining', '2024-01-15', 'expense')
-- Then: EXCEPTION raised with message containing "parent categories"
-- And: transaction NOT inserted
```

---

## Invariant: No Secret in Browser Code

### What Must Never Appear in Client Code

| Secret | Where It Must NOT Be |
|--------|---------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Anywhere in `src/` |
| `LOVABLE_API_KEY` | Anywhere in `src/` |
| Any API key with `service_role` JWT | Anywhere in `src/` |

### What IS Safe in Client Code

```typescript
// src/integrations/supabase/client.ts — safe to commit
const SUPABASE_URL = "https://oskhweltnnifpzxahyij.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIs..."; // anon role only
```

### Test Oracle: Grep for secrets

```bash
# This should return zero matches in src/
grep -r "service_role" src/
grep -r "LOVABLE_API_KEY" src/
```

---

## Invariant: CORS Headers on Edge Functions

**Source:** `supabase/functions/categorize-transactions/index.ts:4-6`

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

Every edge function response must include these headers. The `OPTIONS` preflight handler must return these headers before any processing.

### Test Oracle: CORS preflight

```
Given: an OPTIONS request to /functions/v1/categorize-transactions
When: the function executes
Then: response has 200 status
And: response headers include Access-Control-Allow-Origin
And: response headers include Access-Control-Allow-Headers with authorization
```

---

## Invariant: JWT Verification on Edge Functions

**Source:** `supabase/config.toml:3-4`

```toml
[functions.categorize-transactions]
verify_jwt = true
```

When `verify_jwt = true`, the Supabase Edge Functions proxy validates the caller's JWT before executing the function body. The JWT must be a valid Supabase access token (issued by the same project).

### Test Oracle: Missing JWT rejected

```
Given: a POST request to /functions/v1/categorize-transactions with no Authorization header
When: the request reaches the Supabase proxy
Then: the proxy returns 401 Unauthorized
And: the function body is never executed
```

---

## Invariant: Input Validation (Defense in Depth)

Validation occurs at three layers:

| Layer | Mechanism | Source |
|-------|-----------|--------|
| Client | Zod schemas (`validation.ts`) | `src/lib/validation.ts` |
| DB | PostgreSQL CHECK constraints | Migrations |
| DB | BEFORE INSERT/UPDATE triggers | `validate_transaction_category`, `validate_store_category` |

### Zod Schemas

| Schema | Field | Rule |
|--------|-------|------|
| `transactionSchema` | `description` | trimmed, 1-200 chars |
| | `amount` | positive, max 1,000,000, finite |
| | `date` | `YYYY-MM-DD` format, between 1900-01-01 and today |
| | `category` | non-empty string |
| | `type` | enum `['expense', 'income']` |
| `categorySchema` | `name` | trimmed, 1-100 chars |
| | `type` | enum `['fixed', 'variable']` |
| | `monthly_budget` | non-negative, max 1,000,000, finite |
| | `color` | hex regex: `^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$` |
| | `parent_category` | nullable string |
| `storeSchema` | `name` | trimmed, 1-150 chars |
| | `category_name` | non-empty string |

---

## Summary of Never-Do Rules

| # | Rule | Enforcement |
|---|------|-------------|
| S-01 | Never expose `service_role` key in browser code | Grep audit, code review |
| S-02 | Never allow authenticated users to manage roles | RLS policies + REVOKE |
| S-03 | Never allow `SECURITY DEFINER` functions without `SET search_path = public` | Linter + manual review |
| S-04 | Never assign a parent category to a transaction | DB trigger |
| S-05 | Never assign a parent category to a store mapping | DB trigger |
| S-06 | Never allow anonymous access to user data tables | RLS enabled on all tables |
| S-07 | Never skip CORS headers on edge functions | Hardcoded `corsHeaders` |
| S-08 | Never skip JWT verification on protected edge functions | `verify_jwt = true` in config |
| S-09 | Never trust client-side validation alone | CHECK constraints + triggers + RLS |
| S-10 | Never allow duplicate (user_id, category_name) on stores | Application-level check in `useAddStore` |
| S-11 | Never revoke EXECUTE from `PUBLIC` without explicit re-grant | Latest migration handles this |
