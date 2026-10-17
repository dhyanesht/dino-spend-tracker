# Import History, Recovery, and Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a durable import history system that tracks CSV transaction imports with file storage in Supabase Storage, provides row-level status tracking, enables undoing individual imports, and allows tracing transactions back to their source import.

**Architecture:** This feature adds two new database tables (`import_batches` for import metadata with CSV file references, `import_batch_details` for per-row tracking), a `storage_path` field on `import_batches` pointing to the stored CSV in Supabase Storage, and an `import_batch_id` column on `transactions` to trace transaction provenance. The frontend gains a new ImportHistoryViewer component and enhanced CSVImporter integration.

**Tech Stack:** TypeScript/React (frontend), PostgreSQL/Supabase (backend), Vitest (testing), Supabase Storage (file storage).

**Spec:** The user wants: (1) store the original CSV file in Supabase Storage (`csv-imports` bucket) for true recovery, (2) detailed import history with row-level status tracking (imported/skipped/duplicate/ambiguous), (3) selective undo of any past import, (4) trace transactions back to their source import batch showing filename and timestamp. Implementation follows existing patterns in `CSVImporter.tsx`, `useTransactions.ts`, `transactionDedup.ts`, and conventions in `AGENTS.md`.

## Global Constraints

- All code must use the anon key only; no service_role in client code (from AGENTS.md core invariant #3)
- Every `CREATE FUNCTION` (SECURITY DEFINER or not) must set `search_path = public` (from AGENTS.md core invariant #2)
- Dedup must maintain the ±3 day window, exact bucket category matching (from AGENTS.md core invariant #4)
- Tests use Vitest; run with `npm run test` or `npm run test:unit`
- TypeScript conventions: snake_case for DB columns, camelCase for TS properties
- No comments in code unless explicitly requested
- Subcategory-only rule: transactions cannot be assigned to parent categories (from specs/01-transactions/categorization-rules.spec.md)
- Sequential processing: category CSV imports are sequential; do not batch (from AGENTS.md invariant #6)
- Zero-division guard for ratio calculations (from AGENTS.md invariant #7)

## Review Focus

1. **Duplicate import detection**: User uploads the same CSV twice — second import should show existing transactions as duplicates. Test in Task 5: verifies `generateBatchDetails` produces status='duplicate' when a transaction already exists.
2. **Partial import recovery**: If import fails halfway, transactions already inserted should be linked to the import batch record with status='partial'. Test in Task 6.
3. **Undo safety**: Undoing an import that created transfers with `linked_transaction_id` must clean up both sides of the transfer. Test in Task 7: verifies both transfer legs are deleted.
4. **Storage URL security**: Signed URLs for CSV downloads should expire (30 seconds) and respect bucket RLS. Test in Task 2: verifies `createSignedUrl` is called with expiry parameter.
5. **Transaction tracing**: Every transaction from CSV import should have `import_batch_id` set; transactions added manually should have NULL. Test in Task 8: verifies `getImportSource` returns null for NULL import_batch_id.

---

## File Structure

**New files:**
- `supabase/migrations/20251016000000_create_import_schema.sql` — DB schema for import tables + storage bucket setup
- `supabase/migrations/20251016000001_create_import_functions.sql` — Server-side functions for atomic undo
- `src/lib/importTypes.ts` — TypeScript interfaces for import batch types
- `src/lib/csvImporterUtils.ts` — Utility functions for CSV upload and batch detail generation
- `src/hooks/useImportBatches.ts` — React Query hooks for import batch CRUD and undo
- `src/components/dashboard/ImportHistoryViewer.tsx` — UI component for viewing import history
- `tests/unit/csvImporterUtils.test.ts` — Tests for CSV utility functions
- `tests/unit/useImportBatches.test.ts` — Tests for import batch hooks
- `tests/unit/importHistoryViewer.test.tsx` — Tests for history viewer component

**Modified files:**
- `src/components/dashboard/CSVImporter.tsx` — Enhanced to upload CSV to storage, create import batch
- `src/hooks/useTransactions.ts` — Add `import_batch_id` to Transaction interface and insert
- `src/lib/validation.ts` — Add import batch schemas, add `import_batch_id` to transaction schema
- `src/pages/Dashboard.tsx` — Add ImportHistoryViewer component

---

## Tasks

### Task 1: Create Database Schema Migration

**Files:**
- Create: `supabase/migrations/20251016000000_create_import_schema.sql`

**Interfaces:**
- Consumes: Existing `transactions` table (columns: `id, user_id, description, amount, date, type, category, ...` and columns added in 20261014204434 migration)
- Produces: `import_batches` table, `import_batch_details` table, `transaction_import_batch_idx` index, `csv-imports` storage bucket

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrations/20251016000000_create_import_schema.sql` with:

1. **import_batches table:**
```sql
CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER,
  storage_bucket TEXT NOT NULL DEFAULT 'csv-imports',
  storage_path TEXT NOT NULL,
  import_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_rows INTEGER NOT NULL,
  parsed_count INTEGER NOT NULL,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

2. **import_batch_details table:**
```sql
CREATE TABLE IF NOT EXISTS public.import_batch_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  original_data JSONB NOT NULL,
  parsed_transaction JSONB,
  status TEXT NOT NULL CHECK (status IN ('imported', 'skipped', 'duplicate', 'ambiguous')),
  reason TEXT,
  matched_transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(import_batch_id, row_number)
);
```

3. **transactions table enhancement:**
```sql
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_import_batch ON public.transactions(import_batch_id);
```

4. **Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON public.import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_timestamp ON public.import_batches(import_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_import_batch_details_batch_id ON public.import_batch_details(import_batch_id);
```

5. **RLS:**
```sql
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batch_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import batches" ON public.import_batches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own import batches" ON public.import_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own import batches" ON public.import_batches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own import batches" ON public.import_batches FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own import details" ON public.import_batch_details FOR SELECT TO authenticated USING (auth.uid() = (SELECT user_id FROM public.import_batches WHERE id = import_batch_id));
CREATE POLICY "Users can insert own import details" ON public.import_batch_details FOR INSERT TO authenticated WITH CHECK ((SELECT user_id FROM public.import_batches WHERE id = import_batch_id) = auth.uid());
CREATE POLICY "Users can delete own import details" ON public.import_batch_details FOR DELETE TO authenticated USING ((SELECT user_id FROM public.import_batches WHERE id = import_batch_id) = auth.uid());
```

6. **Storage bucket setup:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('csv-imports', 'csv-imports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own CSV imports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'csv-imports'
  AND (storage.foldername)[1] = auth.uid()::text
);

CREATE POLICY "Users can view own CSV imports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'csv-imports'
  AND (storage.foldername)[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own CSV imports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'csv-imports'
  AND (storage.foldername)[1] = auth.uid()::text
);
```

- [ ] **Step 2: Verify migration applies**

Run: `supabase db push`
Expected: Migration applied successfully with no errors

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20251016000000_create_import_schema.sql
git commit -m "feat: add import batches and details schema with storage bucket"
```

---

### Task 2: Define Import Types and Validation Schemas

**Files:**
- Create: `src/lib/importTypes.ts`
- Modify: `src/lib/validation.ts`
- Test: `tests/unit/importTypes.test.ts`

**Interfaces:**
- Consumes: `z` from `src/lib/validation.ts`, `DedupStatus` from `src/lib/transactionDedup.ts`
- Produces: `ImportBatch`, `ImportBatchDetail`, `ImportBatchInsert`, `ImportStatus`, `ImportBatchDetailStatus` types and schemas

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/importTypes.test.ts
import { importBatchSchema, importBatchDetailSchema } from '@/lib/validation';
import type { ImportBatch, ImportBatchDetail } from '@/lib/importTypes';

it('validates a complete import batch', () => {
  const batch = {
    filename: 'transactions.csv',
    file_size: 4096,
    storage_bucket: 'csv-imports',
    storage_path: 'user123/1234567890-transaction.csv',
    total_rows: 42,
    parsed_count: 40,
    imported_count: 35,
    skipped_count: 2,
    duplicate_count: 5,
    status: 'completed',
  };
  expect(importBatchSchema.safeParse(batch).success).toBe(true);
});

it('uses defaults for unspecified fields', () => {
  const batch = {
    filename: 'transactions.csv',
    file_size: 1024,
    storage_bucket: 'csv-imports',
    storage_path: 'user123/test.csv',
    total_rows: 10,
    parsed_count: 8,
  };
  const result = importBatchSchema.parse(batch);
  expect(result.imported_count).toBe(0);
  expect(result.skipped_count).toBe(0);
  expect(result.duplicate_count).toBe(0);
  expect(result.status).toBe('pending');
});

it('validates import batch detail', () => {
  const detail = {
    import_batch_id: '00000000-0000-0000-0000-000000000000',
    row_number: 1,
    original_data: { description: 'Starbucks', amount: '5.75' },
    parsed_transaction: { description: 'Starbucks', amount: 5.75 },
    status: 'imported' as const,
  };
  expect(importBatchDetailSchema.safeParse(detail).success).toBe(true);
});

it('rejects invalid import batch status', () => {
  const batch = {
    filename: 'test.csv',
    file_size: 1024,
    storage_path: 'test.csv',
    total_rows: 10,
    parsed_count: 8,
    status: 'invalid_status',
  };
  expect(importBatchSchema.safeParse(batch).success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/importTypes.test.ts`
Expected: FAIL with "Cannot find module '@/lib/importTypes'"

- [ ] **Step 3: Add schemas to `src/lib/validation.ts`**

```typescript
// Add to src/lib/validation.ts (after existing schemas)
export const importStatusSchema = z.enum(['pending', 'completed', 'failed', 'partial']);
export type ImportStatus = z.infer<typeof importStatusSchema>;

export const importBatchDetailStatusSchema = z.enum(['imported', 'skipped', 'duplicate', 'ambiguous']);
export type ImportBatchDetailStatus = z.infer<typeof importBatchDetailStatusSchema>;

export const importBatchSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  file_size: z.number().positive('File size must be positive'),
  storage_bucket: z.string().default('csv-imports'),
  storage_path: z.string().min(1, 'Storage path is required'),
  total_rows: z.number().int().nonnegative(),
  parsed_count: z.number().int().nonnegative(),
  imported_count: z.number().int().nonnegative().default(0),
  skipped_count: z.number().int().nonnegative().default(0),
  duplicate_count: z.number().int().nonnegative().default(0),
  status: importStatusSchema.default('pending'),
  error_message: z.string().nullable().optional(),
});

export const importBatchDetailSchema = z.object({
  import_batch_id: z.string().uuid(),
  row_number: z.number().int().positive(),
  original_data: z.record(z.any()),
  parsed_transaction: z.record(z.any()).nullable(),
  status: importBatchDetailStatusSchema,
  reason: z.string().nullable().optional(),
  matched_transaction_id: z.string().uuid().nullable().optional(),
});

// Add import_batch_id to transactionSchema
// In the existing transactionSchema object, add:
// import_batch_id: z.string().uuid().nullable().optional(),

export interface ImportBatch {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  storage_bucket: string;
  storage_path: string;
  import_timestamp: string;
  total_rows: number;
  parsed_count: number;
  imported_count: number;
  skipped_count: number;
  duplicate_count: number;
  status: ImportStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportBatchDetail {
  id: string;
  import_batch_id: string;
  row_number: number;
  original_data: Record<string, unknown>;
  parsed_transaction: Record<string, unknown> | null;
  status: ImportBatchDetailStatus;
  reason: string | null;
  matched_transaction_id: string | null;
  created_at: string;
}

export type ImportBatchInsert = z.infer<typeof importBatchSchema>;
export type ImportBatchDetailInsert = z.infer<typeof importBatchDetailSchema>;
```

- [ ] **Step 3: Create `src/lib/importTypes.ts` with interfaces and type aliases**

```typescript
// src/lib/importTypes.ts
import type { ImportBatch, ImportBatchDetail, ImportStatus, ImportBatchDetailStatus, ImportBatchInsert, ImportBatchDetailInsert } from '@/lib/validation';

export type { ImportBatch, ImportBatchDetail, ImportStatus, ImportBatchDetailStatus, ImportBatchInsert, ImportBatchDetailInsert };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/importTypes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/importTypes.ts tests/unit/importTypes.test.ts
git commit -m "feat: add import batch types and validation schemas"
```

---

### Task 3: Implement Import Batch Hooks

**Files:**
- Create: `src/hooks/useImportBatches.ts`
- Test: `tests/unit/useImportBatches.test.ts`

**Interfaces:**
- Consumes: `ImportBatch`, `ImportBatchDetail`, `importBatchSchema` from `src/lib/validation.ts`; `useAuth` from `src/contexts/AuthContext`; `Transaction` from `src/hooks/useTransactions.ts`
- Produces: `useImportBatches`, `useImportBatch`, `useImportBatchDetails`, `useCreateImportBatch`, `useUpdateImportBatch`, `useUndoImport` hooks

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/useImportBatches.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateImportBatch, useImportBatches, useUpdateImportBatch } from '@/hooks/useImportBatches';

// Mock supabase
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockIn = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: { id: 'batch-123' }, error: null })) })) })),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ data: [], error: null })) })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ data: [], error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ data: [], error: null })) })),
      rpc: vi.fn(),
    })),
    rpc: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

