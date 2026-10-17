# Strengthening the import recovery plan

My overall assessment: the plan has a solid foundation, but I would not hand it to an implementation agent yet. It covers the right user-facing capabilities and proposes a reasonable starting architecture. However, several gaps could lead to exactly the problems this feature is meant to prevent: duplicate transactions, incomplete recovery, unsafe deletion, misleading import statuses, or loss of the audit trail.

I would strengthen it around one central principle:

> An import is a durable financial operation with a lifecycle, not a CSV upload followed by a series of unrelated database writes.

That principle should drive the database model, processing strategy, undo semantics, retry behavior, security rules, and tests.

## 1. The most important gaps

1. Undo currently destroys the audit trail

CriticalThe proposed `cleanup_import_batch` deletes transactions, row details, and the import batch itself. Afterward, the user can no longer see which file was imported, why it was undone, or what the operation affected. The function also doesn't actually guarantee safe handling of linked transfer transactions.

2. Importing is not atomic or safely recoverable

CriticalThe plan inserts transactions, row details, and batch counts through separate operations. If one succeeds and another fails, the database can represent contradictory states. There is no reliable recovery protocol for a crash between these writes.

3. Idempotency is specified but not implemented

CriticalLinking transactions to a batch does not prevent the same file from creating a second batch of duplicate transactions. The plan lacks a durable retry key, a database-enforced concurrency strategy, and a precise distinction between a repeated import and two legitimate purchases with identical details.

4. The security model has gaps

CriticalRow-level policies cover some read and write paths, but the undo function accepts a caller-supplied user ID, has a broad `SECURITY DEFINER` capability, and doesn't explicitly revoke or restrict all relevant privileges. Storage policies also need correct path extraction and bucket-level restrictions.

5. Row-level statuses don't represent the full lifecycle

The plan has `imported`, `skipped`, `duplicate`, and `ambiguous`, but no explicit invalid, failed, pending, or processing states. It also lacks a defined distinction between parsing errors, validation errors, database errors, and duplicate matches.

6. Provenance can disappear or become misleading

`ON DELETE SET NULL` severs the link from a transaction to its import. A filename join alone isn't a permanent audit record, and displaying a source in every transaction row may add visual clutter without giving users useful recovery controls.

These are architectural gaps, not just missing UI polish. I would resolve them before implementation.

## 2. Fix the undo model first

This is the biggest conceptual issue in the current plan.

The existing function is named `cleanup_import_batch`, and its behavior is effectively permanent deletion of the import's history. But the feature requirement is undo an import while preserving the ability to audit it.

Those are different operations.

### Recommended behavior

- Preserve the `import_batches` record after undo.
- Preserve its row details and original file reference, subject to a clearly defined retention policy.
- Mark the batch `undone`, recording when and why the undo occurred.
- Record which transactions were reversed or deleted and how many were affected.
- Make undo idempotent: a second request returns the existing outcome instead of performing a second destructive operation.
- Restrict the operation to the authenticated owner of the batch.

I would replace `cleanup_import_batch` with a name such as `undo_import_batch`.

### Should undo delete the transactions?

There are two viable models:

### Option A: Delete imported transactions, preserve import history

MVP candidate

Transactions created exclusively by that batch are deleted, but the batch and its audit details remain. The detail rows record that their imported transactions were undone.

This is relatively simple and works well if transactions do not need a permanent financial ledger.

### Option B: Soft-delete or reverse transactions

Imported transactions remain in the database with an explicit reversal state, or a separate reversal record is created.

This gives you a stronger historical record, but requires every transaction query, report, budget calculation, and balance calculation to handle reversed transactions correctly.

My recommendation: use Option A for the first release if it fits your existing data model, while retaining a durable batch and undo record. Do not introduce soft deletion throughout the entire transaction system unless you genuinely need ledger-grade reversibility.

There is one important complication: transactions may have been edited, linked to transfers, or referenced by other records after import. The undo function must define what happens in these cases. It must not blindly delete user-modified transactions or unrelated records.

For linked transfers, explicitly inspect the existing relationship and deletion behavior. Do not assume that deleting one side will cascade correctly to the other. The current plan's claim that a foreign key cascade will handle both sides is not established by the provided schema.

## 3. Make the import lifecycle explicit

The proposed `import_batches.status` is too limited. It uses `completed`, `failed`, and `partial`, while other parts of the plan expect `pending`. A batch needs to represent what is happening now, not just how it ended.

I would define the batch lifecycle as follows:

