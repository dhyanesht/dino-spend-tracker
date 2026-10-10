# Specification: Trends Analysis

## Domain

`03-reporting-and-budgets` — historical spending trends and budget performance

## Scope

This spec covers the client-side utility functions that compute spending trends across time ranges, category comparisons, parent category aggregations, budget performance, and group-level analytics. All functions operate on in-memory transaction arrays — no server-side calls.

---

## 1. Transaction and Category Definitions (Local)

These are local definitions within `trendsDataUtils.ts`, not imported from the generated Supabase types.

```typescript
interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;     // category NAME, not category ID
  date: string;         // ISO date string YYYY-MM-DD
  type: 'expense' | 'income';
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  color: string;
  created_at: string;
  parent_category: string | null;
  monthly_budget: number | null;
}
```

Source: `src/utils/trendsDataUtils.ts:5-23`

---

## 2. getMonthlyTrends

### Signature

```typescript
getMonthlyTrends(transactions: Transaction[], timeRange: string): Array<{ month: string; total: number }>
```

### Behavior

1. Determine `monthCount` based on `timeRange`:
   - `'3months'` → 3 months
   - `'1year'` → 12 months
   - default (including undefined) → 6 months

2. For each of the last `monthCount` months (including current):
   - Compute `monthKey = date.toISOString().slice(0, 7)` (format: `YYYY-MM`)
   - Sum all transaction amounts where `t.date.startsWith(monthKey)`

3. Return array sorted chronologically (oldest first), each entry:
   ```typescript
   { month: "Jun", total: 1250.00 }
   ```

### Month Name Format

`date.toLocaleDateString('en-US', { month: 'short' })` → `"Jan"`, `"Feb"`, ..., `"Dec"`

Source: `trendsDataUtils.ts:25-51`

---

## 3. getCategoryComparisonData

### Signature

```typescript
getCategoryComparisonData(
  transactions: Transaction[],
  categories: Category[],
  timeRange: string,
  selectedCategory: string
): { data: any[]; topCategories: any[] }
```

### Behavior

1. If `selectedCategory !== 'all'`, return `{ data: [], topCategories: [] }`

2. Compute `monthCount` same as `getMonthlyTrends`

3. Compute **top 4 categories** by total spending:
   ```typescript
   const categoryTotals = categories
     .map(cat => ({
       ...cat,
       total: transactions
         .filter(t => t.category === cat.name)
         .reduce((sum, t) => sum + Number(t.amount), 0)
     }))
     .sort((a, b) => b.total - a.total)
     .slice(0, 4);
   ```

4. For each of the last `monthCount` months:
   - Build `monthData` object with `month` key
   - For each top category, sum spending in that month:
     ```typescript
     monthData[cat.name] = transactions
       .filter(t => t.date.startsWith(monthKey) && t.category === cat.name)
       .reduce((sum, t) => sum + Number(t.amount), 0);
     ```

5. Return `{ data: months[], topCategories: categoryTotals }`

Source: `trendsDataUtils.ts:53-97`

---

## 4. getYearOverYearData

### Signature

```typescript
getYearOverYearData(transactions: Transaction[]): Array<{
  month: string;
  'This Year': number;
  'Last Year': number;
}>
```

### Behavior

1. Get `currentYear = now.getFullYear()`, `lastYear = currentYear - 1`
2. For each month name in `["Jan", "Feb", ..., "Dec"]`:
   - Initialize object with `'This Year': 0, 'Last Year': 0`
3. For each transaction:
   - Parse year and month from `t.date`
   - If year is `currentYear` or `lastYear`, add amount to corresponding bucket
4. Return array of 12 month objects

### Transaction Date Parsing

```typescript
const transactionDate = new Date(t.date);
const year = transactionDate.getFullYear();
const month = transactionDate.getMonth();
```

Source: `trendsDataUtils.ts:99-129`

---

## 5. calculateSpendingInsights

### Signature

```typescript
calculateSpendingInsights(transactions: Transaction[]): {
  currentSpending: number;
  previousSpending: number;
  spendingChange: number;
}
```

### Behavior

