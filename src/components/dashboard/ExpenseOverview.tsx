
import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const ExpenseOverview = () => {
  // Mock data for demonstration
  const monthlySpending = [
    { category: 'Food & Dining', amount: 850, color: '#3B82F6' },
    { category: 'Transportation', amount: 420, color: '#10B981' },
    { category: 'Entertainment', amount: 320, color: '#F59E0B' },
    { category: 'Shopping', amount: 680, color: '#EF4444' },
    { category: 'Utilities', amount: 280, color: '#8B5CF6' },
    { category: 'Healthcare', amount: 150, color: '#06B6D4' },
  ];

  const weeklyTrend = [
    { week: 'Week 1', spending: 520 },
    { week: 'Week 2', spending: 780 },
    { week: 'Week 3', spending: 650 },
    { week: 'Week 4', spending: 890 },
  ];

  const totalSpending = monthlySpending.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Total Spending</h3>
          <p className="text-2xl font-bold">${totalSpending.toLocaleString()}</p>
          <p className="text-sm opacity-90 mt-1">This month</p>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Fixed Expenses</h3>
          <p className="text-2xl font-bold">$1,240</p>
          <p className="text-sm opacity-90 mt-1">Rent, utilities, subscriptions</p>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <h3 className="text-sm font-medium opacity-90">Variable Expenses</h3>
          <p className="text-2xl font-bold">$1,460</p>
          <p className="text-sm opacity-90 mt-1">Food, entertainment, shopping</p>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card className="p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={monthlySpending}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="amount"
              label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
            >
              {monthlySpending.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value}`} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Bar Chart */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Weekly Spending Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value}`} />
            <Bar dataKey="spending" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Breakdown */}
      <Card className="p-6 lg:col-span-3">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {monthlySpending.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="font-medium">{category.category}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">${category.amount}</span>
                <div className="text-sm text-slate-500">
                  {((category.amount / totalSpending) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ExpenseOverview;