mermaid
```

stateDiagram-v2
    [*] --> Uploaded
    Uploaded --> Processing
    Uploaded --> Failed
    Processing --> Completed
    Processing --> PartiallyCompleted
    Processing --> Failed
    Processing --> Interrupted
    Interrupted --> Processing: Retry
    Failed --> Processing: Retry
    PartiallyCompleted --> Processing: Retry
    Completed --> Undone: Undo
    PartiallyCompleted --> Undone: Undo
    Failed --> Undone: Undo if transactions exist
```

Suggested persistent statuses:

- `uploaded` — the source file has been stored and the batch record created.
- `processing` — the import is actively being processed.
- `completed` — all eligible rows have been handled successfully, including rows intentionally skipped.
- `partially_completed` — some rows imported, but one or more rows remain failed or unresolved.
- `failed` — processing failed before a successful outcome could be completed.
- `interrupted` — the process stopped unexpectedly and needs reconciliation or retry.
- `undone` — the batch's imported transactions have been reversed.

The exact state names can differ, but the meanings must be consistent.

A key distinction: a completed import can contain skipped rows. Skipping a duplicate or an intentionally ignored row is not necessarily a failure. Conversely, a batch with five imported rows and three failed rows is not fully completed just because the insert operation returned success for five rows.

Store a stable error code and useful human-readable error message at the row level. Avoid relying exclusively on one `error_message` for the whole batch.

## 4. Implement idempotency as a database-backed guarantee

The current plan focuses on identifying duplicates during CSV processing. That is necessary, but not sufficient.

Imagine this sequence:

1. The app uploads a CSV and creates batch A.
2. Ten transactions are inserted.
3. The browser loses its connection before receiving the response.
4. The user clicks Import again.
5. The app creates batch B and processes the same ten rows again.

A frontend duplicate check alone cannot guarantee safety in this scenario.

### What I would change

Use three distinct mechanisms:

1. Batch identity: assign each logical import operation a stable idempotency key. Repeated submissions for the same operation must reuse the same batch rather than create independent batches.
2. Row identity: assign each source row a stable identity within the batch, for example a combination of batch ID and source row number. Enforce uniqueness in the database.
3. Transaction identity: use a source-provided transaction ID when available. Otherwise, use the existing deduplication logic as a matching mechanism, not as an unquestionable unique key.

The database must enforce the invariants that matter. Application checks can improve the experience, but concurrent requests can bypass checks that aren't protected by constraints or locking.

### Important distinction: exact file versus duplicate transactions

There are two different situations:

- The exact same file is uploaded again. The system should recognize the repeat and avoid creating another set of transactions.
- A new file contains some transactions already imported from an earlier file, alongside new transactions. The system should import the new transactions and classify the existing matches appropriately.

These should not necessarily create identical UI outcomes. The second case is a legitimate new import attempt with some duplicates; the first is a repeated operation.

Also, identical amounts and dates do not prove that two transactions are duplicates. Your existing ±3-day matching window and exact bucket category matching must be preserved, but ambiguous matches should not silently delete or discard legitimate purchases.

## 5. Make interrupted imports recoverable

The plan's partial-import recovery requirement is good, but it needs an explicit recovery protocol.

I would not assume the browser will always finish processing the CSV. A tab can close, a network request can time out, or the database can accept a write even when the client sees an error.

A safer design is:

1. Persist the batch and the parsed row records.
2. Mark the batch as processing.
3. Process rows in a controlled way, recording the outcome of each row.
4. Ensure the transaction insert and corresponding row-status update cannot permanently disagree.
5. On retry, reconcile existing transactions and row outcomes before inserting anything again.
6. Finalize the batch status from the actual persisted results, not just from frontend counters.

For a small CSV, a single database transaction or server-side RPC could handle a suitable portion of this workflow atomically. For larger files, use a resumable, chunked process with idempotent row operations.

The correct choice depends on the current import architecture and expected file sizes. I would inspect the existing code before deciding to move all CSV processing server-side.

One more issue: if uploading the file succeeds but creating the batch record fails, or vice versa, the system can leave orphaned files or incomplete history. Define cleanup and reconciliation for these cases, too.

## 6. Fix the security model before building the hooks

The plan says to use the anon key only, which is consistent with your stated constraints. However, using the anon key does not itself make an operation secure. Authorization must be enforced by PostgreSQL, RLS, and the function's privileges.

There are four specific issues to address.

### A. Remove the caller-supplied user ID from undo

