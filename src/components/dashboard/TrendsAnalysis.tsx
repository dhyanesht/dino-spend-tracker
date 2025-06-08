
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';

const TrendsAnalysis = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  if (transactionsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Generate monthly trends data
  const getMonthlyTrends = () => {
    const months = [];
    const now = new Date();
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthTransactions = transactions.filter(t => 
        t.date.startsWith(monthKey) && t.type === 'expense'
      );
      
      const total = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      const categoryData: any = { month: monthName, total };
      
      // Add category-specific data
      categories.slice(0, 4).forEach(cat => { // Top 4 categories for the chart
        const categorySpent = monthTransactions
          .filter(t => t.category === cat.name)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        categoryData[cat.name.toLowerCase().replace(/\s+/g, '')] = categorySpent;
      });
      
      months.push(categoryData);
    }
    
    return months;
  };

  const monthlyTrends = getMonthlyTrends();

  // Calculate insights
  const getCurrentMonthSpending = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return transactions
      .filter(t => t.date.startsWith(currentMonth) && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getPreviousMonthSpending = () => {
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthKey = prevMonth.toISOString().slice(0, 7);
    return transactions
      .filter(t => t.date.startsWith(prevMonthKey) && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const currentSpending = getCurrentMonthSpending();
  const previousSpending = getPreviousMonthSpending();
  const spendingChange = previousSpending > 0 
    ? ((currentSpending - previousSpending) / previousSpending) * 100 
    : 0;

  const categoriesOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.slice(0, 4).map(cat => ({
      value: cat.name.toLowerCase().replace(/\s+/g, ''),
      label: cat.name
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Spending Trends Analysis</h2>
            <p className="text-slate-600">Track your spending patterns over time</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 months</SelectItem>
                <SelectItem value="6months">Last 6 months</SelectItem>
                <SelectItem value="1year">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoriesOptions.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Monthly Trend Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Spending Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#3B82F6" 
              fill="#3B82F6" 
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Category Trends Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Legend />
            {categories.slice(0, 4).map((cat, index) => {
              const colors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
              const dataKey = cat.name.toLowerCase().replace(/\s+/g, '');
              return (
                <Line 
                  key={cat.id}
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke={colors[index]} 
                  strokeWidth={2} 
                  name={cat.name} 
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={`p-6 bg-gradient-to-r ${spendingChange < 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
          <h4 className={`font-semibold mb-2 ${spendingChange < 0 ? 'text-green-800' : 'text-red-800'}`}>
            {spendingChange < 0 ? 'Spending Down' : 'Spending Up'}
          </h4>
          <p className={spendingChange < 0 ? 'text-green-700' : 'text-red-700'}>
            {Math.abs(spendingChange).toFixed(1)}% {spendingChange < 0 ? 'decrease' : 'increase'} from last month
          </p>
        </Card>
        
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Current Month</h4>
          <p className="text-blue-700">${currentSpending.toFixed(2)} spent so far</p>
        </Card>
        
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <h4 className="font-semibold text-purple-800 mb-2">Total Transactions</h4>
          <p className="text-purple-700">{transactions.length} transactions recorded</p>
        </Card>
      </div>
    </div>
  );
};

export default TrendsAnalysis;
