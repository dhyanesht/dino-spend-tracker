import React from 'react';
import { Card } from '@/components/ui/card';
import { EnhancedBarChart } from '@/components/ui/enhanced-chart';
import { NoDataEmpty } from '@/components/ui/empty-state';

interface WeeklyBreakdownChartProps {
  transactions: Array<{ date: string; amount: number }>;
  selectedMonth: Date;
}

const WeeklyBreakdownChart = ({ transactions, selectedMonth }: WeeklyBreakdownChartProps) => {
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build week buckets within the month
  const weeks: { label: string; spending: number }[] = [];
  let weekStart = 1;

  while (weekStart <= daysInMonth) {
    const weekEnd = Math.min(weekStart + 6, daysInMonth);
    const label = `${weekStart}–${weekEnd}`;

    const spending = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getDate() >= weekStart && d.getDate() <= weekEnd;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);

    weeks.push({ label, spending });
    weekStart = weekEnd + 1;
  }

  if (weeks.every((w) => w.spending === 0)) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-1">Weekly Breakdown</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Spending by week within the month
      </p>
      <EnhancedBarChart
        data={weeks}
        dataKey="spending"
        xAxisKey="label"
        title="Spending"
        color="hsl(var(--primary))"
      />
    </Card>
  );
};

export default WeeklyBreakdownChart;
