# Low-Level Design

## Core Domain Models

### Transaction Module

```typescript
// Domain Entity
interface Transaction {
  id: string;           // UUID, primary key
  user_id: string;      // FK to auth.users, for RLS
  description: string;  // Merchant/payee name
  amount: number;       // Decimal, always positive
  category: string;     // Category name (denormalized)
  date: string;         // ISO 8601 date (YYYY-MM-DD)
  type: 'expense' | 'income';
  created_at: string;   // ISO 8601 timestamp
}

// Validation Schema (Zod)
const transactionSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['expense', 'income']),
});

// Repository Interface (React Query Hooks)
interface TransactionRepository {
  // Queries
  useTransactions(): UseQueryResult<Transaction[]>;
  
  // Mutations
  useAddTransaction(): UseMutationResult<Transaction, Error, TransactionInput>;
  useAddMultipleTransactions(): UseMutationResult<Transaction[], Error, TransactionInput[]>;
  useUpdateTransaction(): UseMutationResult<Transaction, Error, { id: string; data: Partial<Transaction> }>;
  useDeleteMultipleTransactions(): UseMutationResult<void, Error, string[]>;
}
```

### Category Module

```typescript
// Domain Entity
interface Category {
  id: string;
  user_id: string;
  name: string;
  type: string;                    // e.g., "expense", "income"
  parent_category: string | null;  // NULL = parent category
  monthly_budget: number | null;
  color: string;                   // Hex color code
  created_at: string;
}

// Hierarchy Structure
// Parent categories have parent_category = NULL
// Subcategories reference parent by name

// Example:
// { name: "Food & Dining", parent_category: null }     // Parent
// { name: "Groceries", parent_category: "Food & Dining" }  // Child
// { name: "Restaurants", parent_category: "Food & Dining" } // Child

// Validation: Transactions can only use subcategories
// Enforced by validate_transaction_category trigger
```

### Category Group Module

```typescript
// Domain Entity
interface CategoryGroup {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

// Junction Table for Many-to-Many
interface CategoryGroupMapping {
  id: string;
  user_id: string;
  group_id: string;      // FK to category_groups
  category_id: string;   // FK to categories
  created_at: string;
}

// Aggregation: Groups can contain multiple categories
// A category can belong to multiple groups
```

### Store Module

```typescript
// Domain Entity
interface Store {
  id: string;
  user_id: string;
  name: string;           // Store/merchant name pattern
  category_name: string;  // Auto-assign to this category
  created_at: string;
  updated_at: string;
}

// Usage: During CSV import, match transaction description
// against store names for automatic categorization
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        auth.users                               │
│                    (Supabase managed)                           │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                   │
│ email                                                           │
│ encrypted_password                                              │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 1:N (user_id FK, RLS enforced)
         │
         ├─────────────────────────────────────────────────────────┐
         │                                                         │
         ▼                                                         ▼
┌─────────────────────┐                               ┌─────────────────────┐
│    transactions     │                               │     categories      │
├─────────────────────┤                               ├─────────────────────┤
│ id (uuid, PK)       │                               │ id (uuid, PK)       │
│ user_id (uuid, FK)  │                               │ user_id (uuid, FK)  │
│ description (text)  │                               │ name (text)         │
│ amount (numeric)    │◀──────category name──────────▶│ type (text)         │
│ category (text)     │                               │ parent_category     │
│ date (date)         │                               │ monthly_budget      │
│ type (text)         │                               │ color (text)        │
│ created_at          │                               │ created_at          │
└─────────────────────┘                               └─────────────────────┘
                                                               │
                                                               │ 1:N
                                                               ▼
┌─────────────────────┐                               ┌─────────────────────┐
│       stores        │                               │category_group_mappings│
├─────────────────────┤                               ├─────────────────────┤
│ id (uuid, PK)       │                               │ id (uuid, PK)       │
│ user_id (uuid, FK)  │                               │ user_id (uuid, FK)  │
│ name (text)         │                               │ category_id (uuid)  │
│ category_name (text)│                               │ group_id (uuid)     │
│ created_at          │                               │ created_at          │
│ updated_at          │                               └─────────────────────┘
└─────────────────────┘                                        │
                                                               │ N:1
                                                               ▼
                                                      ┌─────────────────────┐
                                                      │   category_groups   │
                                                      ├─────────────────────┤
                                                      │ id (uuid, PK)       │
                                                      │ user_id (uuid, FK)  │
                                                      │ name (text)         │
                                                      │ description (text)  │
                                                      │ color (text)        │
                                                      │ created_at          │
                                                      │ updated_at          │
                                                      └─────────────────────┘
```

### SQL Schema Definitions

```sql
-- Transactions Table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories Table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_category TEXT,  -- Self-referencing by name
  monthly_budget NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)  -- Unique name per user
);

-- Category Groups Table
CREATE TABLE public.category_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Category Group Mappings (Junction Table)
CREATE TABLE public.category_group_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, category_id)  -- Prevent duplicate mappings
);

-- Stores Table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)  -- Unique store name per user
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_category);
CREATE INDEX idx_stores_user ON stores(user_id);
CREATE INDEX idx_group_mappings_group ON category_group_mappings(group_id);
CREATE INDEX idx_group_mappings_category ON category_group_mappings(category_id);
```

---

## API Specifications

### REST API (Supabase PostgREST)

