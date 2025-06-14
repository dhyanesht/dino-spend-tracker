
import React from 'react';
import { Card } from '@/components/ui/card';
import { EnhancedLineChart } from '@/components/ui/enhanced-chart';
import { NoDataEmpty } from '@/components/ui/empty-state';

interface YearOverYearChartProps {
  data: Array<{ month: string; 'This Year': number; 'Last Year': number }>;
  selectedCategory: string;
}

const YearOverYearChart = ({ data, selectedCategory }: YearOverYearChartProps) => {
  const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        Year-over-Year Spending {selectedCategory !== 'all' && `for ${selectedCategory}`}
      </h3>
      {data.some(d => d['This Year'] > 0 || d['Last Year'] > 0) ? (
        <EnhancedLineChart
          data={data}
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
  );
};

export default YearOverYearChart;