The proposed function accepts both `p_batch_id` and `p_user_id`. It then checks whether the batch belongs to the supplied user ID.

That is unsafe if an authenticated caller can supply another user's ID. The function should derive the user identity from the authenticated session, typically with `auth.uid()`, and independently verify ownership of the batch.

For a `SECURITY DEFINER` function, explicitly:

- Set a safe `search_path`, as required by your project.
- Check `auth.uid()` and reject unauthenticated calls.
- Verify batch ownership using the authenticated identity.
- Restrict `EXECUTE` privileges to the intended role.
- Avoid dynamic SQL and unnecessary elevated privileges.

### B. Prevent direct deletion of audit history

The current RLS policy lets users delete their own import batches. That conflicts with the requirement for durable history.

Ordinary clients should not be able to bypass the undo workflow by directly deleting a batch or its details. Restrict destructive operations to the controlled server-side operation and preserve the audit record.

### C. Correct and verify Storage policies

The bucket must remain private. Storage policies should validate the authenticated user's folder using Supabase's supported path helpers, such as `storage.foldername(name)`, and enforce the expected bucket and path structure.

Also verify that:

- Users cannot upload or download another user's files.
- Signed URLs are generated only after verifying batch ownership.
- Upload size and accepted file types are limited.
- File names and paths cannot escape the user's designated storage prefix.
- Storage retention and deletion are consistent with the import-history retention policy.

A 30-second signed URL is a reasonable security choice, but expiry alone is not a complete authorization strategy.

### D. Do not store sensitive CSV data indefinitely by accident

Original CSV files may contain account identifiers, balances, or other sensitive financial information.

Define a retention policy and make sure the UI doesn't expose raw source rows unnecessarily. The original file, parsed row JSON, and error messages all need appropriate access controls.

## 7. Strengthen the database schema

The current two-table design is a good starting point, but I would adjust it before writing migrations.

| Area | Recommended change |
| --- | --- |
| Batch status | Use a consistent lifecycle enum or constrained text values, including processing and undone states. |
| Counts | Distinguish total source rows, valid rows, imported rows, duplicate rows, skipped rows, ambiguous rows, and failed rows. |
| Row status | Add explicit pending, invalid, failed, and undone outcomes where applicable. |
| Row uniqueness | Keep `UNIQUE(import_batch_id, row_number)` and enforce the appropriate identity for retries. |
| Retry tracking | Record retry attempts or linked attempts, their timestamps, and their outcomes. |
| Undo history | Record undo timestamp, actor, outcome, and affected transaction IDs or a durable reversal record. |
| Error details | Store machine-readable error codes alongside safe, human-readable explanations. |
| File metadata | Consider a content hash, MIME type, and original file size validation. |
| Provenance | Preserve a durable batch reference and define what happens to that reference when transactions are reversed. |
| Concurrency | Add database-enforced protection against simultaneous processing and duplicate batch creation. |

### One important schema detail

The proposed `transactions.import_batch_id` foreign key uses `ON DELETE SET NULL`. That means deleting an import batch destroys transaction provenance. It is another reason not to delete batch records as part of undo.

I would also consider whether the row table should store the complete parsed transaction JSON. It is useful for recovery and debugging, but it duplicates financial data and can become inconsistent with the actual transaction record.

Store enough source information to explain and reproduce the import, but establish which fields are authoritative. The original file should be the immutable source artifact; the parsed row should be the result of a particular parser/version; the transaction should be the persisted financial record.

## 8. Redesign the UI around user questions

The proposed `ImportHistoryViewer` has useful components, but it is organized mainly around database fields. I would organize it around the questions users actually ask.

## Import history

Example of the information each batch should expose.

bank-transactions-oct.csv

Oct 15, 2026 · 120 source rows

Completed

# 108

Imported

# 8

Duplicates

# 2

Skipped

# 2

Failed

These are illustrative counts, not actual import results.

View details  Undo design

Each batch should let users:

- Inspect the source file and import timestamp.
- Filter rows by outcome.
- Understand why a row was rejected or matched an existing transaction.
- Open a matched transaction when duplicate detection was involved.
- Retry eligible failures without reimporting successful rows.
- Undo a batch with a preview of the affected transactions.
- See whether a previous undo or retry has already occurred.

I would avoid showing the source filename as a permanent extra line in every transaction table row. A source indicator in transaction details, with a link to the import record, is a better starting point. That preserves traceability without cluttering the main spending interface.

