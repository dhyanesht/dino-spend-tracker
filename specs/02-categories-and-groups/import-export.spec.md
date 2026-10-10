# Specification: Category Import/Export

## Domain

`02-categories-and-groups` — category backup and restore

## Scope

Users can export their category definitions (name, type, budget, color, parent_category) as JSON and import them back. This is a client-side operation — no server-side API endpoint involved.

---

## 1. Export Flow

### Entry Point

`CategoryManager.tsx` → "Export" button in the Categories tab toolbar.

### Data Shape

Each exported category includes fields from the `categories` table **excluding system fields**:

```typescript
interface ExportedCategory {
  name: string;          // Required
  type: 'fixed' | 'variable';  // Required
  monthly_budget: number; // Required, defaults to 0 if null
  color: string;         // Required, defaults to '#3B82F6' if null
  parent_category: string | null; // Required, null = parent category
}
```

### Export Logic

```typescript
const exportData = allCategories.map(cat => ({
  name: cat.name,
  type: cat.type,
  monthly_budget: cat.monthly_budget,
  color: cat.color,
  parent_category: cat.parent_category,
}));
```

Source: `CategoryManager.tsx:98-107`

### Output

- Format: JSON (pretty-printed, 2-space indent)
- MIME type: `application/json`
- Filename: `categories-export-{YYYY-MM-DD}.json`
- Delivered via synthetic `<a>` click (browser download)

### User Feedback

- Success toast: `Exported ${exportData.length} categories`

---

## 2. Import Flow

### Entry Point

`CategoryManager.tsx` → "Import" button opens hidden file input (`accept=".json"`).

### File Validation

| Check                              | Behavior                                           |
|------------------------------------|----------------------------------------------------|
| Not an array                       | Error: "Invalid file format. Expected an array of categories." |
| No items with required fields      | Error: "No valid categories found in file"         |
| Required fields present            | Included in import batch                           |

Required fields for validity:
- `cat.name` — must be truthy string
- `cat.type` — must be truthy string
- `cat.monthly_budget` — must be a number

### Duplicate Detection

Before inserting each category:
```typescript
const exists = allCategories.some(existing => existing.name === cat.name);
```

- If duplicate: increment `skipCount`, skip
- If not duplicate: attempt `addCategory.mutateAsync(...)`

### Import Processing

Categories are imported **sequentially** (one-by-one via `for` loop), not in batch.

### Import Behavior per Item

```typescript
await addCategory.mutateAsync({
  name: cat.name,
  type: cat.type,
  monthly_budget: cat.monthly_budget || 0,
  color: cat.color || '#3B82F6',
  parent_category: cat.parent_category || null,
});
```

### Error Handling

- Individual category failure: logged to console, does not stop the loop
- JSON parse failure: error toast with message
- Overall success: `Import complete! Added ${successCount} categories${skipCount > 0 ? `, skipped ${skipCount} duplicates` : ''}`

---

## 3. Validation Rules

### On Export

| Field            | Constraint                                      |
|------------------|-------------------------------------------------|
| `name`           | Must be non-empty string                        |
| `type`           | Must be `'fixed'` or `'variable'`               |
| `monthly_budget` | Must be a number ≥ 0                            |
| `color`          | Must be a valid hex color string                |
| `parent_category`| Must be `null` (parent) or a string (subcategory)|

### On Import

| Field            | Validation                                     |
|------------------|------------------------------------------------|
| `name`           | Must be truthy — checked via `cat.name`        |
| `type`           | Must be truthy — checked via `cat.type`        |
| `monthly_budget` | Must be `typeof === 'number'`                  |
| `color`          | Defaults to `#3B82F6` if falsy                 |
| `parent_category`| Defaults to `null` if falsy                    |

### Missing Fields

If a category in the file is missing required fields (`name`, `type`, `monthly_budget`), it is filtered out by:
```typescript
cat.name && cat.type && typeof cat.monthly_budget === 'number'
```

---

## 4. Invariants

| #  | Invariant                                              |
|----|--------------------------------------------------------|
| 1  | Export preserves parent_category as-is (null or string)|
| 2  | Import never overwrites existing categories            |
| 3  | Import processes categories sequentially, not batched   |
| 4  | Individual import failure does not abort the batch      |
| 5  | Export filename uses ISO date format `YYYY-MM-DD`      |

---

## 5. Test Oracles

### TO-EXPORT-1: Export includes all fields
**Given** categories have fields `name, type, monthly_budget, color, parent_category`
**When** export is triggered
**Then** JSON file contains array where each object has exactly these 5 keys: `name, type, monthly_budget, color, parent_category`

### TO-EXPORT-2: Export excludes system fields
**Given** the categories table has columns `id, user_id, created_at, updated_at, ...`
**When** export is triggered
**Then** JSON objects do NOT include `id, user_id, created_at, updated_at`

### TO-EXPORT-3: Export filename has date
**Given** today is `2025-06-14`
**When** export completes
**Then** download filename is `categories-export-2025-06-14.json`

### TO-EXPORT-4: Empty category set exports valid empty array
**Given** user has zero categories
**When** export is triggered
**Then** JSON file content is `[]` and toast shows "Exported 0 categories"

### TO-IMPORT-1: Valid import adds all categories
**Given** a JSON file with 5 valid, non-duplicate categories
**When** import is completed
**Then** 5 categories are created and toast shows "Import complete! Added 5 categories"

### TO-IMPORT-2: Duplicate categories are skipped
**Given** user has category named "Groceries" and imports a file containing "Groceries"
**When** import is completed
**Then** toast shows "Import complete! Added N categories, skipped 1 duplicates"

### TO-IMPORT-3: Invalid JSON shows error
**Given** imported file is not valid JSON
**When** import is attempted
**Then** toast error shows "Failed to import categories"

### TO-IMPORT-4: Non-array JSON shows error
**Given** imported file contains `{"foo": "bar"}`
**When** JSON is parsed
**Then** error "Invalid file format. Expected an array of categories." is shown

### TO-IMPORT-5: Partial failure continues batch
**Given** import file has 5 categories, one of which fails DB insert
**When** import runs sequentially
**Then** 4 categories succeed, 1 fails silently with console.error, toast shows "Added 4 categories"

### TO-IMPORT-6: Missing required fields filtered out
**Given** JSON array has 3 items, 2 valid and 1 missing `name`
**When** validation filter runs
**Then** only 2 items pass validation, 1 is filtered out

---

## 6. Store Mapping Persistence

Category import/export does **not** affect store mappings stored in the `stores` table. Store mappings (transaction description → store name) are separate from category definitions and are not part of this export/import format.

---

## 7. Source References

| Component / Hook              | File Path                                     |
|-------------------------------|-----------------------------------------------|
| `CategoryManager.tsx`       | `src/components/dashboard/CategoryManager.tsx` |
| `useCategories`               | `src/hooks/useCategories.ts`                 |
| `useAddCategory`              | `src/hooks/useCategories.ts`                 |
| `CategoryDialog.tsx`          | `src/components/dashboard/CategoryDialog.tsx`|
| `StoreManager.tsx`            | `src/components/dashboard/StoreManager.tsx`  |
