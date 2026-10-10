# Specification: Transaction Pagination and Filters

## Domain

`01-transactions` — client-side transaction table presentation

## Scope

This spec covers how the TransactionsList page paginates and filters transaction records, and the exact matching logic applied.

---

## 1. Transaction Interface

```typescript
interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;        // category NAME (not id) — denormalized
  type: 'expense' | 'income';
  date: string;           // ISO date string YYYY-MM-DD
  user_id?: string;       // from Supabase auth
  created_at: string;
  updated_at: string;
}
```

Source: `src/hooks/useTransactions.ts`

---

## 2. Filter State Machine

All filters live in React component state via `useTransactionFilters`.

| State Field      | Type                  | Default   | Description                        |
|------------------|-----------------------|-----------|------------------------------------|
| `filterCategory` | `string`              | `'all'`   | Category name or `'all'` wildcard  |
| `filterType`     | `string`              | `'all'`   | `'expense'`, `'income'`, or `'all'`|
| `searchTerm`     | `string`              | `''`      | Free-text search                   |
| `date`           | `DateRange \| undefined` | `undefined` | Date range from react-day-picker  |
| `minAmount`      | `string`              | `''`      | Minimum amount (empty = no bound)  |
| `maxAmount`      | `string`              | `''`      | Maximum amount (empty = no bound)  |

### Reset

`handleResetFilters()` sets all fields back to defaults:
- `filterCategory` → `'all'`
- `filterType` → `'all'`
- `searchTerm` → `''`
- `date` → `undefined`
- `minAmount` → `''`
- `maxAmount` → `''`

---

## 3. Filter Matching Logic

A transaction passes all filters when:

```
matchesCategory = filterCategory === 'all' || transaction.category === filterCategory
matchesType     = filterType === 'all'     || transaction.type === filterType
matchesSearch   = description.includes(term.toLowerCase()) || category.includes(term.toLowerCase())
matchesStartDate = !formattedStartDate || transaction.date >= formattedStartDate
matchesEndDate   = !formattedEndDate   || transaction.date <= formattedEndDate
matchesMinAmount = minAmount === '' || isNaN(parseFloat(minAmount)) || amount >= parseFloat(minAmount)
matchesMaxAmount = maxAmount === '' || isNaN(parseFloat(maxAmount)) || amount <= parseFloat(maxAmount)
```

**Final predicate:** `all six conditions ANDed together`

Date format for comparison: `yyyy-MM-dd` string comparison (ISO dates sort lexicographically).

### Edge Cases

| Case                         | Behavior                          |
|------------------------------|-----------------------------------|
| `minAmount` is not a number  | Treated as no minimum bound       |
| `maxAmount` is not a number  | Treated as no maximum bound       |
| `searchTerm` is empty        | All transactions match            |
| `date.from` is undefined     | Start date filter disabled        |
| `date.to` is undefined       | End date filter disabled          |

---

## 4. Client-Side Pagination

Pagination is applied **after** filtering on the client side.

### Page Size Options

| Label    | Items per page |
|----------|----------------|
| `25`     | 25             |
| `50`     | 50             |
| `100`    | 100            |

### State

- `pageSize`: number — persisted via component state (default 25)
- `currentPage`: number — persists across filter changes (resets on filter apply)

### Page Reset Rule

When filters are **applied** (not when typing), `currentPage` resets to `1`.

### Total Pages Calculation

```typescript
const totalPages = Math.ceil(filteredTransactions.length / pageSize);
```

### Slice Logic

```typescript
const startIndex = (currentPage - 1) * pageSize;
const endIndex   = startIndex + pageSize;
const paginated  = filteredTransactions.slice(startIndex, endIndex);
```

### Pagination Controls

- Previous button: `currentPage > 1 ? currentPage - 1 : currentPage`
- Next button: `currentPage < totalPages ? currentPage + 1 : currentPage`
- Page numbers displayed: up to 5 page number buttons
- Records info: showing `startIndex + 1`–`Math.min(endIndex, filtered.length)` of `filtered.length` results

---

## 5. Transaction Table Columns

| Column         | Field          | Format                | Width     |
|----------------|----------------|-----------------------|-----------|
| Date           | `date`         | `MMM d, yyyy`         | 120px     |
| Description    | `description`  | Truncate with ellipsis| Flexible  |
| Category       | `category`     | Name or `—`           | 150px     |
| Type           | `type`         | Capitalized badge     | 100px     |
| Amount         | `amount`       | `$(value.toFixed(2))` | 100px     |

### Sorting

