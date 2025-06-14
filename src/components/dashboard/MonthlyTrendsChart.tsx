
import React from 'react';
import { Card } from '@/components/ui/card';
import { EnhancedAreaChart } from '@/components/ui/enhanced-chart';
import { NoDataEmpty } from '@/components/ui/empty-state';

interface MonthlyTrendsChartProps {
  data: Array<{ month: string; total: number }>;
  selectedCategory: string;
}

const MonthlyTrendsChart = ({ data, selectedCategory }: MonthlyTrendsChartProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        Monthly Spending Trend {selectedCategory !== 'all' && `for ${selectedCategory}`}
      </h3>
      {data.length > 0 ? (
        <EnhancedAreaChart
          data={data}
          dataKey="total"
          xAxisKey="month"
          title="Total Spending"
          color="hsl(var(--primary))"
        />
      ) : (
        <NoDataEmpty />
      )}
    </Card>
  );
};

export default MonthlyTrendsChart;
