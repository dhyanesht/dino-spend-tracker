# Overview Page Rework — Research & Ideas

## Problem
The current overview shows **all-time spending** which is meaningless without context. Users care about time-bounded, actionable insights.

## Research — What Top Budget Apps Do

### Copilot Money (Apple Design Award Finalist)
- Dashboard graph shows **current month** spending over time
- "To Review" section for uncategorized transactions
- **Trending budget categories** — which categories are spiking
- Upcoming recurring expenses
- Net income summary

### YNAB (You Need A Budget)
- **Current month** budget categories: Assigned / Spent / Remaining
- Category-level budget health
- Income vs. Spending 6-month snapshot
- "Ready to Assign" — money available to budget

### Monarch Money
- Net income this month
- Spending by category (current month)
- Cash flow chart (income vs expenses)
- Recurring expense tracking

## Design Principles
1. **Time-bounded by default** — always show current month
2. **Actionable** — show what needs attention (over-budget, unusual spending)
3. **Comparative** — always compare to something (last month, budget, average)
4. **Glanceable** — key numbers visible without scrolling

## New Overview Sections

### 1. Month Header with Navigation
- Month/year picker to switch months
- "This Month" quick reset button

### 2. Spending Pace Card (Hero)
- Total spent this month: **$X**
- Budget: **$Y** → remaining: **$Z**
- Progress bar showing budget usage
- Days remaining in month
- Daily pace: "You're spending $XX/day — budget allows $YY/day"
- Color: green (under pace), yellow (close), red (over)

### 3. Month-over-Month Comparison
- Simple: "You've spent **12% more** than last month at this point"
- Mini sparkline or comparison bar

### 4. Top Categories This Month
- Top 5 categories by spend
- Each shows: spent / budget / % used
- Small progress bars with color coding
- Click to drill into category

### 5. Weekly Breakdown (within selected month)
- Bar chart: Week 1, Week 2, Week 3, Week 4
- Shows spending distribution within the month

### 6. Recent Transactions (Quick View)
- Last 5 transactions
- "View All" link to transactions tab

### 7. Category Pie Chart
- Keep but scope to selected month only
