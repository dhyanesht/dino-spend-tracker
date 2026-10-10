# Specification: Virtual Category Groups

## Domain

`02-categories-and-groups` — many-to-many grouping of categories via virtual groups

## Scope

Category groups allow users to create virtual collections of categories without altering the category hierarchy itself. A group maps to zero or more categories via `category_group_mappings`, forming a many-to-many relationship.

---

## 1. Entity Definitions

### CategoryGroup

```typescript
interface CategoryGroup {
  id: string;              // UUID, primary key
  user_id: string;         // FK to auth.users, RLS enforced
  name: string;            // Display name (unique within user)
  description: string | null;
  color: string;           // Hex color string, default '#3B82F6'
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
}
```

### CategoryGroupMapping

```typescript
interface CategoryGroupMapping {
  id: string;              // UUID, primary key
  user_id: string;         // FK to auth.users
  group_id: string;        // FK to category_groups.id
  category_id: string;     // FK to categories.id
  created_at: string;      // ISO timestamp
}
```

### GroupWithCategories (client-side composition)

```typescript
interface GroupWithCategories extends CategoryGroup {
  categories: string[];    // Array of category NAMEs (not IDs)
}
```

---

## 2. Database Schema

### Tables

```sql
-- Defined in migration 20250611160128

CREATE TABLE IF NOT EXISTS category_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS category_group_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

- `category_group_mappings_group_id_idx` — on `group_id`
- `category_group_mappings_category_id_idx` — on `category_id`
- `category_group_mappings_user_id_idx` — on `user_id`

### Constraints

- `(user_id, name)` must be unique on `category_groups`
- `(group_id, category_id)` must be unique on `category_group_mappings` (a category can only be mapped once per group)

---

## 3. Hooks API

### useCategoryGroups

Fetches all groups for the authenticated user.

**Query Key:** `['category-groups']`

**Query:**
```typescript
supabase
  .from('category_groups')
  .select('*')
  .eq('user_id', user.id)
  .order('name');
```

### useGroupMappings

Fetches all mappings for the authenticated user.

**Query Key:** `['category-group-mappings']`

**Query:**
```typescript
supabase
  .from('category_group_mappings')
  .select('*')
  .eq('user_id', user.id);