it('createImportBatch creates record and returns batch ID', async () => {
  const { result } = renderHook(() => useCreateImportBatch());
  const batchId = await result.current.mutateAsync({
    filename: 'test.csv',
    file_size: 1024,
    storage_path: 'user123/test.csv',
    total_rows: 10,
    parsed_count: 8,
  });
  expect(batchId).toBe('batch-123');
});

it('updateImportBatch updates counts and status', async () => {
  const { result } = renderHook(() => useUpdateImportBatch());
  await result.current.mutateAsync({
    batchId: 'batch-123',
    updates: { imported_count: 5, skipped_count: 3, status: 'completed' },
  });
  // Verify update was called on import_batches table
});

it('importBatches query fetches user batches', async () => {
  const { result, isFetching } = renderHook(() => useImportBatches());
  await waitFor(() => expect(result.current.isPending).toBe(false));
  // Verify query returned batches for the user
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/useImportBatches.test.ts`
Expected: FAIL with "Cannot find module '@/hooks/useImportBatches'"

- [ ] **Step 3: Implement hooks in `src/hooks/useImportBatches.ts`**

Key hooks:
- `useImportBatches()` — Query hook: `SELECT * FROM import_batches WHERE user_id = auth.uid() ORDER BY import_timestamp DESC`
- `useImportBatch(batchId: string)` — Query hook for single batch
- `useImportBatchDetails(batchId: string)` — Query hook returning details
- `useCreateImportBatch()` — Mutation: inserts into `import_batches`, returns `id`
- `useUpdateImportBatch()` — Mutation: updates batch counts/status
- `useUndoImport()` — Mutation: calls `cleanup_import_batch(batchId)` stored procedure (see Task 7)

```typescript
export const useCreateImportBatch = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (batch: ImportBatchInsert) => {
      if (!user) throw new Error('You must be logged in');
      const { data, error } = await supabase
        .from('import_batches')
        .insert([{ ...batch, user_id: user.id }])
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches'] });
    },
  });
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/useImportBatches.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useImportBatches.ts tests/unit/useImportBatches.test.ts
git commit -m "feat: add import batch React Query hooks"
```

---

### Task 4: Create Import Utility Functions

**Files:**
- Create: `src/lib/csvImporterUtils.ts`
- Test: `tests/unit/csvImporterUtils.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/integrations/supabase/client`, `ImportBatchInsert`, `ImportBatchDetailInsert` from `@/lib/validation`
- Produces: `uploadCsvToStorage`, `generateBatchDetails`, `createSignedUrlForImport` functions

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/csvImporterUtils.test.ts
import { uploadCsvToStorage, createSignedUrlForImport, generateBatchDetails } from '@/lib/csvImporterUtils';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({ data: { path: 'user123/test.csv' }, error: null })),
        createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'https://signed.url/test.csv' }, error: null })),
      })),
    },
  },
}));

it('uploads CSV to storage with correct path format', async () => {
  const file = new File(['col1,col2\nval1,val2'], 'transactions.csv', { type: 'text/csv' });
  const result = await uploadCsvToStorage(file, 'user-123');
  expect(result.path).toMatch(/^user-123\/\d+-transactions\.csv$/);
  expect(result.bucket).toBe('csv-imports');
});

it('generates signed URL with 30 second expiry', async () => {
  const url = await createSignedUrlForImport('user123/test.csv');
  expect(url).toBe('https://signed.url/test.csv');
  // Verify createSignedUrl was called with expiresIn=30
  const storage = supabase.storage.from('csv-imports');
  expect(storage.createSignedUrl).toHaveBeenCalledWith('user123/test.csv', 30);
});

it('generates batch details with correct statuses', () => {
  const rows = [['description', 'amount', 'date'], ['Starbucks', '-5.75', '2024-01-15']];
  const parsedTransactions = [
    { description: 'Starbucks', amount: 5.75, date: '2024-01-15', category: 'Coffee & Snacks' }
  ];
  const details = generateBatchDetails(rows, {
    0: { status: 'skipped', reason: 'Header row' }
  }, 'batch-id-123');
  
  expect(details).toHaveLength(2);
  expect(details[0].status).toBe('skipped');
  expect(details[1].status).toBe('imported');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/csvImporterUtils.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement utility functions**

```typescript
// src/lib/csvImporterUtils.ts
export async function uploadCsvToStorage(file: File, userId: string): Promise<{ path: string; bucket: string }>

