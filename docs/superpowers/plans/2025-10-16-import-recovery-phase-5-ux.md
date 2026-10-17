# Phase 5 — User Experience (Merged)

Includes original Tasks 9 (ImportHistoryViewer), 10 (Dashboard), 11 (Transaction source tracking), adjusted: source indicator in details drawer, retry action, audit-preserving undo UI.

## Task 9: ImportHistoryViewer
- List with counts (total/valid/imported/duplicate/skipped/ambiguous/failed), status badge.
- Detail tabs: All/Imported/Skipped/Duplicates/Failed/Ambiguous.
- Retry eligible failures, Undo with preview + confirmation, Download CSV (30s signed URL).
- Preserve batch on undo (no removal from history; show undone state).

## Task 10: Dashboard integration
- Add ImportHistoryViewer below CSVImporter in import tab.

## Task 11: Transaction Source Tracking
- useTransactions query join import_batches.
- Transaction interface includes import_batches.
- StaticTransactionRow shows "From: {filename}" only in details drawer (avoid clutter), link to batch.
- Null import_batch_id shows nothing.

Commit.