```

### useAddCategoryGroup

Creates a new group.

**Input:** `{ name: string, description?: string, color: string }`

**Behavior:**
1. Gets current user from `supabase.auth.getUser()`
2. Inserts with `user_id` set to authenticated user
3. On success: invalidates `['category-groups']`, shows toast success
4. On error: shows toast error with message

### useUpdateCategoryGroup

Updates a group's name, description, or color.

**Input:** `{ id: string, updates: Partial<CategoryGroup> }`

**Behavior:**
1. Updates by ID
2. Selects returned row
3. On success: invalidates `['category-groups']`, shows toast
4. On error: shows toast

### useDeleteCategoryGroup

Deletes a group and cascades to mappings.

**Input:** `id: string`

**Behavior:**
1. Deletes from `category_groups` by ID
2. On success: invalidates `['category-groups']` AND `['category-group-mappings']`, shows toast
3. On error: shows toast

### useAddGroupMapping

Adds a single category→group mapping.

**Input:** `{ group_id: string, category_id: string }`

**Behavior:**
1. Gets current user
2. Inserts mapping with `user_id`
3. On success: invalidates `['category-group-mappings']`
4. On error: shows toast

### useRemoveGroupMapping

Removes a single mapping.

**Input:** `{ group_id: string, category_id: string }`

**Behavior:**
1. Deletes where `group_id = X AND category_id = Y`
2. On success: invalidates `['category-group-mappings']`
3. On error: shows toast

### useBatchUpdateGroupMappings

Replaces all mappings for a group atomically.

**Input:** `{ group_id: string, category_ids: string[] }`

**Behavior:**
1. Gets current user
2. **Deletes all existing mappings** for the given `group_id`
3. If `category_ids.length > 0`, inserts all new mappings with `user_id`
4. On success: invalidates `['category-group-mappings']`, shows toast
5. On error: shows toast

> **Note:** The delete-then-insert approach is not transactional at the client level. If the delete succeeds but insert fails, the group will have no mappings.

---

## 4. RLS Policies

| Operation | Policy                                                                 |
|-----------|------------------------------------------------------------------------|
| SELECT    | `auth.uid() = user_id`                                                 |
| INSERT    | `auth.uid() = user_id` (user_id is set from client, not guessed)      |
| UPDATE    | `auth.uid() = user_id`                                                 |
| DELETE    | `auth.uid() = user_id`                                                 |

---

## 5. Composition Rules

A virtual group is resolved at query time:

1. Query `category_group_mappings` for `user_id = current_user`
2. Filter mappings where `group_id = target_group_id`
3. Join to `categories` table on `category_id`
4. Return the set of category names for that group

The relationship is **additive and non-destructive**:
- A category can belong to zero, one, or many groups.
- Deleting a group or a mapping does NOT delete the underlying category.
- Deleting a category does NOT delete group mappings referencing it (database constraint may cascade — check migration).

---

## 6. Invariant: Uniqueness

| #  | Invariant                                              |
|----|--------------------------------------------------------|
| 1  | Group names must be unique within a user's set of groups|
| 2  | A category can only be mapped once per group            |
| 3  | Deleting a group cascades to its mappings               |
| 4  | Group membership is always user-scoped                    |

---

## 7. Test Oracles

### TO-GROUP-1: Batch update replaces all mappings
**Given** group G1 has mappings to categories [A, B, C]
**When** `useBatchUpdateGroupMappings({ group_id: G1, category_ids: [A, D] })` is called
**Then** mappings table for G1 contains exactly [A, D] (B and C removed, D added)

### TO-GROUP-2: Add mapping inserts single row
**Given** group G1 exists and category C1 exists
**When** `useAddGroupMapping({ group_id: G1, category_id: C1 })` is called
**Then** exactly one new row is inserted in `category_group_mappings`

### TO-GROUP-3: Remove mapping deletes single row
**Given** a mapping exists between G1 and C1
**When** `useRemoveGroupMapping({ group_id: G1, category_id: C1 })` is called
**Then** exactly one row is deleted from `category_group_mappings`

### TO-GROUP-4: Delete group cascades to mappings
**Given** group G1 has mappings [A, B, C]
**When** `useDeleteCategoryGroup(G1)` is called
**Then** group G1 is deleted from `category_groups` AND all mappings for G1 are deleted from `category_group_mappings`

### TO-GROUP-5: Cannot add duplicate mapping
**Given** a mapping exists between G1 and C1
**When** user attempts to add the same mapping via `useAddGroupMapping({ group_id: G1, category_id: C1 })`
**Then** the database returns a unique constraint violation and the toast shows an error

### TO-GROUP-6: Add group sets user_id from auth
**Given** user U1 is authenticated
**When** `useAddCategoryGroup({ name: 'My Group', description: 'test' })` is called
**Then** the new group has `user_id = U1.id`

### TO-GROUP-7: Non-unique group name fails
**Given** user U1 has a group named `'Subscriptions'`
**When** user attempts to add another group named `'Subscriptions'`
**Then** the database returns a unique constraint violation

### TO-GROUP-8: Empty category_ids list clears mappings
**Given** group G1 has mappings [A, B, C]
**When** `useBatchUpdateGroupMappings({ group_id: G1, category_ids: [] })` is called
**Then** all mappings for G1 are deleted, no new mappings inserted

---

## 8. Source References

| File                          | Path                                     |
|-------------------------------|------------------------------------------|
| `useCategoryGroups` hook      | `src/hooks/useCategoryGroups.ts`        |
| `CategoryGroupManager.tsx`    | `src/components/dashboard/CategoryGroupManager.tsx` |
| `CategoryManager.tsx`         | `src/components/dashboard/CategoryManager.tsx` |
| Migration (groups schema)     | `supabase/migrations/20250611160128_fixed_mistakes.sql` |

---

## 9. Seed Data

The `seed-category-groups` edge function pre-populates default category groups for new users. See: `supabase/functions/seed-category-groups/index.ts`

Default groups seeded (from migration `20260607154343`):

| Group Name          | Categories Included              |
|---------------------|----------------------------------|
| Utilities & Bills   | Electricity, Gas, Internet, etc. |
| Food                | Groceries, Restaurants           |
| Transportation      | Gas, Public Transit, Parking     |