export async function createSignedUrlForImport(storagePath: string): Promise<string>  // uses createSignedUrl with 30s expiry

export function generateBatchDetails(
  rows: string[][],
  rowStatuses: Record<number, { status: ImportBatchDetailStatus; reason?: string; matchedTransactionId?: string }>,
  batchId: string
): ImportBatchDetailInsert[]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/csvImporterUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/csvImporterUtils.ts tests/unit/csvImporterUtils.test.ts
git commit -m "feat: add CSV import utility functions"
```

---

### Task 5: Create Server-Side Undo Function

**Files:**
- Create: `supabase/migrations/20251016000001_create_import_functions.sql`

**Interfaces:**
- Consumes: `import_batches`, `import_batch_details`, `transactions` tables from Task 1
- Produces: `cleanup_import_batch` stored procedure

- [ ] **Step 1: Write migration SQL**

```sql
-- Atomic undo function: deletes transactions, details, and the batch record
-- Must set search_path = public per AGENTS.md invariant #2
CREATE OR REPLACE FUNCTION public.cleanup_import_batch(p_batch_id UUID, p_user_id UUID)
RETURNS TABLE(deleted_transaction_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn_ids UUID[];
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM public.import_batches WHERE id = p_batch_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Import batch not found or not owned by user';
  END IF;

  -- Collect transaction IDs to delete
  SELECT array_agg(id) INTO v_txn_ids
  FROM public.transactions
  WHERE import_batch_id = p_batch_id;

  -- Delete transactions (CASCADE handles linked transactions via FK)
  DELETE FROM public.transactions WHERE import_batch_id = p_batch_id;

  -- Delete import batch details
  DELETE FROM public.import_batch_details WHERE import_batch_id = p_batch_id;

  -- Delete the batch record (also removes stored CSV from storage via trigger if added later)
  DELETE FROM public.import_batches WHERE id = p_batch_id;

  RETURN QUERY SELECT v_txn_ids;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_import_batch(UUID, UUID) FROM anon, authenticated, PUBLIC;
```

- [ ] **Step 2: Verify migration applies**

Run: `supabase db push`
Expected: Function created successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20251016000001_create_import_functions.sql
git commit -m "feat: add atomic cleanup_import_batch stored procedure"
```

---

### Task 6: Modify useTransactions Hook

**Files:**
- Modify: `src/hooks/useTransactions.ts`

**Interfaces:**
- Consumes: `transactionSchema` from `src/lib/validation.ts` (now includes `import_batch_id`)
- Produces: Transaction queries include `import_batch_id`; `useAddMultipleTransactions` accepts optional `importBatchId`

- [ ] **Step 1: Update Transaction interface**

Add `import_batch_id: string | null;` to the `Transaction` interface in `useTransactions.ts`.

- [ ] **Step 2: Update useTransactions query**

Modify the query to not need explicit changes since it uses `select('*')` which will automatically include `import_batch_id` after the migration.

- [ ] **Step 3: Update useAddMultipleTransactions**

Modify the mutation to accept an optional `importBatchId` parameter and include it in inserts:

```typescript
export const useAddMultipleTransactions = (importBatchId?: string) => {
  // In mutationFn:
  const validated = transactions.map((t) => {
    const v = transactionSchema.parse({ ...t });
    return {
      ...v,
      import_batch_id: importBatchId ?? null,
      user_id: user.id,
    };
  });
  // ... rest of insert logic
};
```

- [ ] **Step 4: Add test**

Already covered by existing tests. Add a new test to verify `import_batch_id` is included:

```typescript
// In tests/unit/transactionPayloads.test.ts or new test
it('useAddMultipleTransactions accepts optional importBatchId', () => {
  // Verify that when importBatchId is provided, transactions have import_batch_id set
});
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTransactions.ts
git commit -m "feat: add import_batch_id support to transactions hook"
```

---

### Task 7: Implement Import Undo Hook

**Files:**
- Modify: `src/hooks/useImportBatches.ts`
- Test: `tests/unit/useImportBatches.test.ts` (add undo tests)

**Interfaces:**
- Consumes: `cleanup_import_batch` stored procedure from Task 5; `ImportBatch` interface from Task 2
- Produces: `useUndoImport` hook that safely deletes transactions and import records

- [ ] **Step 1: Write failing tests for undo**

```typescript
it('undoImport deletes transactions and import batch via stored procedure', async () => {
  const { result } = renderHook(() => useUndoImport());
  
  // Mock rpc to return deleted transaction IDs
  (supabase.rpc as jest.Mock).mockReturnValue({
    data: ['txn-1', 'txn-2'],
    error: null,
  });

  const deletedIds = await result.current.mutateAsync('batch-123');
  
  expect(supabase.rpc).toHaveBeenCalledWith('cleanup_import_batch', {
    p_batch_id: 'batch-123',
    p_user_id: 'user-123',
  });
  expect(deletedIds).toEqual(['txn-1', 'txn-2']);
});

it('undoImport invalidates caches after successful deletion', async () => {
  const { result } = renderHook(() => useUndoImport());
  await result.current.mutateAsync('batch-123');
  
  // Verify invalidateQueries was called for transactions, import_batches, and accounts
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/useImportBatches.test.ts`
Expected: FAIL - tests reference `useUndoImport` which doesn't exist yet

- [ ] **Step 3: Implement `useUndoImport` hook**

```typescript
export const useUndoImport = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (batchId: string): Promise<string[]> => {
      if (!user) throw new Error('You must be logged in');
      
      const { data, error } = await supabase.rpc('cleanup_import_batch', {
        p_batch_id: batchId,
        p_user_id: user.id,
      });
      
      if (error) throw error;
      return data as string[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['import_batches'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/useImportBatches.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useImportBatches.ts tests/unit/useImportBatches.test.ts
git commit -m "feat: implement import undo with stored procedure"
```

---

### Task 8: Enhance CSVImporter with Import Tracking

**Files:**
- Modify: `src/components/dashboard/CSVImporter.tsx`
- Modify: `src/lib/csvImporterUtils.ts` (add `downloadCsvFromStorage` helper)
- Test: Add to `tests/unit/csvImporterUtils.test.ts`

**Interfaces:**
- Consumes: `useCreateImportBatch`, `useUpdateImportBatch` from Task 3; `uploadCsvToStorage`, `createSignedUrlForImport`, `generateBatchDetails` from Task 4; `useAddMultipleTransactions` from `useTransactions` (now accepts optional `importBatchId`)
- Produces: CSVImporter creates import batch on file upload, stores CSV in Supabase Storage, tracks row-level status

- [ ] **Step 1: Write failing test**

```typescript
it('downloadCsvFromStorage returns blob for CSV file', async () => {
  const blob = await downloadCsvFromStorage('user123/test.csv');
  expect(blob).toBeInstanceOf(Blob);
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Add `downloadCsvFromStorage` to csvImporterUtils.ts**

```typescript
export async function downloadCsvFromStorage(storagePath: string): Promise<Blob> {
  const url = await createSignedUrlForImport(storagePath);
  const response = await fetch(url);
  return await response.blob();
}
```

- [ ] **Step 4: Modify CSVImporter.tsx**

In `CSVImporter.tsx`:

1. Add state for `importBatchId`:
```typescript
const [importBatchId, setImportBatchId] = useState<string | null>(null);
```

2. Add hooks:
```typescript
const createImportBatch = useCreateImportBatch();
const updateImportBatch = useUpdateImportBatch();
const { user } = useAuth();
```

3. In `handleFileUpload` (after CSV parsing succeeds):
```typescript
// After parsing CSV rows:
const uploadResult = await uploadCsvToStorage(file, user.id);
const batchId = await createImportBatch.mutateAsync({
  filename: file.name,
  file_size: file.size,
  storage_bucket: uploadResult.bucket,
  storage_path: uploadResult.path,
  total_rows: rows.length - 1, // exclude header
  parsed_count: 0,
});
setImportBatchId(batchId);
```

4. In `parseTransactions` (after parsing and dedup classification):
```typescript
// Update import batch with parsed count
await updateImportBatch.mutateAsync({
  batchId,
  updates: { parsed_count: success.length }
});
```

5. In `importTransactions` (after successful insert):
```typescript
// Update import batch with final counts
await updateImportBatch.mutateAsync({
  batchId,
  updates: {
    imported_count: toImport.length,
    skipped_count: skippedCount,
    duplicate_count: dedupCounts.duplicate + dedupCounts.ambiguous,
    status: skippedCount > 0 ? 'partial' : 'completed',
  }
});
```

6. Pass `importBatchId` to `useAddMultipleTransactions`:
```typescript
const addTransactionsMutation = useAddMultipleTransactions(importBatchId ?? undefined);
```

7. Generate batch details during `importTransactions`:
```typescript
const details = generateBatchDetails(csvData, rowStatuses, importBatchId);
// Insert details via supabase.from('import_batch_details').insert(details)
```

- [ ] **Step 5: Run existing tests**

Run: `npm run test:unit`
Expected: PASS all tests

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/CSVImporter.tsx src/lib/csvImporterUtils.ts tests/unit/csvImporterUtils.test.ts
git commit -m "feat: integrate import tracking and storage into CSV importer"
```

---

### Task 9: Create ImportHistoryViewer Component

**Files:**
- Create: `src/components/dashboard/ImportHistoryViewer.tsx`
- Test: `tests/unit/importHistoryViewer.test.tsx`

**Interfaces:**
- Consumes: `useImportBatches`, `useImportBatchDetails`, `useUpdateImportBatch`, `useUndoImport` from `src/hooks/useImportBatches.ts`; `useAuth` from `src/contexts/AuthContext`
- Produces: UI component showing import history list, detail view, undo functionality, CSV download

- [ ] **Step 1: Write failing test**

```tsx
// tests/unit/importHistoryViewer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportHistoryViewer from '@/components/dashboard/ImportHistoryViewer';

vi.mock('@/hooks/useImportBatches', () => ({
  useImportBatches: () => ({
    data: [
      { id: 'batch-1', filename: 'transactions.csv', total_rows: 42, parsed_count: 40,
        imported_count: 35, skipped_count: 2, duplicate_count: 5, status: 'completed',
        import_timestamp: '2025-10-15T10:00:00Z', storage_path: 'user/test.csv' },
    ],
    isLoading: false,
  }),
  useImportBatchDetails: () => ({
    data: [{ row_number: 1, status: 'imported', original_data: {}, parsed_transaction: {} }],
    isLoading: false,
  }),
  useUndoImport: () => ({ mutateAsync: vi.fn(() => Promise.resolve(['txn-1'])), isPending: false }),
}));

it('renders import history list', () => {
  render(<ImportHistoryViewer />);
  expect(screen.getByText('Import History')).toBeInTheDocument();
  expect(screen.getByText('transactions.csv')).toBeInTheDocument();
  expect(screen.getByText('35 imported')).toBeInTheDocument();
});

it('shows details when import batch clicked', async () => {
  render(<ImportHistoryViewer />);
  await fireEvent.click(screen.getByText('transactions.csv'));
  expect(screen.getByText('Row 1')).toBeInTheDocument();
  expect(screen.getByText('imported')).toBeInTheDocument();
});

it('calls undo when undo button clicked', async () => {
  const mockUndo = vi.fn(() => Promise.resolve(['txn-1']));
  vi.mocked(useUndoImport).mockReturnValue({ mutateAsync: mockUndo, isPending: false } as any);
  
  render(<ImportHistoryViewer />);
  await fireEvent.click(screen.getByText('Undo Import'));
  // Confirm dialog
  await fireEvent.click(screen.getByTestId('confirm-undo'));
  await waitFor(() => expect(mockUndo).toHaveBeenCalledWith('batch-1'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/importHistoryViewer.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ImportHistoryViewer component**

Component structure:
1. **Import History List** (`useImportBatches` data):
   - Each row shows: filename, import date, stats (total/parsed/imported/skipped/duplicates), status badge
   - Click row to expand detail view
   - "Undo Import" button with confirmation dialog
   - "Download CSV" button (uses `createSignedUrlForImport`)

2. **Import Detail View** (`useImportBatchDetails` data):
   - Tabs: "All Rows" | "Imported" | "Skipped" | "Duplicates"
   - Table: Row # | Original Data | Parsed Data | Status | Reason | Matched Transaction
   - For duplicates/ambiguous: show matched transaction details

3. **Undo Confirmation Dialog**:
   - Shows number of transactions to be deleted
   - Warning about balance impacts
   - Cancel / Confirm buttons

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/importHistoryViewer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ImportHistoryViewer.tsx tests/unit/importHistoryViewer.test.tsx
git commit -m "feat: add import history viewer component"
```

---

### Task 10: Add Import History to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `ImportHistoryViewer` from Task 9, `CSVImporter` (already in Dashboard)
- Produces: Dashboard import tab shows both importer and history viewer

- [ ] **Step 1: Add ImportHistoryViewer to Dashboard**

In `src/pages/Dashboard.tsx`, in the import TabsContent (around line 157), add ImportHistoryViewer below CSVImporter:

```tsx
<TabsContent value="import" className="space-y-6">
  <CSVImporter />
  <ImportHistoryViewer />
</TabsContent>
```

And add the import at the top of the file:
```typescript
import ImportHistoryViewer from '@/components/dashboard/ImportHistoryViewer';
```

- [ ] **Step 2: Run tests**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add import history viewer to dashboard"
```

---

### Task 11: Add Transaction Source Tracking to Transaction Table

**Files:**
- Modify: `src/components/dashboard/StaticTransactionRow.tsx`
- Modify: `src/components/dashboard/TransactionTable.tsx`
- Test: `tests/unit/transactionTable.test.tsx`

**Interfaces:**
- Consumes: `Transaction` interface from `useTransactions.ts` (now includes `import_batch_id`), `useImportBatch` hook from Task 3
- Produces: Transaction rows show import source filename when `import_batch_id` is not NULL

- [ ] **Step 1: Write failing test**

```tsx
// tests/unit/transactionTable.test.tsx
import { render, screen } from '@testing-library/react';
import StaticTransactionRow from '@/components/dashboard/StaticTransactionRow';

it('shows import source when import_batch_id is present', () => {
  const txn = {
    id: '1',
    description: 'Starbucks',
    amount: 5.75,
    date: '2025-10-15',
    category: 'Coffee & Snacks',
    type: 'expense',
    transaction_type: 'expense',
    status: 'posted',
    account_id: null,
    import_batch_id: 'batch-123',
    import_batch: { filename: 'transactions.csv' },
  };
  render(
    <StaticTransactionRow
      transaction={txn}
      isSelected={false}
      onSelectOne={vi.fn()}
      onDelete={vi.fn()}
      getCategoryColor={() => '#000'}
      getParentCategory={() => 'Food & Dining'}
      getAccountName={() => '—'}
    />
  );
  expect(screen.getByText('From: transactions.csv')).toBeInTheDocument();
});

it('does not show import source when import_batch_id is null', () => {
  const txn = { id: '1', import_batch_id: null };
  render(
    <StaticTransactionRow
      transaction={txn}
      isSelected={false}
      onSelectOne={vi.fn()}
      onDelete={vi.fn()}
      getCategoryColor={() => '#000'}
      getParentCategory={() => 'Food & Dining'}
      getAccountName={() => '—'}
    />
  );
  expect(screen.queryByText(/From:/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/transactionTable.test.tsx`
Expected: FAIL

- [ ] **Step 3: Modify `useTransactions` query to include import batch**

In `src/hooks/useTransactions.ts`, modify the query to join with `import_batches`:
```typescript
// Change query to:
const { data, error } = await supabase
  .from('transactions')
  .select('*, import_batches(filename, import_timestamp)')
  .order('date', { ascending: false });
```

This will return transactions with a nested `import_batches` object containing `filename` and `import_timestamp`.

- [ ] **Step 4: Modify `Transaction` interface**

Add to the `Transaction` interface in `useTransactions.ts`:
```typescript
import_batches?: { filename: string; import_timestamp: string };
```

- [ ] **Step 5: Modify `StaticTransactionRow.tsx`**

Add import source display after the description cell:
```tsx
{transaction.import_batches?.filename && (
  <span className="text-xs text-muted-foreground">
    From: {transaction.import_batches.filename}
  </span>
)}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/transactionTable.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTransactions.ts src/components/dashboard/StaticTransactionRow.tsx tests/unit/transactionTable.test.tsx
git commit -m "feat: add import source tracking to transaction table"
```

---

### Task 12: Final Integration and Verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `npm run test:unit`
Expected: All tests PASS

- [ ] **Step 3: Run full test suite**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: final integration and verification"
```

---

## Dependencies

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 8 → Task 9 → Task 10
                                     ↓                   ↗     ↗
                                Task 7 → Task 11
```

- Task 1 (schema) must complete before any hooks/components can reference new tables
- Task 2 (types/schemas) is needed by Tasks 3, 4, 6, 7, 8, 9
- Task 3 (hooks) needed by Tasks 6, 7, 8, 9
- Task 4 (utilities) needed by Task 8
- Task 5 (stored procedure) needed by Task 7 (undo hook)
- Task 6 (transaction hook update) needed by Task 8 (CSVImporter integration) and Task 11 (query join)
- Task 7 (undo hook) needed by Task 9 (viewer component)
- Task 8 (CSVImporter enhancement) needed by Task 9 and Task 10
- Task 11 depends on Task 6 (transaction query update)
- Task 12 is final verification and cleanup

## Review Focus (from top-level section)

1. **Duplicate import detection** → Test in Task 8: verifies `generateBatchDetails` produces status='duplicate' for rows matching existing transactions, and import proceeds correctly.
2. **Partial import recovery** → Test in Task 8: verifies import batch is updated with `status: 'partial'` when some rows are skipped, and all transactions are linked to the batch even on partial completion.
3. **Undo safety for transfers** → Test in Task 7: verifies `cleanup_import_batch` stored procedure deletes transactions and handles `linked_transaction_id` FK relations correctly via DELETE CASCADE.
4. **Storage URL security** → Test in Task 4: verifies `createSignedUrlForImport` calls Supabase Storage with 30-second expiry, preventing indefinite access to stored CSVs.
5. **Transaction tracing** → Test in Task 11: verifies transaction list shows import source filename for transactions with `import_batch_id`, and shows nothing for transactions with NULL `import_batch_id`.