1. Compute `currentMonth` key = `now.toISOString().slice(0, 7)` (YYYY-MM)
2. Sum all transactions where `t.date.startsWith(currentMonth)`
3. Compute `prevMonth` by subtracting one month from `now`
4. Sum all transactions where `t.date.startsWith(prevMonthKey)`
5. Compute `spendingChange` = `((current - previous) / previous) * 100`, or `0` if `previous === 0`

Source: `trendsDataUtils.ts:131-155`

---

## 6. getParentCategoryComparison

### Signature

```typescript
getParentCategoryComparison(
  transactions: Transaction[],
  parentCategories: Category[],
  subcategories: Category[]
): Array<{
  parentCategory: string;
  currentMonth: number;
  previousMonth: number;
  monthOverMonth: number;
  currentYear: number;
  previousYear: number;
  yearOverYear: number;
  color: string;
}>
```

### Behavior

1. Compute keys:
   - `currentMonth = now.toISOString().slice(0, 7)` (YYYY-MM)
   - `previousMonth` = one month before
   - `currentYearMonth` = `${currentYear}-${MM}` (e.g., "2025-06")
   - `lastYearMonth` = `${currentYear - 1}-${MM}`

2. For each parent category:
   - Find subcategories where `sub.parent_category === parentCat.name`
   - Compute `currentMonth` spending: sum of transactions where `date.startsWith(currentMonth)` AND `category === subcategory.name`
   - Compute `previousMonth` spending: same logic with `previousMonthKey`
   - Compute `currentYear` spending: `date.startsWith(currentYearMonth)`
   - Compute `previousYear` spending: `date.startsWith(lastYearMonth)`
   - Calculate MoM: `previousMonthSpending > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0`
   - Calculate YoY: `lastYearSpending > 0 ? ((currentYear - lastYear) / lastYear) * 100 : 0`
   - Return `{ parentCategory, currentMonth, previousMonth, monthOverMonth, currentYear, previousYear, yearOverYear, color }`

3. **Filter:** only include entries where `currentMonth > 0 || previousMonth > 0`

Source: `trendsDataUtils.ts:157-212`

---

## 7. getParentCategoryTableData

### Signature

```typescript
getParentCategoryTableData(
  transactions: Transaction[],
  parentCategories: Category[],
  subcategories: Category[],
  monthCount: number = 6
): { tableData: any[]; monthColumns: string[] }
```

### Behavior

1. Generate `monthColumns` — array of month labels: `date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })` (e.g., "Jun 25")
2. For each parent category:
   - Find related subcategories
   - For each month column, compute spending by filtering transactions where:
     - `t.date.startsWith(monthKey)` AND `subcategoryNames.includes(t.category)`
   - Compute per-subcategory month spending
   - Return `{ parentCategory, months, subcategories: [{ name, months }] }`

3. **Filter:** only include parent categories where any month value > 0

### Month Label Format

`new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })` → e.g., `"Jun 25"`, `"May 25"`

Source: `trendsDataUtils.ts:214-279`

---

## 8. getBudgetPerformanceData

### Signature

```typescript
getBudgetPerformanceData(
  transactions: Transaction[],
  parentCategories: Category[],
  subcategories: Category[]
): Array<{
  category: string;
  percentage: number;
  actual: number;
  budget: number;
  color: string;
}>
```

### Behavior

1. Filter parent categories where `monthly_budget` exists AND > 0:
   ```typescript
   parentCategories.filter(parent => parent.monthly_budget && parent.monthly_budget > 0)
   ```

2. For each such parent:
   - Find subcategories where `sub.parent_category === parentCat.name`
   - Compute `currentMonthSpending` = sum of `monthExpenses` for those subcategories
   - `budget = Number(parentCat.monthly_budget)`
   - `percentage = budget > 0 ? (currentMonthSpending / budget) * 100 : 0`
   - Return `{ category: parentCat.name, percentage, actual, budget, color }`

3. **Sort** by `percentage` descending

4. **Note:** This aggregates subcategory budgets under each parent category. The `budget` field per parent is the parent's own `monthly_budget`, not the sum of subcategory budgets.

### Current Month Key

```typescript
const currentMonth = now.toISOString().slice(0, 7);
```

Source: `trendsDataUtils.ts:281-311`

---

## 9. Group-Level Functions (groupTrendsDataUtils.ts)

