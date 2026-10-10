# Transaction Ingestion & Deduplication Specification

**Source of truth:** `src/lib/transactionDedup.ts`, `src/components/dashboard/CSVImporter.tsx`, `src/hooks/useTransactions.ts`, `src/hooks/useStores.ts`

---

## Overview

Transaction ingestion is a **client-side** pipeline (`ADR-004`) with four stages:
1. File upload & CSV parsing
2. Column mapping (auto-detected or user-specified)
3. Store matching + categorization
4. Overlap-safe deduplication against existing rows
5. Bulk insert via `useAddMultipleTransactions`

The dedup engine (`src/lib/transactionDedup.ts`) is the core contract. It runs entirely in the browser.

---

## CSV Parsing Contract

### Input Format

| Property | Value |
|----------|-------|
| File type | `.csv` only |
| Encoding | UTF-8 (via `FileReader.readAsText`) |
| Parser | Custom CSV parser (not a library) in `CSVImporter.tsx:186-205` |

### Parser Rules

1. **Line splitting:** `text.split('\n')`
2. **Quote handling:** When `char === '"'`, toggle `inQuotes` flag; commas inside quotes are not delimiters.
3. **Trimming:** Each cell is trimmed with `.trim()`.
4. **Empty rows:** Filtered out: `row.filter(cell => cell.length > 0)` — rows where ALL cells are empty are dropped.
5. **Header row:** Row 0 is treated as the header row (used for column detection). Data rows start at index 1.

### Auto-Detection (`autoDetectColumns` at `CSVImporter.tsx:76-140`)

| Field | Header Keywords (case-insensitive) |
|-------|-----------------------------------|
| `description` | `description`, `merchant`, `name`, `payee`, `desc` |
| `amount` | `amount`, `debit`, `credit`, `total`, `sum`, `value` |
| `date` | `date`, `time`, `day`, `posted` |
| `category` | `category`, or `type` (but not `transaction type`) |
| `type` | `transaction type`, `trans type`, or `type` (only if `category` is also mapped) |

**Required columns for parsing:** `description`, `amount`, `date` — the parser returns an error if any of these three are `null`.

### Data Cleaning (`cleanTransactionDescription` at `CSVImporter.tsx:59-73`)

```typescript
const PAYMENT_PROVIDERS_TO_REMOVE = [
  'GglPay', 'ApplePay', 'APPLE PAY', 'GOOGLE PAY',
  'GPAY', 'APPLEPAY', 'GOOGLEPAY'
];
```

Each provider is matched with a case-insensitive word-boundary regex and removed. Multiple spaces and leading/trailing `-*` separators are collapsed.

### Amount Parsing (`CSVImporter.tsx:265`)

1. Strip `$` and `,` characters: `amountStr.replace(/[,$]/g, '')`
2. Parse with `parseFloat()`
3. **Skip negative amounts** — they are treated as credit card payments and silently excluded: `if (parsedAmount < 0) { return; }` (no error pushed)

### Date Parsing (`CSVImporter.tsx:296-317`)

| Format | Example | Handling |
|--------|---------|----------|
| `MM/DD/YYYY` | `01/15/2024` | Split by `/`, reconstruct as `new Date(year, month-1, day)` |
| `YYYY-MM-DD` | `2024-01-15` | `new Date(dateStr)` — interpreted as UTC |
| Other | — | Error: `"Invalid date format: ... Expected MM/DD/YYYY or YYYY-MM-DD"` |

Output is normalized to ISO `YYYY-MM-DD` via `parsedDate.toISOString().split('T')[0]`.

### Store Name Extraction

`extractStoreName` (`src/hooks/useStores.ts:176-225`) applies the following clean-up in order:

