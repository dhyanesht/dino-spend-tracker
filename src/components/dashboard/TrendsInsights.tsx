
import React from 'react';
import { Card } from '@/components/ui/card';

interface TrendsInsightsProps {
  currentSpending: number;
  spendingChange: number;
  totalTransactions: number;
}

const TrendsInsights = ({ currentSpending, spendingChange, totalTransactions }: TrendsInsightsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className={`p-6 ${spendingChange < 0 ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200 dark:from-green-900/20 dark:to-green-800/20' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 dark:from-red-900/20 dark:to-red-800/20'}`}>
        <h4 className={`font-semibold mb-2 ${spendingChange < 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
          {spendingChange < 0 ? 'Spending Down' : 'Spending Up'}
        </h4>
        <p className={spendingChange < 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
          {Math.abs(spendingChange).toFixed(1)}% {spendingChange < 0 ? 'decrease' : 'increase'} from last month
        </p>
      </Card>
      
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20">
        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Current Month</h4>
        <p className="text-blue-700 dark:text-blue-400">${currentSpending.toFixed(2)} spent so far</p>
      </Card>
      
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20">
        <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Total Transactions</h4>
        <p className="text-purple-700 dark:text-purple-400">{totalTransactions} transactions recorded</p>
      </Card>
    </div>
  );
};

export default TrendsInsights;
