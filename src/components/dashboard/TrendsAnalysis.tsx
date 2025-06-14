import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { ChartSkeleton } from '@/components/ui/enhanced-skeleton';
import { NoTrendsEmpty, NoDataEmpty } from '@/components/ui/empty-state';
import { EnhancedAreaChart, EnhancedLineChart } from '@/components/ui/enhanced-chart';

const TrendsAnalysis = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  if (transactionsLoading || categoriesLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  if (expenseTransactions.length < 3) {
    return <NoTrendsEmpty />;
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
      
      const monthTransactions = expenseTransactions.filter(t => 
        t.date.startsWith(monthKey)
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

  const getYearOverYearData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData: { [month: string]: { 'This Year'?: number; 'Last Year'?: number } } = 
      monthNames.reduce((acc, month) => ({ ...acc, [month]: {} }), {});

    expenseTransactions.forEach(t => {
      const transactionDate = new Date(t.date);
      const year = transactionDate.getFullYear();
      
      if (year === currentYear || year === lastYear) {
        const month = transactionDate.getMonth();
        const monthName = monthNames[month];
        const key = year === currentYear ? 'This Year' : 'Last Year';
        
        if (!monthlyData[monthName][key]) {
          monthlyData[monthName][key] = 0;
        }
        monthlyData[monthName][key]! += Number(t.amount);
      }
    });

    return monthNames.map(month => ({
      month,
      'This Year': monthlyData[month]['This Year'] || 0,
      'Last Year': monthlyData[month]['Last Year'] || 0,
    }));
  };

  const yearOverYearData = getYearOverYearData();

  // Calculate insights
  const getCurrentMonthSpending = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return expenseTransactions
      .filter(t => t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getPreviousMonthSpending = () => {
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthKey = prevMonth.toISOString().slice(0, 7);
    return expenseTransactions
      .filter(t => t.date.startsWith(prevMonthKey))
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

  const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2 dark:text-white">Spending Trends Analysis</h2>
            <p className="text-muted-foreground">Track your spending patterns over time</p>
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
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Monthly Spending Trend</h3>
        {monthlyTrends.length > 0 ? (
          <EnhancedAreaChart
            data={monthlyTrends}
            dataKey="total"
            xAxisKey="month"
            title="Total Spending"
            color="hsl(var(--primary))"
          />
        ) : (
          <NoDataEmpty />
        )}
      </Card>

      {/* Category Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Category Trends Comparison</h3>
        {categories.length > 0 && monthlyTrends.length > 0 ? (
          <EnhancedLineChart
            data={monthlyTrends}
            xAxisKey="month"
            lines={categories.slice(0, 4).map((cat, index) => ({
              dataKey: cat.name.toLowerCase().replace(/\s+/g, ''),
              color: chartColors[index],
              name: cat.name
            }))}
          />
        ) : (
          <NoDataEmpty />
        )}
      </Card>

      {/* Year-over-Year Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Year-over-Year Spending</h3>
        {yearOverYearData.some(d => d['This Year'] > 0 || d['Last Year'] > 0) ? (
          <EnhancedLineChart
            data={yearOverYearData}
            xAxisKey="month"
            lines={[
              { dataKey: 'This Year', color: chartColors[0], name: `This Year (${new Date().getFullYear()})` },
              { dataKey: 'Last Year', color: chartColors[1], name: `Last Year (${new Date().getFullYear() - 1})` },
            ]}
          />
        ) : (
          <NoDataEmpty />
        )}
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={`p-6 ${spendingChange < 0 ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200 dark:from-green-900/20 dark:to-green-800/20' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 dark:from-red-900/20 dark:to-red-800/20'}`}>
          <h4 className={`font-semibold mb-2 ${spendingChange < 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
            {spendingChange < 0 ? 'Spending Down' : 'Spending Up'}
          </h4>
          <p className={spendingChange < 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
            {Math.abs(spendingChange).toFixed(1)}% {spendingChange < 0 ? 'decrease' : 'increase'} from last month
          </p>
        </Card>
        
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Current Month</h4>
          <p className="text-blue-700 dark:text-blue-400">${currentSpending.toFixed(2)} spent so far</p>
        </Card>
        
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20">
          <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Total Transactions</h4>
          <p className="text-purple-700 dark:text-purple-400">{transactions.length} transactions recorded</p>
        </Card>
      </div>
    </div>
  );
};

export default TrendsAnalysis;
