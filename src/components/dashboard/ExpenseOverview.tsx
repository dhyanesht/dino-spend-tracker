import React, { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useParentCategories, useSubcategories } from '@/hooks/useCategories';
import { isExpense, sumExpenses, sumTrueIncome, sumRefunds, sumReimbursements, netCashFlow, withPendingAsPosted } from '@/lib/transactionMath';
import { DashboardSkeleton } from '@/components/ui/enhanced-skeleton';
import { NoTransactionsEmpty } from '@/components/ui/empty-state';
import MonthPicker from './overview/MonthPicker';
import SpendingPaceCard from './overview/SpendingPaceCard';
import TopCategoriesCard from './overview/TopCategoriesCard';
import WeeklyBreakdownChart from './overview/WeeklyBreakdownChart';
import RecentTransactions from './overview/RecentTransactions';
import CategoryPieCard from './overview/CategoryPieCard';
import { CashFlowCard } from './overview/CashFlowCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ExpenseOverviewProps {
  setActiveTab: (tab: string) => void;
}

const ExpenseOverview = ({ setActiveTab }: ExpenseOverviewProps) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [includePending, setIncludePending] = useState(false);
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: parentCategories = [], isLoading: parentCategoriesLoading } = useParentCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();

  if (transactionsLoading || parentCategoriesLoading || subcategoriesLoading) {
    return <DashboardSkeleton />;
  }

  const working = includePending ? withPendingAsPosted(transactions) : transactions;

  if (working.filter(isExpense).length === 0) {
    return <NoTransactionsEmpty onImport={() => setActiveTab('import')} />;
  }

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const now = new Date();
  const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;

  // Filter to selected month expenses (transfers/refunds/reimbursements excluded via isExpense)
  const monthExpenses = working.filter(
    (t) => t.date.startsWith(monthKey) && isExpense(t)
  );

  // Last month comparison — spending up to the same day
  const prevMonth = new Date(year, month - 1, 1);
  const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthAtThisPoint = working
    .filter((t) => t.date.startsWith(prevKey) && isExpense(t))
    .filter((t) => new Date(t.date).getDate() <= daysElapsed)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSpent = monthExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

  // Budget: sum of all subcategory budgets
  const totalBudget = subcategories.reduce((sum, sub) => sum + Number(sub.monthly_budget || 0), 0);

  // Parent category spending
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

  // Recent transactions for selected month, sorted newest first
  const recentMonthTx = [...monthExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const trueIncome = sumTrueIncome(working);
  const refunds = sumRefunds(working);
  const reimbursements = sumReimbursements(working);
  const cashFlow = netCashFlow(working);

  return (
    <div className="space-y-6">
      {/* Month Picker */}
      <div className="flex items-center justify-between">
        <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        <div className="flex items-center gap-2">
          <Switch id="include-pending" checked={includePending} onCheckedChange={setIncludePending} />
          <Label htmlFor="include-pending" className="text-sm">Include pending</Label>
        </div>
      </div>

      {/* Cash Flow + Spending Pace Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CashFlowCard
            trueIncome={trueIncome}
            expenses={totalSpent}
            refunds={refunds}
            reimbursements={reimbursements}
            netCashFlow={cashFlow}
            includePending={includePending}
          />
        </div>
        <div className="lg:col-span-2">
          <SpendingPaceCard
            totalSpent={totalSpent}
            totalBudget={totalBudget}
            daysElapsed={daysElapsed}
            daysInMonth={daysInMonth}
            lastMonthAtThisPoint={lastMonthAtThisPoint}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCategoriesCard categories={parentCategoryData} />
        <CategoryPieCard
          data={parentCategoryData.map((c) => ({
            name: c.name,
            amount: c.spent,
            color: c.color,
          }))}
        />
      </div>

      {/* Weekly breakdown */}
      <WeeklyBreakdownChart transactions={monthExpenses} selectedMonth={selectedMonth} />

      {/* Recent transactions */}
      <RecentTransactions
        transactions={recentMonthTx}
        onViewAll={() => setActiveTab('transactions')}
      />
    </div>
  );
};

export default ExpenseOverview;
