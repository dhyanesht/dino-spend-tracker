import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface SpendingPaceCardProps {
  totalSpent: number;
  totalBudget: number;
  daysElapsed: number;
  daysInMonth: number;
  lastMonthAtThisPoint: number;
}

const SpendingPaceCard = ({
  totalSpent,
  totalBudget,
  daysElapsed,
  daysInMonth,
  lastMonthAtThisPoint,
}: SpendingPaceCardProps) => {
  const remaining = Math.max(totalBudget - totalSpent, 0);
  const budgetPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const daysLeft = daysInMonth - daysElapsed;

  const dailyPace = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const allowedPace = daysInMonth > 0 ? totalBudget / daysInMonth : 0;

  const momChange =
    lastMonthAtThisPoint > 0
      ? ((totalSpent - lastMonthAtThisPoint) / lastMonthAtThisPoint) * 100
      : 0;

  // Determine pace status
  const isOverBudget = totalSpent > totalBudget;
  const isOnPace = dailyPace <= allowedPace * 1.1; // 10% tolerance
  const paceColor = isOverBudget
    ? 'text-destructive'
    : isOnPace
      ? 'text-green-600 dark:text-green-400'
      : 'text-amber-600 dark:text-amber-400';

  const progressColor = isOverBudget
    ? '[&>div]:bg-destructive'
    : isOnPace
      ? '[&>div]:bg-green-500'
      : '[&>div]:bg-amber-500';

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        {/* Left: spending total */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Spent this month</p>
            <p className="text-3xl font-bold">${totalSpent.toFixed(2)}</p>
          </div>

          {totalBudget > 0 && (
            <>
              <Progress value={budgetPct} className={`h-3 ${progressColor}`} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>${totalSpent.toFixed(0)} of ${totalBudget.toFixed(0)} budget</span>
                <span>${remaining.toFixed(0)} remaining</span>
              </div>
            </>
          )}
        </div>

        {/* Right: pace metrics */}
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{daysLeft} days left</span>
          </div>

          {totalBudget > 0 && (
            <div className={`text-sm font-medium ${paceColor}`}>
              ${dailyPace.toFixed(0)}/day pace
              <span className="text-muted-foreground font-normal"> · ${allowedPace.toFixed(0)}/day allowed</span>
            </div>
          )}

          {lastMonthAtThisPoint > 0 && (
            <div className="flex items-center gap-1 text-sm">
              {momChange < 0 ? (
                <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : momChange > 0 ? (
                <TrendingUp className="w-4 h-4 text-destructive" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={momChange < 0 ? 'text-green-600 dark:text-green-400' : momChange > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                {Math.abs(momChange).toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SpendingPaceCard;
