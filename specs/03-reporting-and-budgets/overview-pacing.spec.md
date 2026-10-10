# Specification: Overview & Spending Pace

## Domain

`03-reporting-and-budgets` — month-scoped spending visualization

## Scope

This spec covers the ExpenseOverview dashboard page, including month selection, spending pace calculations, weekly breakdown bucketing, top categories display, and category pie chart data. All calculations are derived from the `transactions` table scoped to the selected calendar month.

---

## 1. Month Selection

### State

- `selectedMonth: Date` — initialized to `new Date()` on first render

### Month Key Computation

```typescript
const year  = selectedMonth.getFullYear();
const month = selectedMonth.getMonth();
const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`; // e.g. "2025-06"
const daysInMonth = new Date(year, month + 1, 0).getDate();
```

### Current Month Detection

```typescript
const now = new Date();
const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;
const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
```

Source: `ExpenseOverview.tsx:31-38`

---

## 2. Month Expense Filtering

Only expenses (type === 'expense') matching the selected month key:

```typescript
const monthExpenses = transactions.filter(
  (t) => t.date.startsWith(monthKey) && t.type === 'expense'
);
```

Source: `ExpenseOverview.tsx:41-43`

---

## 3. Last Month-at-This-Point Calculation

For MoM pacing comparison, spending from the previous month **up to the same day** as the current elapsed period:

```typescript
const prevMonth = new Date(year, month - 1, 1);
const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

const lastMonthAtThisPoint = transactions
  .filter((t) => t.date.startsWith(prevKey) && t.type === 'expense')
  .filter((t) => new Date(t.date).getDate() <= daysElapsed)
  .reduce((sum, t) => sum + Number(t.amount), 0);
