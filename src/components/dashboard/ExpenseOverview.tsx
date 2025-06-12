import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories, useParentCategories, useSubcategories } from '@/hooks/useCategories';

const ExpenseOverview = () => {
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: parentCategories = [], isLoading: parentCategoriesLoading } = useParentCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();

  if (transactionsLoading || parentCategoriesLoading || subcategoriesLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
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
    const currentWeek = getWeekNumber(now);
    
    // Get last 8 weeks for better visualization
    for (let i = 7; i >= 0; i--) {
      const weekDate = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekNum = getWeekNumber(weekDate);
      const monthName = weekDate.toLocaleDateString('en-US', { month: 'short' });
      const weekLabel = `${monthName} W${weekNum}`;
      
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

  // Helper function to get week number
  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  const weeklyTrend = getWeeklyTrends();

  const totalSpending = parentCategorySpending.reduce((sum, item) => sum + item.amount, 0);
  const totalBudget = parentCategories.reduce((sum, cat) => {
    const relatedSubcategories = subcategories.filter(sub => sub.parent_category === cat.name);
    return sum + relatedSubcategories.reduce((subSum, sub) => subSum + Number(sub.monthly_budget), 0);
  }, 0);
  const totalTransactions = displayTransactions.length;

  const timeRangeText = recentTransactions.length > 0 ? 'Last 3 months' : 'All time';

  // Custom tooltip for pie chart
  const renderPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.payload.category}</p>
          <p className="text-blue-600">${data.value.toFixed(2)}</p>
          <p className="text-sm text-gray-500">
            {((data.value / totalSpending) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const renderBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.payload.fullLabel}</p>
          <p className="text-blue-600">${data.value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

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

      {/* Pie Chart - Fixed overflow */}
      <Card className="p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
        {parentCategorySpending.length > 0 ? (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={parentCategorySpending}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="amount"
                  label={false}
                >
                  {parentCategorySpending.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={renderPieTooltip} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color }}>
                      {value}: ${parentCategorySpending.find(cat => cat.category === value)?.amount.toFixed(0)}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-500">
            No expenses found
          </div>
        )}
      </Card>

      {/* Bar Chart - Improved with better labels */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Weekly Spending Trend</h3>
        <p className="text-sm text-slate-600 mb-4">Last 8 weeks of spending activity</p>
        {weeklyTrend.length > 0 ? (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip content={renderBarTooltip} />
                <Bar dataKey="spending" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-500">
            No transaction data available
          </div>
        )}
      </Card>

      {/* Category Breakdown */}
      <Card className="p-6 lg:col-span-3">
        <h3 className="text-lg font-semibold mb-4">Parent Category Breakdown</h3>
        <div className="space-y-3">
          {parentCategorySpending.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                ></div>
                <div>
                  <span className="font-medium">{category.category}</span>
                  <div className="text-sm text-slate-500">
                    {category.subcategoryCount} subcategories
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-semibold">${category.amount.toFixed(2)}</span>
                <div className="text-sm text-slate-500">
                  {totalSpending > 0 ? ((category.amount / totalSpending) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          ))}
          {parentCategorySpending.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              No expenses recorded
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ExpenseOverview;
