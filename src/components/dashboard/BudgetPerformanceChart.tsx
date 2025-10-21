import React from 'react';
import { Card } from '@/components/ui/card';
import { EnhancedBarChart } from '@/components/ui/enhanced-chart';
import { NoDataEmpty } from '@/components/ui/empty-state';

interface BudgetPerformanceData {
  category: string;
  percentage: number;
  actual: number;
  budget: number;
  color: string;
}

interface BudgetPerformanceChartProps {
  data: BudgetPerformanceData[];
}

const BudgetPerformanceChart = ({ data }: BudgetPerformanceChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Budget Performance</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Spending as percentage of budget - categories over 100% are over budget
        </p>
        <NoDataEmpty />
      </Card>
    );
  }

  // Transform data for the chart
  const chartData = data.map(item => ({
    category: item.category,
    percentage: item.percentage,
    fill: item.percentage > 100 ? 'hsl(var(--destructive))' : item.color,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">Budget Performance</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Spending as percentage of budget - categories over 100% are over budget
      </p>
      
      <EnhancedBarChart
        data={chartData}
        dataKey="percentage"
        xAxisKey="category"
        title="Budget Usage %"
        color="hsl(var(--primary))"
      />

      <div className="mt-6 space-y-3">
        {data.map((item) => (
          <div key={item.category} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.percentage > 100 ? 'hsl(var(--destructive))' : item.color }}
              />
              <span className="font-medium">{item.category}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                ${item.actual.toFixed(2)} / ${item.budget.toFixed(2)}
              </span>
              <span 
                className={`font-semibold ${
                  item.percentage > 100 ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BudgetPerformanceChart;
