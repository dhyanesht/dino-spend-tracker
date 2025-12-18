# Use Cases

## Use Case Summary

| ID | Use Case | Actor | Description |
|----|----------|-------|-------------|
| UC-01 | Import Transactions | User | Upload CSV bank statements with automatic parsing |
| UC-02 | Categorize Spending | User | Assign categories/subcategories to transactions |
| UC-03 | View Dashboard | User | See spending overview, totals, recent transactions |
| UC-04 | Analyze Trends | User | View monthly trends, YoY comparisons, category breakdowns |
| UC-05 | Manage Budgets | User | Set monthly budgets per category, track adherence |
| UC-06 | Store Mapping | User | Auto-categorize transactions by merchant name |
| UC-07 | Category Groups | User | Group categories for aggregate reporting |
| UC-08 | User Authentication | User | Sign up, login, logout with email/password |

---

## Detailed Use Cases

### UC-01: Import Transactions

**Primary Actor**: Authenticated User

**Preconditions**:
- User is logged in
- User has a CSV file from their bank

**Main Success Scenario**:
1. User navigates to Import tab
2. User selects CSV file from their device
3. System parses CSV and displays preview
4. User maps CSV columns to transaction fields (date, description, amount)
5. User optionally triggers AI-powered categorization
6. System validates all transactions
7. System inserts transactions into database
8. Dashboard updates with new data

**Alternate Flows**:
- **A1**: Invalid CSV format
  - System displays error message with expected format
  - User can retry with correct file
- **A2**: Duplicate transactions detected
  - System highlights potential duplicates
  - User can choose to skip or import anyway
- **A3**: AI categorization fails
  - System falls back to "Uncategorized" category
  - User can manually categorize later

**Postconditions**:
- New transactions are persisted in database
- Dashboard reflects updated totals

---

### UC-02: Categorize Spending

**Primary Actor**: Authenticated User

**Preconditions**:
- User is logged in
- Transactions exist in the system

**Main Success Scenario**:
1. User views transaction list
2. User selects a transaction to edit
3. User chooses a category from dropdown
4. System validates category (must be subcategory, not parent)
5. System updates transaction
6. Analytics recalculate

**Alternate Flows**:
- **A1**: User creates new category
  - System opens category dialog
  - User enters name, selects parent, sets budget
  - System creates category and assigns to transaction

---

### UC-03: View Dashboard

**Primary Actor**: Authenticated User

**Preconditions**:
- User is logged in

**Main Success Scenario**:
1. User navigates to Overview tab
2. System fetches user's transactions, categories, and budgets
3. System calculates:
   - Total spending for current month
   - Spending by category
   - Recent transactions
4. System renders dashboard components
5. User views spending summary

**Performance Requirements**:
- Dashboard load time: < 2 seconds
- Data freshness: Real-time (optimistic updates)

---

### UC-04: Analyze Trends

**Primary Actor**: Authenticated User

**Preconditions**:
- User is logged in
- User has at least 2 months of transaction data

**Main Success Scenario**:
1. User navigates to Trends tab
2. System calculates:
   - Monthly spending trends
   - Category comparisons
   - Year-over-year analysis
   - Budget performance
3. System renders interactive charts
4. User can filter by category or time range
5. User can toggle between parent categories and category groups

---

### UC-05: Manage Budgets

**Primary Actor**: Authenticated User

**Preconditions**:
- User is logged in
- Categories exist

**Main Success Scenario**:
1. User navigates to Budget tab
2. System displays categories with current budgets
3. User sets/updates monthly budget for a category
4. System saves budget
5. Budget tracking updates across all views

---

### UC-06: Store Mapping

**Primary Actor**: Authenticated User

**Preconditions**:
- User is logged in
- Categories exist

**Main Success Scenario**:
1. User navigates to Categories > Store Mappings
2. User creates mapping: Store Name → Category
3. System saves mapping
4. Future imports auto-categorize matching transactions

---

### UC-07: Category Groups

**Primary Actor**: Authenticated User

**Preconditions**:
- User is logged in
- Categories exist

**Main Success Scenario**:
1. User navigates to Categories > Category Groups
2. User creates a group (e.g., "Essential Expenses")
3. User assigns categories to the group
4. Trends analysis can aggregate by groups

---

### UC-08: User Authentication

**Primary Actor**: Anonymous User

**Main Success Scenario (Sign Up)**:
1. User navigates to /auth
2. User enters email and password
3. System validates input
4. System creates account in Supabase Auth
5. User is redirected to dashboard

**Main Success Scenario (Login)**:
1. User navigates to /auth
2. User enters credentials
3. System authenticates with Supabase
4. User is redirected to dashboard

**Main Success Scenario (Logout)**:
1. User clicks logout button
2. System invalidates session
3. User is redirected to auth page
