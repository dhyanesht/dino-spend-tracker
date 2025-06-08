
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const TrendsAnalysis = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const monthlyTrends = [
    { month: 'Jan', total: 2800, food: 850, transport: 420, entertainment: 320, shopping: 680 },
    { month: 'Feb', total: 2950, food: 900, transport: 380, entertainment: 380, shopping: 720 },
    { month: 'Mar', total: 2720, food: 820, transport: 450, entertainment: 290, shopping: 650 },
    { month: 'Apr', total: 3100, food: 950, transport: 400, entertainment: 420, shopping: 780 },
    { month: 'May', total: 2880, food: 880, transport: 390, entertainment: 350, shopping: 710 },
    { month: 'Jun', total: 2700, food: 850, transport: 420, entertainment: 320, shopping: 680 },
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'food', label: 'Food & Dining' },
    { value: 'transport', label: 'Transportation' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'shopping', label: 'Shopping' },
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
                {categories.map((category) => (
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
            <Tooltip formatter={(value) => `$${value}`} />
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
            <Tooltip formatter={(value) => `$${value}`} />
            <Legend />
            <Line type="monotone" dataKey="food" stroke="#10B981" strokeWidth={2} name="Food & Dining" />
            <Line type="monotone" dataKey="transport" stroke="#F59E0B" strokeWidth={2} name="Transportation" />
            <Line type="monotone" dataKey="entertainment" stroke="#EF4444" strokeWidth={2} name="Entertainment" />
            <Line type="monotone" dataKey="shopping" stroke="#8B5CF6" strokeWidth={2} name="Shopping" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">Spending Down</h4>
          <p className="text-green-700">Transportation costs decreased by 12% this month</p>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <h4 className="font-semibold text-red-800 mb-2">Alert</h4>
          <p className="text-red-700">Shopping expenses up 15% compared to last month</p>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Insight</h4>
          <p className="text-blue-700">Most consistent spending: Food & Dining category</p>
        </Card>
      </div>
    </div>
  );
};

export default TrendsAnalysis;
