
import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';

const ExpenseOverview = () => {
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  if (transactionsLoading || categoriesLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Calculate spending by category for current month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const currentMonthTransactions = transactions.filter(t => 
    t.date.startsWith(currentMonth) && t.type === 'expense'
  );

  const categorySpending = categories.map(cat => {
    const spent = currentMonthTransactions
      .filter(t => t.category === cat.name)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      category: cat.name,
      amount: spent,
      color: cat.color,
      budget: Number(cat.monthly_budget)
    };
  }).filter(cat => cat.amount > 0);

  // Calculate weekly trends for current month
  const weeklyTrend = [];
  for (let week = 1; week <= 4; week++) {
    const weekStart = week === 1 ? 1 : (week - 1) * 7;
    const weekEnd = week * 7;
    
    const weekTransactions = currentMonthTransactions.filter(t => {
      const day = parseInt(t.date.split('-')[2]);
      return day >= weekStart && day < weekEnd;
    });
    
    const weekSpending = weekTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    weeklyTrend.push({
      week: `Week ${week}`,
      spending: weekSpending
    });
  }

  const totalSpending = categorySpending.reduce((sum, item) => sum + item.amount, 0);
  const totalBudget = categories.reduce((sum, cat) => sum + Number(cat.monthly_budget), 0);
  const fixedExpenses = categories
    .filter(cat => cat.type === 'fixed')
    .reduce((sum, cat) => sum + Number(cat.monthly_budget), 0);
  const variableExpenses = totalSpending - fixedExpenses;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Spending</h3>
          <p className="text-2xl font-bold">${totalSpending.toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">This month</p>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Budget</h3>
          <p className="text-2xl font-bold">${totalBudget.toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">Monthly budget</p>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Remaining</h3>
          <p className="text-2xl font-bold">${(totalBudget - totalSpending).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">Available budget</p>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card className="p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
        {categorySpending.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categorySpending}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="amount"
                label={({ category, amount }) => `${category}: $${amount.toFixed(0)}`}
              >
                {categorySpending.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500">
            No expenses this month
          </div>
        )}
      </Card>

      {/* Bar Chart */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Weekly Spending Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Bar dataKey="spending" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Breakdown */}
      <Card className="p-6 lg:col-span-3">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {categorySpending.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="font-medium">{category.category}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">${category.amount.toFixed(2)}</span>
                <div className="text-sm text-slate-500">
                  {totalSpending > 0 ? ((category.amount / totalSpending) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          ))}
          {categorySpending.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              No expenses recorded this month
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ExpenseOverview;