| Column      | Direction toggle         |
|-------------|--------------------------|
| Date        | desc → asc → desc        |
| Amount      | desc → asc → desc        |
| Description | asc → desc → asc         |

Default sort: Date descending.

---

## 6. Invariants

| #  | Invariant                                              |
|----|--------------------------------------------------------|
| 1  | Filtered transactions list is deterministic            |
| 2  | Pagination never renders an empty intermediate page    |
| 3  | `currentPage` resets to 1 when any filter changes      |
| 4  | Empty `filterCategory` or `filterType` means `'all'`    |
| 5  | Search is case-insensitive                             |
| 6  | `minAmount === ''` means no minimum bound applied      |
| 7  | `maxAmount === ''` means no maximum bound applied      |

---

## 7. Test Oracles

### TO-FILTER-1: Category filter exact match
**Given** `filterCategory = 'Groceries'` and transactions with categories `['Groceries', 'Gas', 'Groceries']`
**When** filter is applied
**Then** filtered list contains exactly 2 transactions, both with `category === 'Groceries'`

### TO-FILTER-2: Type filter match
**Given** `filterType = 'expense'` and transactions with types `['expense', 'income', 'expense']`
**When** filter is applied
**Then** filtered list contains exactly 2 transactions, all with `type === 'expense'`

### TO-FILTER-3: Search matches description case-insensitively
**Given** `searchTerm = 'NETFLIX'` and a transaction with `description = 'Netflix Subscription'`
**When** filter is applied
**Then** transaction is in filtered list

### TO-FILTER-4: Search matches category field
**Given** `searchTerm = 'grocery'` and a transaction with `category = 'Groceries'`
**When** filter is applied
**Then** transaction is in filtered list

### TO-FILTER-5: Date range inclusive
**Given** date range `2025-06-01` to `2025-06-30`
**When** filter is applied
**Then** transaction with `date = '2025-06-01'` is included and transaction with `date = '2025-06-30'` is included

### TO-FILTER-6: Date range string comparison
**Given** date range `2025-06-01` to `2025-06-30`
**When** transaction has `date = '2025-05-31'`
**Then** transaction is excluded from filtered list

### TO-FILTER-7: Invalid min amount treated as no bound
**Given** `minAmount = 'abc'` and transactions with amounts `[10, 5, 100]`
**When** filter is applied
**Then** all 3 transactions are in the filtered list

### TO-FILTER-8: Min and max amount bounds
**Given** `minAmount = '10'` and `maxAmount = '50'`
**When** filter is applied to amounts `[5, 15, 30, 75]`
**Then** filtered list contains transactions with amounts `[15, 30]`

### TO-FILTER-9: Empty search matches all
**Given** `searchTerm = ''`
**When** filter is applied
**Then** all transactions pass the search condition

### TO-FILTER-10: Reset clears all filters
**Given** all filters have non-default values
**When** `handleResetFilters()` is called
**Then** all filter states return to defaults: `filterCategory='all'`, `filterType='all'`, `searchTerm=''`, `date=undefined`, `minAmount=''`, `maxAmount=''`

### TO-PAG-1: Page size changes update slice
**Given** 75 filtered transactions and `pageSize = 25`
**When** page set to 3
**Then** displayed transactions are indices 50–74 (3rd page of 25)

### TO-PAG-2: Filter change resets page
**Given** `currentPage = 3` and `pageSize = 25`
**When** a filter value changes
**Then** `currentPage` resets to `1`

### TO-PAG-3: Last page may be partial
**Given** 12 filtered transactions and `pageSize = 10`
**When** page 2 is selected
**Then** exactly 2 transactions are displayed (indices 10–11)

### TO-PAG-4: Next button disables on last page
**Given** `currentPage = 1` and `totalPages = 1`
**When** Next button clicked
**Then** `currentPage` remains `1`

### TO-PAG-5: Previous button disables on first page
**Given** `currentPage = 1`
**When** Previous button clicked
**Then** `currentPage` remains `1`

---

## 8. Source References

| Component / Hook                          | File Path                             |
|-------------------------------------------|---------------------------------------|
| `useTransactionFilters`                   | `src/hooks/useTransactionFilters.ts`  |
| `Transaction` interface                   | `src/hooks/useTransactions.ts`        |
| `TransactionsList`                        | `src/components/TransactionsList.tsx` |
| `TransactionTable`                        | `src/components/TransactionTable.tsx` |
| `TransactionFilters`                      | `src/components/TransactionFilters.tsx` |
| `TransactionListHeader`                   | `src/components/TransactionListHeader.tsx` |