Also, don't rely on `select('*')` and an assumed nested join alone for provenance. Verify the actual Supabase relationship and query behavior, and make sure existing transaction queries continue to work.

## 9. Rewrite the testing strategy

The current plan includes tests for individual utilities and React hooks, but it needs more database-level integration tests. Mocking an RPC call does not prove that the SQL function is secure, atomic, or correct.

These are the scenarios I would require before shipping.

### Must-pass acceptance tests

0 of 12 reviewed

 Reset

[ ]Repeated importUploading the same file twice does not create another set of transactions.

[ ]Concurrent submissionsTwo simultaneous attempts cannot insert the same logical import twice.

[ ]Ambiguous duplicatesTwo legitimate purchases with identical dates and amounts are not automatically discarded.

[ ]Partial failureA failure midway through processing leaves accurate, recoverable row outcomes.

[ ]Interrupted clientA timeout after a successful database write does not cause duplicates on retry.

[ ]Selective retryPreviously successful rows are not inserted again.

[ ]Undo isolationUndo affects only transactions created by the specified batch.

[ ]Edited transactionsUndo handles modified imported transactions according to an explicit policy.

[ ]Linked transfersBoth transfer relationships remain valid, or the operation safely refuses to proceed.

[ ]Audit preservationUndo preserves the batch record and its outcome history.

[ ]AuthorizationOne user cannot read, download, retry, modify, or undo another user's import.

[ ]Storage cleanupFailed batch creation and retention cleanup do not leave uncontrolled orphan files.

I would also require tests for database constraints, RLS, the actual undo function, and retry behavior against a test database or Supabase integration environment. Unit tests remain valuable, but they cannot replace those checks.

## 10. My proposed implementation order

I would reorganize the original 12 tasks into six phases. This minimizes the risk of building a polished interface on top of an unsafe import pipeline.

1. Phase 1 — Audit the existing implementation
   Inspect `CSVImporter.tsx`, `transactionDedup.ts`, transaction relationships, transfer logic, existing database policies, and all queries that affect budgets and balances. Document the current import behavior and the invariants that must not change.
2. Phase 2 — Design the lifecycle and schema
   Finalize batch and row states, idempotency keys, row identity, audit retention, error representation, and undo semantics. Write migration and security tests before committing to the schema.
3. Phase 3 — Implement safe processing
   Persist source files and batch records, process rows with durable status updates, enforce idempotency, and implement retry and interrupted-import reconciliation.
4. Phase 4 — Implement audited undo
   Add an authenticated, database-enforced undo operation that handles transfer relationships, edited transactions, and repeated requests safely.
5. Phase 5 — Build the user experience
   Add import history, row inspection, source tracing, retry actions, download controls, and a clear undo confirmation flow.
6. Phase 6 — Verify end to end
   Run unit, integration, RLS, failure-injection, and regression tests. Verify that existing transaction, categorization, transfer, and budget behavior remains correct.

I would also change the original instruction to the agent: don't assume the proposed file structure, database schema, or hook signatures are correct until it has inspected the repository. Keep the implementation consistent with the actual architecture.

## 11. Let's settle the key product decisions before implementation

There are a few choices that affect the entire design. My suggested defaults are selected to keep the first version useful without turning it into a full accounting ledger.

### 1. What should undo do?

delete\_audit Delete imported transactions but preserve the batch and audit history. (Recommended)

Keep transactions with a reversed or deleted state.

### 2. What should happen when the same file is imported again?

mixed Recognize exact repeated imports and separately detect transaction-level duplicates. (Recommended)

Detect only identical files; let the existing transaction deduplication handle everything else.

Always create a new attempt and ask the user to review potential duplicates.

### 3. How long should original CSV files be retained?

indefinite Keep files until the user deletes them or their account is deleted.

Retain files for a defined period, then keep metadata and row-level audit history.

Keep import metadata and row details, but not the original file after processing.

### 4. How should retries work?

same\_batch Retry eligible rows in the existing batch and preserve attempt history. (Recommended)

Create a separate linked attempt for every retry.

### 5. What if a transaction has been edited since import?

protect Protect edited transactions from automatic deletion and explain the conflict. (Recommended)

Delete every transaction created by the batch, including subsequently edited transactions.

Show a review list of all affected transactions before undo.

 Refine the implementation plan

My strongest recommendation: settle undo semantics, duplicate identity, and file retention first. Those three decisions shape the database schema and recovery guarantees. Once they're settled, the remaining work becomes much easier to implement without reworking the architecture halfway through.