1. Uppercase + trim
2. Remove payment processor prefixes: `SQ *`, `PAYPAL *`, `STRIPE *`, `VENMO *`, `ZELLE *`, `CASHAPP *`, `TST*`, `MTA*`, `POS `, `DEBIT `, `PURCHASE `
3. Remove phone numbers: `\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b` and `\b\d{10,11}\b`
4. Remove dates: `\b\d{1,2}[-/]\d{1,2}[-/]?\d{0,4}\b` and `\b(MON|TUE|WED|THU|FRI|SAT|SUN)\s+\d{1,2}(AM|PM)\b`
5. Remove long transaction IDs: `[A-Z0-9]{8,}$`
6. Remove location codes: `\s+[A-Z]{2}\d+.*$`
7. Remove suffixes: `WEB SALES`, `WEB SALE`, `ONLINE`, `PAC`, `USD`, `INR`, `EUR`, `GBP`, `PURCHASE`, `PYMT`, `PAYMENT`, `DC`, `DEBIT`, `CREDIT`, `INTL`
8. Remove amounts: `\$?\d+\.\d{2}\s*(@|AT)?` and `\d+\.\d+\s*(USD\|INR\|EUR\|GBP)`
9. Collapse whitespace: `\s+` → ` `
10. Strip trailing `*#`: `[*#]+$`
11. Truncate to 50 characters

---

## Store Matching Contract

**Source:** `findBestStoreMatch` (`src/hooks/useStores.ts:95-173`)

### Algorithm (in priority order)

1. **Exact match** (case-insensitive): `store.name.toUpperCase() === cleanedDescription`
2. **Substring containment (store name within description):** `cleanedDescription.includes(storeName)` and `storeName.length > 3`
3. **Substring containment (description within store name):** `storeName.includes(cleanedDescription)` and `cleanedDescription.length > 3`
4. **Fuzzy match (Levenshtein):**
   - Full-string similarity: `1 - levenshteinDistance(a, b) / maxLen`
   - Prefix similarity: `1 - levenshteinDistance(a.substring(0, minLen), b.substring(0, minLen)) / minLen`
   - Weighted score: `similarity * 0.6 + prefixSimilarity * 0.4`
   - Threshold: **> 0.75** returns a match
5. **Keyword-based fallback:**
   - Split description into keywords (length > 3)
   - Split store name into keywords (length > 3)
   - Match if ≥ `min(2, keywords.length)` keywords have bidirectional substring containment

### Levenshtein Distance (`levenshteinDistance` at `useStores.ts:60-84`)

| Parameter | Value |
|-----------|-------|
| Algorithm | Standard dynamic programming matrix |
| Operations | insertion, deletion, substitution (cost 0 or 1) |
| Time complexity | O(m × n) where m, n are string lengths |

### Store Matching Integration in CSV Importer

```
CSVImporter.tsx:325-373
1. Call extractStoreName(desc) → storeName
2. Call findBestStoreMatch(desc, stores) → matchedStore | null
3. If matchedStore is found:
   a. Find the category in `categories` by name
   b. If category.parent_category === null → parent category → treat as UNMATCHED
   c. If category has parent_category → assign matchedStore.category_name
4. If no matchedStore:
   a. If CSV has a category column → use it (must be subcategory)
   b. Otherwise → assign 'Other'
5. Track unmatched stores for AI categorization
```

---

## Deduplication Engine Contract

**Source:** `src/lib/transactionDedup.ts`

### Types

```typescript
type DedupStatus = 'new' | 'duplicate' | 'ambiguous';

interface ExistingTxn {
  id: string;
  date: string;       // YYYY-MM-DD
  amount: number;
  description: string;
}

interface IncomingTxn {
  description: string;
  amount: number;
  date: string;       // YYYY-MM-DD
}

interface ClassifiedTxn<T extends IncomingTxn> {
  txn: T;
  status: DedupStatus;
  match?: ExistingTxn;
  reason?: string;
}
```

### Normalization

```typescript
const normalize = (desc: string): string =>
  extractStoreName(desc || '').toUpperCase();
```

**Critical:** Normalization uses `extractStoreName` from `useStores.ts`, NOT a simple lowercase. This means the same store-name extraction logic used for store matching is also used for dedup. A transaction description of `"STARBUCKS #12345 06/15"` normalizes to `"STARBUCKS"`.

### Dedup Options

