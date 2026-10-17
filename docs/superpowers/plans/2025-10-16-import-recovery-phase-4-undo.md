# Phase 4 — Audited Undo (Merged)

Includes original Tasks 5 (stored proc) and 7 (undo hook), adjusted: preserve batch, idempotent repeated undo, transfer/edit policies.

## Task 5: cleanup_import_batch RPC (revised)
See detailed SQL in phase-2 file. Key: ownership check, edited guard (p_force), transfer leg handling, mark is_undone with undo metadata, do NOT delete batch/details, idempotent repeated calls.

## Task 7: useUndoImport Hook (original, adjusted)
- Calls rpc with p_batch_id, p_user_id, p_force.
- Returns deleted IDs.
- Invalidates transactions, import_batches, accounts.
- Tests verify RPC params and cache invalidation.

Commit.
