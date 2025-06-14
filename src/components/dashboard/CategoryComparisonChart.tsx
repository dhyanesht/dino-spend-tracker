
import React from 'react';
import { Card } from '@/components/ui/card';
import { EnhancedLineChart } from '@/components/ui/enhanced-chart';
import { NoDataEmpty } from '@/components/ui/empty-state';

interface CategoryComparisonChartProps {
  data: any[];
  topCategories: any[];
  selectedCategory: string;
}

const CategoryComparisonChart = ({ data, topCategories, selectedCategory }: CategoryComparisonChartProps) => {
  const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  if (selectedCategory !== 'all') {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">Category Trends Comparison</h3>
      <p className="text-sm text-muted-foreground mb-4">Top 4 categories by spending volume</p>
      {topCategories && topCategories.length > 0 && data.length > 0 ? (
        <EnhancedLineChart
          data={data}
          xAxisKey="month"
          lines={topCategories.map((cat, index) => ({
            dataKey: cat.name,
            color: cat.color || chartColors[index],
            name: cat.name
          }))}
        />
      ) : (
        <NoDataEmpty />
      )}
    </Card>
  );
};

export default CategoryComparisonChart;
