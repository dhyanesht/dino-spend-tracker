
# Overlap-Safe CSV Import — Brainstorm + Plan

## The Problem

Bank/credit-card CSVs are exported as date ranges. When you re-import an overlapping range, you get duplicates. But "duplicate" is fuzzy because:

- **True duplicates**: same date + amount + merchant → already imported.
- **Legitimate twins**: two $4.75 Starbucks charges on the same day at the same store. Not duplicates.
- **Boundary churn**: a transaction posted on Mar 15 in batch 1 may have a slightly different date or description on batch 2 (pending → posted, "AMZN Mktp" → "Amazon.com").
- **Late arrivals**: new Mar 1–15 transactions may exist in batch 2 that weren't in batch 1 (refunds, posted-after-export charges).

A naive `WHERE date=X AND amount=Y AND description=Z` filter both **misses fuzzy dupes** and **drops legitimate twins**.

## Brainstorm — Strategies

### 1. Fingerprint hash (fast, exact)
Compute `sha256(date | amount | normalized_description)` per row, store on the transaction, and reject rows whose fingerprint already exists. Great for byte-identical re-uploads, fails when the bank tweaks the description between exports.

### 2. Fuzzy match within a date window (recommended core)
For each incoming row, look for an existing transaction where:
- `amount` is exactly equal,
- `date` is within ±N days (default 3),
- normalized description is similar (Levenshtein/Jaro ≥ 0.85, or shared store token).

If 1 match → duplicate. If 0 → new. If multiple incoming rows match the same existing one → only first is a dupe (handles legitimate twins).

### 3. Per-import "occurrence counting" (handles twins correctly)
Group both existing and incoming transactions by `(date, amount, store_token)`. If existing has 1 Starbucks $4.75 on Mar 10 and incoming has 2, import only 1 (the net new one). This is the key insight that makes overlap-safe work without losing real repeated charges.

### 4. Date-range overlap detection (UX layer)
Detect min/max date of the upload, query existing transactions in that range, and tell the user: *"This file overlaps Mar 1–15 with 47 existing transactions. 42 already match — 5 look new."* Let them confirm before insert.

### 5. Review screen with three buckets
After parsing, show:
- **New** (will import) — green, checked by default
- **Likely duplicate** (skip) — gray, unchecked, with link to existing row
- **Ambiguous** (manual decision) — yellow, user picks per row

User can flip any row before clicking Import.

### 6. Import batches / undo
Tag every imported row with an `import_batch_id` so a bad import can be undone in one click. Cheap insurance while we tune the dedup logic.

### 7. Description normalization (foundation)
Reuse existing `extractStoreName` + `cleanTransactionDescription`, plus: lowercase, strip dates/order numbers/`#1234`, collapse whitespace. Store normalized form for matching, keep original for display.

## Recommended Approach

Combine **#3 (occurrence counting) + #2 (fuzzy window) + #5 (review screen) + #6 (import batches)**. Skip #1 — fingerprints are too brittle once banks rename merchants.

### Algorithm

```text
1. Parse CSV → incoming[] (already done).
2. Compute upload date range [minD, maxD]. Expand by ±3 days.
3. Fetch existing transactions in that range (one query).
4. Build a multimap keyed by (date, amount, normalized_store):
     existingBuckets[key] = count
5. For each incoming row:
   a. key = (date, amount, normalized_store)
   b. If existingBuckets[key] > 0  → mark DUPLICATE, decrement.
   c. Else look for fuzzy match within ±3 days, same amount,
      description similarity ≥ 0.85 → mark LIKELY_DUPLICATE.
   d. Else → mark NEW.
6. Show review screen with three buckets + counts.
7. On confirm: insert only NEW + user-overridden rows, tagged with
   import_batch_id + import_source.
```

### Why this handles all the edge cases

- **Mar 1–15 re-upload**: every row hits an existing bucket → all skipped.
- **Twin Starbucks**: existing has 1, incoming has 2 → 1 dupe + 1 new. Correct.
- **Mar 15 late posts**: bucket for known charges fills up; truly new charges fall through to NEW.
- **"AMZN Mktp" vs "Amazon.com"**: same normalized store token → bucket match.
- **Pending date shift**: ±3 day window catches it.

## Plan of Work

### Phase 1 — Data + utilities
- Add `import_batch_id uuid`, `import_source text`, `normalized_description text` columns to `transactions` (migration). All nullable; backfill `normalized_description` once.
- New `src/lib/transactionDedup.ts`:
  - `normalizeDescription(raw)` — reuse store extraction + extra cleanup.
  - `levenshteinRatio(a, b)` — small inline implementation.
  - `classifyIncoming(incoming, existing, { dateWindowDays:3, similarity:0.85 })` → returns `{ new[], duplicate[], ambiguous[] }`.
- Unit-friendly pure functions (no React).

### Phase 2 — Review UI in CSVImporter
- After `parseTransactions`, fetch existing rows in the date window and run `classifyIncoming`.
- New step in the dialog ("Review duplicates") with three collapsible sections + counts and a per-row checkbox.
- Each "duplicate" row shows the matching existing row inline (date, amount, desc) so the user can verify.
- "Import N transactions" button only inserts checked rows.

### Phase 3 — Batch tagging + Undo
- `useAddMultipleTransactions` accepts an optional `importBatchId`; CSVImporter generates one per import.
- Toast after import: "Imported 42 transactions. Undo." → deletes by `import_batch_id`.

### Phase 4 — Settings
- Surface dedup knobs in the review screen (advanced): date window (1/3/7 days), similarity threshold (strict/normal/loose). Sensible defaults; most users never touch them.

## Technical Notes

- All matching runs **client-side** after a single scoped query (`WHERE date BETWEEN ... AND user_id = ...`) — fast even for 10k rows.
- `normalized_description` column lets us index/filter server-side later if volume grows.
- No CHECK constraints; new columns are nullable with defaults.
- The migration is additive and safe for existing data.

## Out of Scope (for now)

- Server-side dedup edge function (can revisit if client perf becomes an issue).
- Cross-account dedup (when we add multiple accounts, dedup will need an `account_id` dimension).
- ML-based merchant matching — fuzzy + store table is enough.

