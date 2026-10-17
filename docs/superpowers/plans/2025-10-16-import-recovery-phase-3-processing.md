# Phase 3 — Safe Processing (Merged)

Includes original Tasks 3 (hooks), 4 (utils), 6 (useTransactions), 8 (CSVImporter integration), adjusted for idempotency and recoverability.

## Task 3: Import Batch Hooks (original, extended)
Create `src/hooks/useImportBatches.ts` with:
- useImportBatches, useImportBatch, useImportBatchDetails
- useCreateImportBatch (inserts with idempotency_key; on conflict returns existing batch id)
- useUpdateImportBatch
- useRetryImport (reconciles pending/failed rows; increments retry_count)
Keep original test expectations, plus idempotency test.

## Task 4: CSV Import Utilities (original, extended)
Create `src/lib/csvImporterUtils.ts`:
- uploadCsvToStorage(file, userId) -> path format `{userId}/{timestamp}-{filename}`
- createSignedUrlForImport(path) -> 30s expiry
- generateBatchDetails(rows, rowStatuses, batchId)
- downloadCsvFromStorage(path) -> Blob
- computeContentHash(file) -> sha256
Add tests including 30s expiry verification and idempotency.

## Task 6: useTransactions Hook (original)
- Add import_batch_id to Transaction interface and import_batches nested join.
- useAddMultipleTransactions accepts optional importBatchId.
- Query uses select('*, import_batches(filename, import_timestamp)').

## Task 8: CSVImporter Integration (original, adjusted)
- Generate idempotency_key + content hash on file select.
- Check existing batch by (user_id, idempotency_key/content_hash); reuse if exists.
- Create batch status 'processing' with pending details.
- Process rows, update row statuses durably.
- On retry, reconcile existing transactions before insert.
- Finalize status from persisted results.
- Orphan cleanup on failure.

Commit per original. Tests pass.