```

Source: `ExpenseOverview.tsx:46-51`

---

## 4. Total Spent

Sum of all expense amounts in the selected month:

```typescript
const totalSpent = monthExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
```

---

## 5. Total Budget

Sum of `monthly_budget` across all subcategories (categories with a non-null `parent_category`):

```typescript
const totalBudget = subcategories.reduce(
  (sum, sub) => sum + Number(sub.monthly_budget || 0), 0
);
```

Source: `ExpenseOverview.tsx:56`

---

## 6. Parent Category Data

For each parent category (categories with `parent_category === null`):
1. Find subcategory names where `parent_category === parentCategory.name`
2. Sum spending from `monthExpenses` where `category === subcategory.name`
3. Sum budget from subcategories' `monthly_budget`
4. Filter out categories with 0 spending
5. Sort descending by spent amount

```typescript
const parentCategoryData = parentCategories
  .map((pc) => {
    const subs = subcategories.filter((s) => s.parent_category === pc.name);
    const spent = monthExpenses
      .filter((t) => subs.some((s) => s.name === t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const budget = subs.reduce((sum, s) => sum + Number(s.monthly_budget || 0), 0);
    return { name: pc.name, spent, budget, color: pc.color || 'hsl(var(--primary))' };
  })
  .filter((c) => c.spent > 0)
  .sort((a, b) => b.spent - a.spent);
```

Source: `ExpenseOverview.tsx:59-69`

This data feeds both `TopCategoriesCard` and `CategoryPieCard`.

---

## 7. SpendingPaceCard — Pace Calculations

### Inputs

| Prop                 | Type   | Description                              |
|----------------------|--------|------------------------------------------|
| `totalSpent`         | number | Sum of month expenses                    |
| `totalBudget`        | number | Sum of subcategory budgets               |
| `daysElapsed`        | number | Days elapsed (today's date or month end) |
| `daysInMonth`        | number | Total days in selected month             |
| `lastMonthAtThisPoint`| number | Last month's spending up to same day     |

### Derived Values

```typescript
const remaining     = Math.max(totalBudget - totalSpent, 0);
const budgetPct     = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
const daysLeft      = daysInMonth - daysElapsed;

const dailyPace       = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
const allowedPace     = daysInMonth > 0 ? totalBudget / daysInMonth : 0;

const momChange       = lastMonthAtThisPoint > 0
  ? ((totalSpent - lastMonthAtThisPoint) / lastMonthAtThisPoint) * 100
  : 0;
```

Source: `SpendingPaceCard.tsx:21-31`

### Pace Status Classification

```typescript
const isOverBudget = totalSpent > totalBudget;
const isOnPace     = dailyPace <= allowedPace * 1.1; // 10% tolerance
```

| Condition                          | Status Label | Color Classes                     |
|------------------------------------|--------------|-----------------------------------|
| `totalSpent > totalBudget`         | Over Budget  | `text-destructive` + `bg-destructive` |
| `dailyPace <= allowedPace * 1.1`   | On Pace      | `text-green-600` + `bg-green-500`     |
| Otherwise                          | Over Pace    | `text-amber-600` + `bg-amber-500`     |

### MoM Icon

| Value             | Icon            | Color        |
|-------------------|-----------------|--------------|
| `momChange < 0`   | `TrendingDown`  | `text-green-600` |
| `momChange > 0`   | `TrendingUp`    | `text-destructive` |
| `momChange === 0` | `Minus`         | `text-muted-foreground` |

### Display Formatting

- Total spent: `$${totalSpent.toFixed(2)}`
- Progress bar caption: `${totalSpent.toFixed(0)} of ${totalBudget.toFixed(0)} budget`
- Remaining: `${remaining.toFixed(0)} remaining`
- Daily pace: `$${dailyPace.toFixed(0)}/day pace · $${allowedPace.toFixed(0)}/day allowed`
- MoM change: `{Math.abs(momChange).toFixed(1)}% vs last month`

Source: `SpendingPaceCard.tsx:55-93`

---

## 8. WeeklyBreakdownChart — Week Bucketing

### Week Bucket Logic

Month days are split into 7-day chunks:

```typescript
let weekStart = 1;
const weeks = [];

while (weekStart <= daysInMonth) {
  const weekEnd = Math.min(weekStart + 6, daysInMonth);
  const label = `${weekStart}–${weekEnd}`;
  
  const spending = monthExpenses
    .filter((t) => {
      const d = new Date(t.date);
      return d.getDate() >= weekStart && d.getDate() <= weekEnd;
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  weeks.push({ label, spending });
  weekStart = weekEnd + 1;
}
```

Source: `WeeklyBreakdownChart.tsx:11-33`

### Week Count

Months have 4 or 5 week buckets depending on days in month (28-day month has 4, 31-day month has 5).

### Zero Spending

If all weeks have 0 spending, the chart returns `null` (hidden).

---

## 9. TopCategoriesCard — Budget Progress

### Input

Array of `CategorySpend` objects:

```typescript
interface CategorySpend {
  name: string;
  spent: number;
  budget: number;
  color: string;
}
```

### Display Rules

- Only top **6** categories shown (`categories.slice(0, 6)`)
- Progress bar percentage: `budget > 0 ? Math.min((spent / budget) * 100, 100) : 0`
- Over-budget indicator: `isOver = spent > budget && budget > 0` → red progress bar
- Color indicator: small colored dot using `cat.color`

### Empty State

If `categories.length === 0`, component returns `null` (hidden).

Source: `TopCategoriesCard.tsx:16-67`

---

## 10. CategoryPieCard

Receives transformed `parentCategoryData`:

```typescript
data = parentCategoryData.map((c) => ({
  name: c.name,
  amount: c.spent,
  color: c.color,
}))
```

Source: `ExpenseOverview.tsx:95-101`

---

## 11. RecentTransactions

- Receives sorted `recentMonthTx` (monthExpenses sorted newest first)
- Limited display to recent items
- "View All" navigates to the Transactions tab

---

## 12. Invariants

| #  | Invariant                                              |
|----|--------------------------------------------------------|
| 1  | Month key uses zero-padded month (`YYYY-MM-DD`)        |
| 2  | Only `type === 'expense'` transactions are counted     |
| 3  | `daysElapsed` uses current day for current month, `daysInMonth` otherwise |
| 4  | Week buckets are exactly 7 days, last week may be shorter |
| 5  | Total budget sums only subcategories (non-null parent) |
| 6  | Parent category data filters out 0-spent categories    |
| 7  | Pace uses 10% tolerance: `dailyPace <= allowedPace * 1.1` |
| 8  | Budget percentage is capped at 100 for progress bar |

---

## 13. Test Oracles

### TO-OVERVIEW-1: Month key zero-padding
**Given** selected month is June 2025 (`month = 5`)
**When** `monthKey` is computed
**Then** `monthKey === "2025-06"` (zero-padded)

### TO-OVERVIEW-2: Days in month accurate
**Given** selected month is February 2025 (`year = 2025, month = 1`)
**When** `daysInMonth` is computed
**Then** `daysInMonth === 28` (2025 is not a leap year)

### TO-OVERVIEW-3: Days elapsed for current month
**Given** today is June 14, 2025 and selectedMonth is June 2025
**When** `daysElapsed` is computed
**Then** `daysElapsed === 14`

### TO-OVERVIEW-4: Days elapsed for past month
**Given** selectedMonth is May 2025 (not current)
**When** `daysElapsed` is computed
**Then** `daysElapsed === 31` (full month)

### TO-OVERVIEW-5: Total budget only includes subcategories
**Given** parent categories have `monthly_budget: 500` and subcategories have budgets `100 + 200 + 150`
**When** `totalBudget` is computed
**Then** `totalBudget === 450` (only subcategory budgets counted)

### TO-OVERVIEW-6: Spending pace classification — on pace
**Given** `totalSpent = 300`, `totalBudget = 900`, `daysElapsed = 15`, `daysInMonth = 30`
**When** pace is computed
**Then** `dailyPace = 20`, `allowedPace = 30`, `dailyPace <= allowedPace * 1.1` is true → "On Pace"

### TO-OVERVIEW-7: Spending pace classification — over budget
**Given** `totalSpent = 1000`, `totalBudget = 900`
**When** pace is computed
**Then** `isOverBudget = true` → "Over Budget"

### TO-OVERVIEW-8: Spending pace classification — over pace but under budget
**Given** `totalSpent = 700`, `totalBudget = 900`, `daysElapsed = 15`, `daysInMonth = 30`
**When** pace is computed
**Then** `dailyPace = 46.67`, `allowedPace = 30`, `dailyPace > 30 * 1.1 = 33` → "Over Pace"

### TO-OVERVIEW-9: MoM calculation with zero prior spending
**Given** `lastMonthAtThisPoint = 0`
**When** `momChange` is computed
**Then** `momChange === 0` (avoids division by zero)

### TO-OVERVIEW-10: Week bucketing for 31-day month
**Given** month has 31 days
**When** week buckets are created
**Then** 5 buckets: `"1–7"`, `"8–14"`, `"15–21"`, `"22–28"`, `"29–31"`

### TO-OVERVIEW-11: Week bucketing for 28-day month
**Given** month has 28 days
**When** week buckets are created
**Then** 4 buckets: `"1–7"`, `"8–14"`, `"15–21"`, `"22–28"`

### TO-OVERVIEW-12: Week filter uses date.getDate()
**Given** `weekStart = 15, weekEnd = 21` and transaction with `date = "2025-06-15"`
**When** week filter is applied
**Then** transaction is included in bucket `"15–21"`

### TO-OVERVIEW-13: Top categories limited to 6
**Given** 10 categories with spending
**When** TopCategoriesCard renders
**Then** only 6 are displayed

### TO-OVERVIEW-14: Parent category filter removes zero-spent
**Given** parent categories [A (spent=100), B (spent=0), C (spent=50)]
**When** parentCategoryData is filtered
**Then** only [A, C] remain in the data

### TO-OVERVIEW-15: Budget percentage capped at 100
**Given** `spent = 150`, `budget = 100`
**When** budgetPct computed
**Then** `budgetPct === 100` (capped, not 150)

---

## 14. Source References

| Component / Hook          | File Path                                          |
|---------------------------|----------------------------------------------------|
| `ExpenseOverview`         | `src/components/dashboard/ExpenseOverview.tsx`    |
| `SpendingPaceCard`        | `src/components/dashboard/overview/SpendingPaceCard.tsx` |
| `WeeklyBreakdownChart`    | `src/components/dashboard/overview/WeeklyBreakdownChart.tsx` |
| `TopCategoriesCard`       | `src/components/dashboard/overview/TopCategoriesCard.tsx` |
| `CategoryPieCard`         | `src/components/dashboard/overview/CategoryPieCard.tsx` |
| `RecentTransactions`      | `src/components/dashboard/overview/RecentTransactions.tsx` |
| `MonthPicker`             | `src/components/dashboard/overview/MonthPicker.tsx` |
| `useTransactions`         | `src/hooks/useTransactions.ts`                    |
| `useParentCategories`     | `src/hooks/useCategories.ts`                      |
| `useSubcategories`        | `src/hooks/useCategories.ts`                      |