### Transaction Interface (Local)

```typescript
interface Transaction {
  date: string;
  amount: number;
  category: string;
  type: string;
}
```

### Category Interface (Local)

```typescript
interface Category {
  id: string;
  name: string;
  monthly_budget?: number;
  parent_category?: string | null;
}
```

---

## 10. getGroupComparison

### Signature

```typescript
getGroupComparison(
  transactions: Transaction[],
  groups: CategoryGroup[],
  mappings: CategoryGroupMapping[],
  categories: Category[]
): Array<{
  parentCategory: string;
  currentMonth: number;
  previousMonth: number;
  monthOverMonth: number;
  currentYear: number;
  previousYear: number;
  yearOverYear: number;
  color: string;
}>
```

### Behavior

For each group:
1. Find `groupCategoryIds` from `mappings.filter(m => m.group_id === group.id).map(m => m.category_id)`
2. Find `groupCategoryNames` from `categories.filter(c => groupCategoryIds.includes(c.id)).map(c => c.name)`
3. Filter `groupTransactions` = transactions where `groupCategoryNames.includes(t.category)`
4. Compute spending for:
   - Current month: `isAfter(date, currentMonthStart)`
   - Previous month: `isAfter(date, lastMonthStart) && isBefore(date, currentMonthStart)`
   - Current year: `isAfter(date, currentYearStart)`
   - Last year: `isAfter(date, lastYearStart) && isBefore(date, lastYearEnd)`
5. Compute MoM and YoY percentages (same formula as parent category comparison)

### Date Helpers

Uses `date-fns`:
- `startOfMonth(now)` → first day of current month
- `subMonths(now, 1)` → one month before
- `isAfter(date, startOfMonth)` → date is after or on the start of the month

Source: `groupTrendsDataUtils.ts:19-80`

---

## 11. getGroupTableData

### Signature

```typescript
getGroupTableData(
  transactions: Transaction[],
  groups: CategoryGroup[],
  mappings: CategoryGroupMapping[],
  categories: Category[],
  monthCount: number = 6
): { tableData: any[]; monthColumns: string[] }
```

### Behavior

1. Generate months array (oldest to newest) using `subMonths` and `startOfMonth`
2. For each group:
   - Find category names in group (same logic as getGroupComparison)
   - For each month, sum transactions where:
     ```typescript
     tDate is after month.start AND tDate is before month.end
     ```
   - `month.end` is `startOfMonth(subMonths(now, i - 1))` — the start of the NEXT month
3. Return `{ tableData, monthColumns }` where `monthColumns` = `["Jun 2025", "May 2025", ...]`

### Month Label Format

`format(date, 'MMM yyyy')` → e.g., `"Jun 2025"`

### Subcategories Field

Groups don't have subcategories in this view — `subcategories: []` is returned as empty.

Source: `groupTrendsDataUtils.ts:83-135`

---

## 12. getBudgetPerformanceByGroup

### Signature

```typescript
getBudgetPerformanceByGroup(
  transactions: Transaction[],
  groups: CategoryGroup[],
  mappings: CategoryGroupMapping[],
  categories: Category[]
): Array<{
  category: string;
  percentage: number;
  actual: number;
  budget: number;
  color: string;
}>
```

### Behavior

For each group:
1. Find `groupCategories` = categories in this group
2. Compute `budget` = sum of `cat.monthly_budget || 0` for all categories in group
3. Compute `spent` = sum of transactions where:
   - `groupCategoryNames.includes(t.category)` AND
   - `isAfter(new Date(t.date), currentMonthStart)`
4. Compute `percentage = budget > 0 ? (spent / budget) * 100 : 0`
5. Return `{ category: group.name, percentage, actual: spent, budget, color: group.color }`

**Filter:** Only groups where `budget > 0`

Source: `groupTrendsDataUtils.ts:138-179`

---

## 13. Invariants

| #  | Invariant                                              |
|----|--------------------------------------------------------|
| 1  | Month key format is `YYYY-MM` (ISO slice)             |
| 2  | Month names use `toLocaleDateString('en-US', { month: 'short' })` |
| 3  | Spending amounts use `Number(t.amount)` for safety    |
| 4  | Division by zero is guarded (returns 0)               |
| 5  | Parent comparisons filter out entries with no activity|
| 6  | Budget performance sorts by percentage descending     |
| 7  | Group budgets are the SUM of member category budgets  |
| 8  | Date comparisons use `date-fns` for group functions, string `startsWith` for parent functions |

