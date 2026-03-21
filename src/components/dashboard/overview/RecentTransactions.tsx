import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll: () => void;
}

const RecentTransactions = ({ transactions, onViewAll }: RecentTransactionsProps) => {
  const recent = transactions.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-sm gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
      <div className="space-y-3">
        {recent.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{t.description}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' · '}{t.category}
              </p>
            </div>
            <span className={`font-semibold text-sm ml-4 ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : ''}`}>
              {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentTransactions;
