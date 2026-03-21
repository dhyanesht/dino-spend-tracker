import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface CategorySpend {
  name: string;
  spent: number;
  budget: number;
  color: string;
}

interface TopCategoriesCardProps {
  categories: CategorySpend[];
}

const TopCategoriesCard = ({ categories }: TopCategoriesCardProps) => {
  if (categories.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
      <div className="space-y-4">
        {categories.slice(0, 6).map((cat) => {
          const pct = cat.budget > 0 ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
          const isOver = cat.spent > cat.budget && cat.budget > 0;

          return (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={isOver ? 'text-destructive font-semibold' : ''}>
                    ${cat.spent.toFixed(0)}
                  </span>
                  {cat.budget > 0 && (
                    <span className="text-muted-foreground">/ ${cat.budget.toFixed(0)}</span>
                  )}
                </div>
              </div>
              {cat.budget > 0 && (
                <Progress
                  value={pct}
                  className={`h-2 ${isOver ? '[&>div]:bg-destructive' : ''}`}
                  style={
                    !isOver
                      ? { ['--progress-color' as string]: cat.color }
                      : undefined
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TopCategoriesCard;