| Option | Default | Description |
|--------|---------|-------------|
| `dateWindowDays` | `3` | Max days between existing and incoming for fuzzy match |
| `similarityThreshold` | `0.85` | Min Levenshtein similarity for fuzzy match |

### Algorithm

#### Stage 1: Exact Bucket Match

1. Pre-compute normalized form for all existing transactions.
2. Build a bucket index: `key = "date|amount.toFixed(2)|normalized_desc"` → array of indices.
3. For each incoming transaction:
   - Compute the same key.
   - If the bucket exists, find the first **unclaimed** existing row with the same key.
   - If found → `status = 'duplicate'`, `reason = 'Exact match (date, amount, merchant)'`.

**This handles legitimate transaction twins:** If a user imports the same Starbucks $5.75 charge twice (same date), the second is flagged as duplicate. But two different $5.75 Starbucks visits on different dates are treated as `new`.

#### Stage 2: Fuzzy Fallback (only if Stage 1 didn't match)

For each **unclaimed** existing transaction:
1. Check `existing.amount.toFixed(2) === incoming.amount.toFixed(2)` (exact amount string match)
2. Check `daysBetween(existing.date, incoming.date) <= dateWindowDays` (default 3)
3. Compute `similarity(normalizedIncoming, normalizedExisting)` using Levenshtein.
4. If `sim >= similarityThreshold` (default 0.85):
   - Track the best similarity score.
   - After scanning all unclaimed existing rows, if best sim ≥ threshold:
     - `status = 'ambiguous'`
     - `reason = "Likely duplicate (N% match, within X days)"`
   - Claim the matched existing row.

If no match in either stage → `status = 'new'`.

### One-to-One Claiming

**Each existing row can only be claimed once.** The `existingMeta` array tracks `claimed: boolean`. Once an existing row matches an incoming transaction, it is marked claimed and cannot match a subsequent incoming transaction. This prevents ambiguity chains.

### Import Window (CSVImporter.tsx:413-458)

Before dedup, the client fetches existing transactions in a window expanded by ±3 days:

```typescript
const minDate = new Date(dates[0]);
const maxDate = new Date(dates[last]);

minDate.setDate(minDate.getDate() - 3);  // expand by 3 days
maxDate.setDate(maxDate.getDate() + 3);

// Query: .gte('date', fromStr).lte('date', toStr)
```

- **Window key:** `date` column, queried with `.gte()` and `.lte()` on the expanded range.
- **Fetched columns:** `id, date, amount, description` (not `category` or `type`).
- **Conversion:** `Number(e.amount)` — Supabase returns `NUMERIC` as string, client converts to JS number.

### Import Decision Logic

| Dedup Status | `includeInImport` Default | User Action |
|-------------|--------------------------|-------------|
| `new` | `true` | Can toggle off |
| `duplicate` | `false` | Can toggle on |
| `ambiguous` | `false` | Can toggle on |

The user can manually flip any row. Bulk actions:
- `setAllInBucket('ambiguous', true)` — include all ambiguous
- `setAllInBucket('ambiguous', false)` — skip all ambiguous

---

## Invariants (Never Do)

| # | Rule | Enforcement |
|---|------|-------------|
| D-01 | Never auto-import duplicates without user confirmation | `includeInImport = false` for `duplicate`/`ambiguous` |
| D-02 | Never treat two transactions on the same day with the same amount and merchant as separate | Exact bucket match catches these |
| D-03 | Never dedup across different users | Existing transactions fetched only for the authenticated user (RLS) |
| D-04 | Never use raw description text for dedup matching | Always normalize via `extractStoreName(...).toUpperCase()` |
| D-05 | Never allow one existing row to match multiple incoming rows | `claimed` flag on `existingMeta` |
| D-06 | Never skip the ±3 day window expansion | Otherwise boundary-day duplicates are missed |
| D-07 | Never auto-categorize unmatched stores as parent categories | Client-side check: `category.parent_category === null` → treat as unmatched (CSVImporter.tsx:333-346) |
| D-08 | Never import negative amounts | `if (parsedAmount < 0) { return; }` in CSVImporter.tsx:290-293 |

