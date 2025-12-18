# Spend Tracker Frontend

## Overview

Modern React SPA for personal finance tracking, built with:
- **React 18** + TypeScript
- **Vite** for fast development
- **Tailwind CSS** + shadcn/ui for styling
- **TanStack Query** for server state
- **Recharts** for data visualization

## Quick Start

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

```bash
# Clone repository
git clone <repository-url>
cd spend-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment

The app connects to Supabase. Configuration is in `src/integrations/supabase/client.ts`:

```typescript
const SUPABASE_URL = "https://oskhweltnnifpzxahyij.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs...";
```

---

## Project Structure

```
src/
├── components/
│   ├── dashboard/           # Feature components
│   │   ├── BudgetManager.tsx
│   │   ├── BudgetPerformanceChart.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── CategoryComparisonChart.tsx
│   │   ├── CategoryDialog.tsx
│   │   ├── CategoryGrid.tsx
│   │   ├── CategoryGroupDialog.tsx
│   │   ├── CategoryGroupManager.tsx
│   │   ├── CategoryManager.tsx
│   │   ├── CSVImporter.tsx
│   │   ├── DashboardHeaderActions.tsx
│   │   ├── EditTransactionDialog.tsx
│   │   ├── ExpenseOverview.tsx
│   │   ├── MonthlyTrendsChart.tsx
│   │   ├── ParentCategoryComparison.tsx
│   │   ├── ParentCategoryTable.tsx
│   │   ├── SmartTransactionDialog.tsx
│   │   ├── StoreManager.tsx
│   │   ├── TransactionFilters.tsx
│   │   ├── TransactionsList.tsx
│   │   ├── TrendsAnalysis.tsx
│   │   ├── TrendsControls.tsx
│   │   ├── TrendsInsights.tsx
│   │   └── YearOverYearChart.tsx
│   │
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── chart.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── ... (40+ components)
│   │
│   ├── theme-provider.tsx   # Dark/light mode
│   └── theme-toggle.tsx
│
├── contexts/
│   └── AuthContext.tsx      # Authentication state
│
├── hooks/
│   ├── useCategories.ts     # Category CRUD
│   ├── useCategoryGroups.ts # Group management
│   ├── useStores.ts         # Store mappings
│   ├── useTransactionFilters.ts
│   ├── useTransactions.ts   # Transaction CRUD
│   └── useMobile.ts         # Responsive detection
│
├── pages/
│   ├── Auth.tsx             # Login/signup
│   ├── Dashboard.tsx        # Main app
│   ├── Index.tsx            # Landing page
│   └── NotFound.tsx         # 404
│
├── utils/
│   ├── groupTrendsDataUtils.ts
│   └── trendsDataUtils.ts   # Chart calculations
│
├── integrations/
│   └── supabase/
│       ├── client.ts        # Supabase client
│       └── types.ts         # Generated types
│
├── lib/
│   ├── utils.ts             # Utility functions
│   └── validation.ts        # Zod schemas
│
├── App.tsx                  # Root component
├── App.css                  # Global styles
├── index.css                # Tailwind config
└── main.tsx                 # Entry point
```

---

## Key Components

### Dashboard Components

| Component | Purpose |
|-----------|---------|
| `ExpenseOverview` | Summary cards showing totals and recent transactions |
| `TransactionsList` | Filterable, sortable transaction table |
| `TrendsAnalysis` | Charts and analytics dashboard |
| `BudgetManager` | Budget setting and tracking |
| `CategoryManager` | Category CRUD with hierarchy |
| `CSVImporter` | File upload and parsing |

### UI Components (shadcn)

Pre-built, accessible components:
- Forms: `Button`, `Input`, `Select`, `Checkbox`
- Feedback: `Toast`, `Dialog`, `Alert`
- Layout: `Card`, `Tabs`, `Table`
- Data: `Chart` (Recharts wrapper)

---

## State Management

### Server State (TanStack Query)

```typescript
// Fetching data
const { data, isLoading, error } = useTransactions();

// Mutations with optimistic updates
const addTransaction = useAddTransaction();
addTransaction.mutate(newTransaction, {
  onSuccess: () => {
    queryClient.invalidateQueries(['transactions']);
  }
});
```

### Client State

- **React Context** for auth state
- **useState** for local component state
- **No Redux** - server state covers most needs

---

## Routing

Using React Router v6:

```typescript
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<Auth />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Protected Routes

Authentication check in `Dashboard.tsx`:
```typescript
useEffect(() => {
  if (!loading && !user) {
    navigate('/auth');
  }
}, [user, loading]);
```

---

## Styling

### Tailwind CSS

Utility-first CSS with custom design tokens in `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      primary: { ... },
      secondary: { ... },
    }
  }
}
```

### CSS Variables

Defined in `index.css`:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### Component Styling

Use `cn()` utility for conditional classes:
```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-styles",
  isActive && "active-styles",
  className
)}>
```

---

## Data Visualization

Using Recharts with shadcn wrapper:

```typescript
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";

<ChartContainer config={chartConfig}>
  <BarChart data={data}>
    <XAxis dataKey="name" />
    <YAxis />
    <ChartTooltip />
    <Bar dataKey="value" fill="var(--color-primary)" />
  </BarChart>
</ChartContainer>
```

---

## Build & Deploy

### Development

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Production Build

```bash
npm run build
# Output in dist/
```

Build output:
- `dist/index.html` - Entry HTML
- `dist/assets/` - JS/CSS bundles (hashed)

### Deployment

**Via Lovable:**
- Automatic deployment on code changes
- Custom domain support in settings

**Manual:**
```bash
# Build
npm run build

# Deploy to any static host
# (Netlify, Vercel, CloudFlare Pages, etc.)
```

---

## Performance

### Optimizations Applied

- **Code splitting** via React.lazy (planned)
- **Image lazy loading** via native loading="lazy"
- **Query caching** via TanStack Query
- **Memoization** for expensive calculations

### Lighthouse Targets

| Metric | Target | Current |
|--------|--------|---------|
| Performance | >90 | ~85 |
| Accessibility | >90 | ~80 |
| Best Practices | >90 | ~95 |
| SEO | >90 | ~90 |

---

## Testing (Planned)

### Unit Tests

```bash
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:coverage
```

### Component Tests

Using Vitest + React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { TransactionsList } from './TransactionsList';

test('renders transaction list', () => {
  render(<TransactionsList />);
  expect(screen.getByRole('table')).toBeInTheDocument();
});
```

---

## Contributing

1. Create feature branch from `main`
2. Make changes following code style
3. Test locally
4. Submit PR for review

### Code Style

- ESLint + Prettier configured
- TypeScript strict mode
- shadcn component patterns
