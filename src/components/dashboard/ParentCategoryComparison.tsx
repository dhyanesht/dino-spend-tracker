import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface ComparisonData {
  parentCategory: string;
  currentMonth: number;
  previousMonth: number;
  monthOverMonth: number;
  currentYear: number;
  previousYear: number;
  yearOverYear: number;
  color: string;
}

interface ParentCategoryComparisonProps {
  data: ComparisonData[];
}

const ParentCategoryComparison = ({ data }: ParentCategoryComparisonProps) => {
  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-red-600 dark:text-red-400';
    if (change < 0) return 'text-green-600 dark:text-green-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((item) => (
        <Card key={item.parentCategory} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <h4 className="font-semibold dark:text-white">{item.parentCategory}</h4>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Month over Month */}
            <div className="border-l-2 border-muted pl-4">
              <div className="text-sm text-muted-foreground mb-1">Month over Month</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Previous: ${item.previousMonth.toFixed(2)}</div>
                  <div className="text-sm font-medium">Current: ${item.currentMonth.toFixed(2)}</div>
                </div>
                <div className={`flex items-center gap-1 ${getTrendColor(item.monthOverMonth)}`}>
                  {getTrendIcon(item.monthOverMonth)}
                  <span className="font-semibold">
                    {Math.abs(item.monthOverMonth).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Year over Year */}
            <div className="border-l-2 border-muted pl-4">
              <div className="text-sm text-muted-foreground mb-1">Year over Year</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Last Year: ${item.previousYear.toFixed(2)}</div>
                  <div className="text-sm font-medium">This Year: ${item.currentYear.toFixed(2)}</div>
                </div>
                <div className={`flex items-center gap-1 ${getTrendColor(item.yearOverYear)}`}>
                  {getTrendIcon(item.yearOverYear)}
                  <span className="font-semibold">
                    {Math.abs(item.yearOverYear).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ParentCategoryComparison;
