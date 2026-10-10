# Authentication & Roles Specification

**Source of truth:** `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx`, `supabase/migrations/20251018...sql`, `supabase/config.toml`, `src/integrations/supabase/client.ts`

---

## Session Model

### How Auth State is Managed

The application does **not** use the `useAuth()` hook from `@/hooks`. Instead it reads directly from `supabase.auth.getSession()` in `Dashboard.tsx:28-35` and listens via `supabase.auth.onAuthStateChange()` for session changes.

```
Dashboard.tsx
  → supabase.auth.getSession()         // initial check
  → supabase.auth.onAuthStateChange()  // subscription
  → if no session → navigate('/auth')
  → if session → setUser(session.user)
```

### AuthContext

`src/contexts/AuthContext.tsx` provides a cached `user` object and `signOut` function to the rest of the app via React Context. Components that use `useAuth()` from this context get the cached user instead of calling `supabase.auth.getUser()` on every mutation (see `PERFORMANCE.md:36-43`).

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

### Session Token

| Property | Value | Source |
|----------|-------|--------|
| Provider | Supabase GoTrue | `supabase/auth` |
| Token type | JWT (access_token + refresh_token) | Supabase managed |
| Storage | `localStorage` (default Supabase behavior) | `supabase-js` default |
| Refresh | Automatic via `onAuthStateChange` | Supabase managed |
| Planned | httpOnly cookies | `high-level-design.md:213` — not yet implemented |

### Auth Guard

```typescript
// Dashboard.tsx:26-47
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) navigate('/auth');
    else setUser(session.user);
    setIsLoading(false);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (!session) navigate('/auth');
    else setUser(session.user);
  });

  return () => subscription.unsubscribe();
}, [navigate]);
```

**Never trust client-side auth state alone.** Every Supabase query is scoped by RLS, which reads `auth.uid()` from the JWT.

---

## Authentication Flows

### Sign Up

1. User navigates to `/auth`
2. User enters email and password
3. Client calls `supabase.auth.signUp({ email, password })`
4. If successful, user is redirected to the dashboard
5. Email verification is **NOT** enforced in the client code (no `email_confirm` check)

**Given** a user with a new email and valid password  
**When** they call `supabase.auth.signUp({ email, password })`  
**Then** a new row appears in `auth.users` with `email`, `encrypted_password`, and `created_at`  
**And** a session JWT is returned  

### Sign In

1. User navigates to `/auth`
2. User enters credentials
3. Client calls `supabase.auth.signInWithPassword({ email, password })`
4. On success, redirect to `/dashboard`

**Given** a verified user with email `test@example.com` and known password  
**When** `signInWithPassword` is called with correct credentials  
**Then** a valid session with `access_token` and `refresh_token` is returned  
**And** the JWT `sub` claim equals the user's `auth.users.id`

### Sign Out

1. User clicks logout button
2. Client calls `supabase.auth.signOut()`
3. Session is invalidated on the client
4. User is redirected to `/auth`

---

## Role System

### Data Model

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);
```

### Role Check Function

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role = _role)
$$;
```

| Property | Value |
|----------|-------|
| Volatility | STABLE |
| Security | SECURITY DEFINER |
| search_path | `public` |
| Args | `_user_id UUID`, `_role app_role` |
| Returns | BOOLEAN |

### Role Assignment Rules

| Rule | Source |
|------|--------|
| Only `service_role` can INSERT/UPDATE/DELETE rows in `user_roles` | RLS: `"Service role can manage roles"` policy |
| Authenticated users cannot manage roles at all | `REVOKE INSERT, UPDATE, DELETE FROM authenticated`; `Block authenticated role inserts/updates/deletes` policies |
| Users can SELECT their OWN role | RLS: `"Users can view own roles"` policy |
| A user can have multiple roles | `UNIQUE (user_id, role)` — same role can't be assigned twice |

### Role Usage in RLS

Every user-data table's RLS `USING` clause includes:

```sql
auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
```

This means:
- Regular users see only their own rows
- Admins can see all rows across all users

### service_role Boundaries

