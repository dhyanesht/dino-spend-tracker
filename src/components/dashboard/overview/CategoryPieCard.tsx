import React from 'react';
import { Card } from '@/components/ui/card';
import { EnhancedPieChart } from '@/components/ui/enhanced-chart';
import { NoDataEmpty } from '@/components/ui/empty-state';

interface CategoryData {
  name: string;
  amount: number;
  color: string;
}

interface CategoryPieCardProps {
  data: CategoryData[];
}

const CategoryPieCard = ({ data }: CategoryPieCardProps) => {
  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
        <NoDataEmpty />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
      <EnhancedPieChart
        data={data.map((d) => ({ category: d.name, amount: d.amount, color: d.color }))}
        dataKey="amount"
        nameKey="category"
        colors={data.map((d) => d.color)}
        title="Category Spending"
      />
    </Card>
  );
};

export default CategoryPieCard;
