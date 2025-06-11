
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

  // Calculate weekly trends for the display period
  const weeklyTrend = [];
  const weeks = Math.min(12, Math.ceil(displayTransactions.length / 20)); // Show up to 12 weeks
  
  for (let week = 0; week < weeks; week++) {
    const weekTransactions = displayTransactions.slice(week * 20, (week + 1) * 20);
    const weekSpending = weekTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    weeklyTrend.push({
      week: `Week ${week + 1}`,
      spending: weekSpending
    });
  }

  const totalSpending = parentCategorySpending.reduce((sum, item) => sum + item.amount, 0);
  const totalBudget = parentCategories.reduce((sum, cat) => {
    const relatedSubcategories = subcategories.filter(sub => sub.parent_category === cat.name);
    return sum + relatedSubcategories.reduce((subSum, sub) => subSum + Number(sub.monthly_budget), 0);
  }, 0);
  const totalTransactions = displayTransactions.length;

  const timeRangeText = recentTransactions.length > 0 ? 'Last 3 months' : 'All time';

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
        <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
        {parentCategorySpending.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={parentCategorySpending}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="amount"
                label={({ category, amount }) => `${category}: $${amount.toFixed(0)}`}
              >
                {parentCategorySpending.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500">
            No expenses found
          </div>
        )}
      </Card>

      {/* Bar Chart */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Spending Trend</h3>
        {weeklyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Bar dataKey="spending" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500">
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