| Context | Allowed? |
|---------|----------|
| Client browser (anon key) | NO — `service_role` JWT is never sent to the browser |
| Edge Functions (Deno) | YES — functions use `SUPABASE_SERVICE_ROLE_KEY` or the client's anon key with the user's Bearer token |
| `seed-category-groups` function | Uses `SUPABASE_ANON_KEY` + user's `Authorization` header |
| Supabase Dashboard / SQL Editor | YES — direct DB access |
| CLI migrations | YES — `supabase db push` |

**Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code.** It must only be used in trusted server-side contexts (edge functions, migrations).

---

## Edge Function Auth

### `categorize-transactions` (Deno)

- **Config:** `verify_jwt = true` (`supabase/config.toml:3-4`)
- **Auth:** Does NOT verify user identity itself — it relies on `verify_jwt = true` at the Supabase proxy level. The function does not call `supabase.auth.getUser()`.
- **Secrets:** Reads `LOVABLE_API_KEY` from `Deno.env.get('LOVABLE_API_KEY')`
- **API endpoint:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Model:** `google/gemini-2.5-flash`
- **Temperature:** `0.3`

### `seed-category-groups` (Deno)

- **Auth:** Manually verifies via `supabase.auth.getUser()` using the `Authorization` header
- **Client:** Creates a Supabase client with the user's Bearer token
- **Config:** No `verify_jwt` setting in `config.toml` (defaults to `true`)

---

## Client Configuration

### Supabase Client

```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = "https://oskhweltnnifpzxahyij.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIs..."; // anon key

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

- The anon key is **publishable** (safe to commit to source control)
- It is used by the browser to authenticate DB queries — RLS enforces per-user isolation
- The key has role `anon` in its JWT

### Environment Variables (Edge Functions)

| Variable | Required For | Stored In |
|----------|-------------|-----------|
| `LOVABLE_API_KEY` | `categorize-transactions` function | `Deno.env.get()` |
| `SUPABASE_URL` | `seed-category-groups` function | `Deno.env.get()` |
| `SUPABASE_ANON_KEY` | `seed-category-groups` function | `Deno.env.get()` |

Set via: `supabase secrets set LOVABLE_API_KEY=<value>`

---

## Invariants (Never Do)

1. **Never expose the service_role key in client-side code.** Only `SUPABASE_PUBLISHABLE_KEY` (anon) is bundled in the frontend.
2. **Never allow a user to escalate their own role.** `user_roles` INSERT is blocked for authenticated users.
3. **Never rely on client-side auth state alone.** RLS always checks `auth.uid()` from the JWT on every query.
4. **Never allow unauthenticated CRUD on protected tables.** All user-data tables have RLS enabled.
5. **Never call `has_role()` without `SET search_path = public`.** The function is defined with it, and all RLS policies reference `public.has_role()`.
6. **Never bypass JWT verification on edge functions** unless the function is a public webhook with its own auth logic. `categorize-transactions` has `verify_jwt = true`.

---

## Test Scenarios

### Scenario A: Authenticated user can read their own transactions
```
Given a user U with a valid session JWT
When they call supabase.from('transactions').select('*')
Then only rows where user_id = U.id are returned
And rows from other users are excluded by RLS
```

### Scenario B: Unauthenticated user cannot read transactions
```
Given no valid session
When an anon-key request hits /rest/v1/transactions
Then the RLS policy evaluates auth.uid() = NULL
And zero rows are returned
```

### Scenario C: Admin role bypass
```
Given user A has role 'admin' in user_roles
And user B has transactions in the database
When user A queries transactions
Then ALL transactions (including user B's) are returned
```

### Scenario D: Authenticated user cannot self-escalate
```
Given a regular authenticated user
When they try to INSERT INTO user_roles (user_id, role) VALUES (self, 'admin')
Then RLS policy "Block authenticated role inserts" rejects with WITH CHECK (false)
And the row is NOT inserted
```

### Scenario E: service_role can manage roles
```
Given a request authenticated as service_role
When they INSERT INTO user_roles (user_id, role) VALUES ('<uid>', 'admin')
Then the "Service role can manage roles" policy allows the insert
And the row is created
```

### Scenario F: JWT claim controls edge function access
```
Given a request to /functions/v1/categorize-transactions without a valid JWT
Then Supabase proxy rejects with 401 before the function body executes
```

### Scenario G: User can view own roles only
```
Given users A and B both exist
When user A queries user_roles
Then only rows where user_id = A.id are returned
And user B's roles are invisible
```