#### Transactions

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/rest/v1/transactions` | List transactions | - | `Transaction[]` |
| GET | `/rest/v1/transactions?id=eq.{id}` | Get single | - | `Transaction` |
| POST | `/rest/v1/transactions` | Create | `TransactionInput` | `Transaction` |
| PATCH | `/rest/v1/transactions?id=eq.{id}` | Update | `Partial<Transaction>` | `Transaction` |
| DELETE | `/rest/v1/transactions?id=in.({ids})` | Bulk delete | - | `204 No Content` |

**Query Parameters:**
- `select`: Column selection
- `order`: Sorting (e.g., `date.desc`)
- `limit`, `offset`: Pagination
- `date=gte.{date}`: Date filtering

#### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rest/v1/categories` | List all |
| GET | `/rest/v1/categories?parent_category=is.null` | Parent only |
| GET | `/rest/v1/categories?parent_category=not.is.null` | Subcategories |
| POST | `/rest/v1/categories` | Create |
| PATCH | `/rest/v1/categories?id=eq.{id}` | Update |
| DELETE | `/rest/v1/categories?id=eq.{id}` | Delete |

### Edge Functions API

#### POST /functions/v1/categorize-transactions

**Purpose:** AI-powered transaction categorization

**Request:**
```json
{
  "transactions": [
    {
      "description": "AMAZON.COM",
      "amount": 49.99,
      "date": "2024-01-15"
    }
  ],
  "categories": [
    { "name": "Shopping", "parent": null },
    { "name": "Online Shopping", "parent": "Shopping" }
  ]
}
```

**Response:**
```json
{
  "categorizations": [
    {
      "description": "AMAZON.COM",
      "suggested_category": "Online Shopping",
      "confidence": 0.92
    }
  ]
}
```

**Error Responses:**
- `400`: Invalid input format
- `401`: Missing/invalid auth token
- `429`: Rate limit exceeded
- `500`: AI service unavailable

---

## Component Design

### CSVImporter Component

```typescript
// State Machine
type ImportState = 
  | 'idle'           // Initial state
  | 'file-selected'  // File chosen
  | 'parsing'        // CSV being parsed
  | 'mapping'        // User mapping columns
  | 'categorizing'   // AI categorization in progress
  | 'preview'        // Showing preview
  | 'importing'      // Saving to database
  | 'complete'       // Success
  | 'error';         // Failed

// Component Structure
CSVImporter
├── FileDropzone          // Drag-drop file upload
├── ColumnMapper          // Map CSV → Transaction fields
├── TransactionPreview    // Review before import
├── CategorizationStatus  // AI progress indicator
└── ImportActions         // Confirm/Cancel buttons

// Key Functions
parseCSV(file: File): ParsedCSV
mapColumns(csv: ParsedCSV, mapping: ColumnMap): Transaction[]
categorizeTransactions(transactions: Transaction[]): Promise<CategorizedTransaction[]>
importTransactions(transactions: Transaction[]): Promise<void>
```

### TrendsAnalysis Component

```typescript
// Component Structure
TrendsAnalysis
├── TrendsControls        // Time range, filters
├── TrendsInsights        // Key metrics cards
├── MonthlyTrendsChart    // Line chart
├── CategoryComparisonChart // Bar chart
├── YearOverYearChart     // Comparison chart
├── BudgetPerformanceChart // Budget vs actual
└── ParentCategoryTable   // Detailed breakdown

// Data Flow
useTransactions() → filterByTimeRange() → calculateTrends() → renderCharts()

// Key Calculations (trendsDataUtils.ts)
getMonthlyTrends(transactions): MonthlyData[]
getCategoryComparisonData(transactions, categories): CategoryData[]
getYearOverYearData(transactions): YearComparisonData
getBudgetPerformance(transactions, categories): BudgetData[]
```

---

## Error Handling Strategy

### Client-Side

```typescript
// Global error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to monitoring service
    console.error('React Error:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// API error handling
const handleApiError = (error: PostgrestError) => {
  switch (error.code) {
    case '23505': // Unique violation
      toast.error('This item already exists');
      break;
    case '23503': // Foreign key violation
      toast.error('Related item not found');
      break;
    case '42501': // RLS violation
      toast.error('Access denied');
      break;
    default:
      toast.error('An error occurred');
  }
};
```

### Server-Side (Edge Functions)

```typescript
// Standard error response format
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

// Error handling in edge function
try {
  // ... logic
} catch (error) {
  console.error('Edge function error:', error);
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      }
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

---

## Testing Strategy

### Unit Tests (Planned)

```typescript
// Example: trendsDataUtils.test.ts
describe('getMonthlyTrends', () => {
  it('should group transactions by month', () => {
    const transactions = [
      { date: '2024-01-15', amount: 100, type: 'expense' },
      { date: '2024-01-20', amount: 50, type: 'expense' },
      { date: '2024-02-10', amount: 75, type: 'expense' },
    ];
    
    const result = getMonthlyTrends(transactions);
    
    expect(result).toHaveLength(2);
    expect(result[0].total).toBe(150);
    expect(result[1].total).toBe(75);
  });
});
```

### Integration Tests (Planned)

```typescript
// Example: CSVImporter.test.tsx
describe('CSVImporter', () => {
  it('should parse valid CSV and show preview', async () => {
    render(<CSVImporter />);
    
    const file = new File(['date,description,amount\n2024-01-15,Test,100'], 'test.csv');
    await userEvent.upload(screen.getByTestId('file-input'), file);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
```