---

## State Machine: CSV Import Flow

```typescript
type ImportState =
  | 'idle'
  | 'file-selected'     // File chosen, parsing not yet started
  | 'parsing'           // CSV text → rows
  | 'mapping'           // User adjusts column mapping
  | 'categorizing'      // AI categorization in progress
  | 'preview'           // Showing parsed results + dedup check
  | 'importing'         // Saving to database
  | 'complete'          // Success
  | 'error';            // Failed
```

**Transitions:**
- `idle` → `file-selected`: file input change
- `file-selected` → `parsing`: `handleFileUpload` reads file via `FileReader`
- `parsing` → `mapping`: CSV parsed, column mapping auto-detected
- `mapping` → `categorizing`: user clicks "AI Auto-Categorize"
- `categorizing` → `preview`: AI response received, categories applied
- `mapping` → `preview`: user clicks "Parse Transactions" (skips AI)
- `preview` → `importing`: user clicks "Import N Transactions"
- `importing` → `complete`: `addTransactionsMutation` + `addStoresMutation` succeed
- `importing` → `error`: any mutation fails
- `parsing` → `error`: CSV parse failure or file type check fails

---

## Test Oracles

### Oracle D-01: Exact duplicate detection
```
Given: existing transaction { date: "2024-01-15", amount: 5.75, description: "STARBUCKS #12345" }
When: incoming transaction { date: "2024-01-15", amount: 5.75, description: "STARBUCKS #12345" }
Then: classifyIncoming returns status='duplicate', includeInImport=false
```

### Oracle D-02: Same-day same-amount different merchant is NOT a duplicate
```
Given: existing transaction { date: "2024-01-15", amount: 5.75, description: "STARBUCKS" }
When: incoming transaction { date: "2024-01-15", amount: 5.75, description: "COFFEE BEAN" }
Then: classifyIncoming returns status='new', includeInImport=true
```

### Oracle D-03: Fuzzy match within 3-day window
```
Given: existing transaction { date: "2024-01-15", amount: 5.75, description: "STARBUCKS" }
When: incoming transaction { date: "2024-01-17", amount: 5.75, description: "STARBUCKS #REF123" }
Then: similarity(STarbucks, Starbucks) > 0.85
And: daysBetween = 2 ≤ 3
And: status='ambiguous', includeInImport=false
```

### Oracle D-04: Fuzzy match outside 3-day window
```
Given: existing transaction { date: "2024-01-15", amount: 5.75, description: "STARBUCKS" }
When: incoming transaction { date: "2024-01-19", amount: 5.75, description: "STARBUCKS" }
Then: daysBetween = 4 > 3
And: status='new'
```

### Oracle D-05: Negative amount skipped
```
Given: CSV row with amount = "-45.00"
When: parseTransactions processes the row
Then: the row is silently skipped (not added to success or errors)
```

### Oracle D-06: One-to-one claiming
```
Given: 1 existing transaction { date: "2024-01-15", amount: 5.75, description: "STARBUCKS" }
When: 2 incoming transactions both { date: "2024-01-15", amount: 5.75, description: "STARBUCKS" }
Then: first incoming → status='duplicate', claimed=true
And: second incoming → status='new' (existing row is claimed, no fallback match possible)
```

### Oracle D-07: Window expansion catches boundary duplicates
```
Given: CSV import dates range from 2024-01-03 to 2024-01-15
When: client fetches existing transactions for dedup
Then: fetch range is 2024-01-00 (2024-01-03 - 3 days) to 2024-01-18 (2024-01-15 + 3 days)
And: any existing transaction within that window is compared
```

### Oracle D-08: Parent category fallback to unmatched
```
Given: a store "AMAZON" with category_name = "Shopping" (parent category)
When: CSVImporter finds a match for "AMAZON"
Then: client checks categories.find(c => c.name === "Shopping").parent_category === null
And: store is NOT used → classified as unmatched store
And: store added to unmatchedStores map for AI categorization
```
