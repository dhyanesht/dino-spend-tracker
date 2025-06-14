
import React from 'react';
import { Card } from '@/components/ui/card';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories, useParentCategories, useSubcategories } from '@/hooks/useCategories';
import { DashboardSkeleton } from '@/components/ui/enhanced-skeleton';
import { NoTransactionsEmpty, NoDataEmpty } from '@/components/ui/empty-state';
import { EnhancedPieChart, EnhancedBarChart } from '@/components/ui/enhanced-chart';

const ExpenseOverview = () => {
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: parentCategories = [], isLoading: parentCategoriesLoading } = useParentCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();

  if (transactionsLoading || parentCategoriesLoading || subcategoriesLoading) {
    return <DashboardSkeleton />;
  }

  // Get the last 3 months of data instead of just current month
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoKey = threeMonthsAgo.toISOString().slice(0, 7);

  const recentTransactions = transactions.filter(t => 
    t.date >= threeMonthsAgoKey && t.type === 'expense'
  );

  // If no recent transactions, show all expenses
  const displayTransactions = recentTransactions.length > 0 ? recentTransactions : 
    transactions.filter(t => t.type === 'expense');

  if (displayTransactions.length === 0) {
    return (
      <NoTransactionsEmpty 
        onImport={() => {
          // Navigate to import tab
          const importTab = document.querySelector('[value="import"]') as HTMLElement;
          importTab?.click();
        }}
      />
    );
  }

  // Create a mapping of subcategory to parent category
  const subcategoryToParent = subcategories.reduce((acc, sub) => {
    acc[sub.name] = sub.parent_category;
    return acc;
  }, {} as Record<string, string | null>);

  // Aggregate spending by parent categories
  const parentCategorySpending = parentCategories.map(parentCat => {
    // Get all subcategories for this parent
    const relatedSubcategories = subcategories.filter(sub => sub.parent_category === parentCat.name);
    
    // Calculate total spending for this parent category
    const spent = displayTransactions
      .filter(t => {
        // Check if transaction category is a subcategory of this parent
        return relatedSubcategories.some(sub => sub.name === t.category);
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Calculate total budget for this parent category (sum of all subcategory budgets)
    const totalBudget = relatedSubcategories.reduce((sum, sub) => sum + Number(sub.monthly_budget), 0);
    
    return {
      category: parentCat.name,
      amount: spent,
      color: parentCat.color,
      budget: totalBudget,
      subcategoryCount: relatedSubcategories.length
    };
  }).filter(cat => cat.amount > 0);

  // Improved weekly trends with better labeling
  const getWeeklyTrends = () => {
    const weeklyData = [];
    const now = new Date();
    
    // Get last 8 weeks for better visualization
    for (let i = 7; i >= 0; i--) {
      const weekDate = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const monthName = weekDate.toLocaleDateString('en-US', { month: 'short' });
      const day = weekDate.getDate();
      const weekLabel = `${monthName} ${day}`;
      
      // Filter transactions for this week
      const weekStart = new Date(weekDate);
      weekStart.setDate(weekDate.getDate() - weekDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekTransactions = displayTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= weekStart && transactionDate <= weekEnd;
      });
      
      const weekSpending = weekTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      weeklyData.push({
        week: weekLabel,
        spending: weekSpending,
        fullLabel: `Week of ${weekStart.toLocaleDateString()}`
      });
    }
    
    return weeklyData;
  };

  const weeklyTrend = getWeeklyTrends();
  const totalSpending = parentCategorySpending.reduce((sum, item) => sum + item.amount, 0);
  const totalBudget = parentCategories.reduce((sum, cat) => {
    const relatedSubcategories = subcategories.filter(sub => sub.parent_category === cat.name);
    return sum + relatedSubcategories.reduce((subSum, sub) => subSum + Number(sub.monthly_budget), 0);
  }, 0);
  const totalTransactions = displayTransactions.length;
  const timeRangeText = recentTransactions.length > 0 ? 'Last 3 months' : 'All time';

  const categoryColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Spending</h3>
          <p className="text-2xl font-bold">${totalSpending.toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">{timeRangeText}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Transactions</h3>
          <p className="text-2xl font-bold">{totalTransactions}</p>
          <p className="text-sm opacity-90 mt-1">Expense transactions</p>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Monthly Budget</h3>
          <p className="text-2xl font-bold">${totalBudget.toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">Total budget</p>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card className="p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Spending by Category</h3>
        {parentCategorySpending.length > 0 ? (
          <EnhancedPieChart
            data={parentCategorySpending}
            dataKey="amount"
            nameKey="category"
            colors={parentCategorySpending.map(cat => cat.color)}
            title="Category Spending"
          />
        ) : (
          <NoDataEmpty />
        )}
      </Card>

      {/* Bar Chart */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Weekly Spending Trend</h3>
        <p className="text-sm text-muted-foreground mb-4">Last 8 weeks of spending activity</p>
        {weeklyTrend.length > 0 ? (
          <EnhancedBarChart
            data={weeklyTrend}
            dataKey="spending"
            xAxisKey="week"
            title="Weekly Spending"
            color="hsl(var(--primary))"
          />
        ) : (
          <NoDataEmpty />
        )}
      </Card>

      {/* Category Breakdown */}
      <Card className="p-6 lg:col-span-3">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Parent Category Breakdown</h3>
        <div className="space-y-3">
          {parentCategorySpending.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                ></div>
                <div>
                  <span className="font-medium dark:text-white">{category.category}</span>
                  <div className="text-sm text-muted-foreground">
                    {category.subcategoryCount} subcategories
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-semibold dark:text-white">${category.amount.toFixed(2)}</span>
                <div className="text-sm text-muted-foreground">
                  {totalSpending > 0 ? ((category.amount / totalSpending) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          ))}
          {parentCategorySpending.length === 0 && (
            <NoDataEmpty />
          )}
        </div>
      </Card>
    </div>
  );
};

export default ExpenseOverview;