---

## 14. Test Oracles

### TO-TRENDS-1: Monthly trends month count
**Given** `timeRange = '3months'`
**When** `getMonthlyTrends` is called
**Then** returns array of length 3

### TO-TRENDS-2: Monthly trends default month count
**Given** `timeRange = 'custom'` (unknown value)
**When** `getMonthlyTrends` is called
**Then** returns array of length 6

### TO-TRENDS-3: Monthly trends chronological order
**Given** transactions across June, July, August 2025
**When** `getMonthlyTrends(transactions, '4months')` is called
**Then** returns `[{month: "May"}, {month: "Jun"}, {month: "Jul"}, {month: "Aug"}]` (oldest first)

### TO-TRENDS-4: Category comparison returns empty for specific category
**Given** `selectedCategory = 'Groceries'` (not 'all')
**When** `getCategoryComparisonData` is called
**Then** returns `{ data: [], topCategories: [] }`

### TO-TRENDS-5: Category comparison top 4 limit
**Given** 10 categories with varying spending
**When** `getCategoryComparisonData` is called with `selectedCategory = 'all'`
**Then** `topCategories.length === 4`

### TO-TRENDS-6: Year-over-year has 12 months
**Given** any transactions
**When** `getYearOverYearData` is called
**Then** returns array of length 12

### TO-TRENDS-7: Spending insights division by zero
**Given** no transactions in previous month
**When** `calculateSpendingInsights` is called
**Then** `spendingChange === 0`

### TO-TRENDS-8: Parent comparison filters inactive
**Given** parent category with 0 spending in current and previous month
**When** `getParentCategoryComparison` is called
**Then** parent category is NOT in returned array

### TO-TRENDS-9: Budget performance filters zero budget
**Given** parent category with `monthly_budget = 0`
**When** `getBudgetPerformanceData` is called
**Then** parent category is NOT in returned array

### TO-TRENDS-10: Budget performance sort descending
**Given** parent categories with percentages [50%, 100%, 25%]
**When** `getBudgetPerformanceData` is called
**Then** returned array has percentages in order [100%, 50%, 25%]

### TO-TRENDS-11: Group comparison date filtering
**Given** transactions in current month and previous month
**When** `getGroupComparison` is called
**Then** `currentMonth` value includes only current month transactions, `previousMonth` includes only previous month

### TO-TRENDS-12: Group budget is sum of members
**Given** group with 3 categories having budgets [100, 200, 50]
**When** `getBudgetPerformanceByGroup` is called
**Then** returned budget for the group is `350`

### TO-TRENDS-13: Group table month columns descending
**Given** `monthCount = 6`
**When** `getGroupTableData` is called
**Then** `monthColumns` = `["<current month>", ..., "<6 months ago>"]` (oldest to newest in labels)

---

## 15. Source References

| Function                        | File Path                                  |
|---------------------------------|--------------------------------------------|
| `getMonthlyTrends`              | `src/utils/trendsDataUtils.ts`            |
| `getCategoryComparisonData`     | `src/utils/trendsDataUtils.ts`            |
| `getYearOverYearData`           | `src/utils/trendsDataUtils.ts`            |
| `calculateSpendingInsights`     | `src/utils/trendsDataUtils.ts`            |
| `getParentCategoryComparison`   | `src/utils/trendsDataUtils.ts`            |
| `getParentCategoryTableData`    | `src/utils/trendsDataUtils.ts`            |
| `getBudgetPerformanceData`      | `src/utils/trendsDataUtils.ts`            |
| `getGroupComparison`            | `src/utils/groupTrendsDataUtils.ts`       |
| `getGroupTableData`             | `src/utils/groupTrendsDataUtils.ts`       |
| `getBudgetPerformanceByGroup`   | `src/utils/groupTrendsDataUtils.ts`       |
| `TrendsAnalysis.tsx`            | `src/components/dashboard/TrendsAnalysis.tsx` |
