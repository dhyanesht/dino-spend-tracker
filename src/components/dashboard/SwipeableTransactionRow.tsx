import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import EditTransactionDialog from './EditTransactionDialog';
import { Transaction } from '@/hooks/useTransactions';
import { toast } from 'sonner';

interface SwipeableTransactionRowProps {
  transaction: Transaction;
  isSelected: boolean;
  onSelectOne: (id: string, checked: boolean) => void;
  onDelete: (ids: string[]) => Promise<any>;
  getCategoryColor: (category: string) => string;
}

const SwipeableTransactionRow = ({ transaction, isSelected, onSelectOne, onDelete, getCategoryColor }: SwipeableTransactionRowProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const { isAdmin } = useAdmin();

  const handlers = useSwipeable({
    onSwipedLeft: isAdmin ? () => setSwipeOffset(-80) : () => {},
    onSwipedRight: isAdmin ? () => setSwipeOffset(0) : () => {},
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  const handleDelete = () => {
    if (!isAdmin) return;
    onDelete([transaction.id])
      .then(() => {
        toast.success('Transaction deleted.');
      })
      .catch((error) => {
        console.error('Failed to delete transaction:', error);
        toast.error('Failed to delete transaction.');
      });
  };

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell colSpan={8} className="p-0">
        <div className="relative overflow-hidden" {...handlers}>
          <div className="absolute top-0 right-0 h-full flex items-center z-0">
            <Button variant="destructive" size="icon" className="h-full w-20 rounded-none"
              onClick={handleDelete}
              disabled={!isAdmin}
            >
              <Trash2 />
            </Button>
          </div>
          <div
            className="relative bg-background p-4 transition-transform duration-300 flex items-center gap-4 border-b"
            style={{ transform: `translateX(${swipeOffset}px)` }}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={isAdmin ? (checked) => onSelectOne(transaction.id, !!checked) : undefined}
              disabled={!isAdmin}
            />
            <div className="flex-grow min-w-0">
              <div className="flex justify-between items-start">
                <span className="font-semibold truncate pr-2">{transaction.description}</span>
                <span className={`font-medium whitespace-nowrap ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                  {transaction.type === 'expense' ? '-' : '+'}${Number(transaction.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-600 mt-1">
                <div className="flex items-center gap-2 truncate">
                   <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getCategoryColor(transaction.category) }}
                    ></div>
                  <span className="truncate">{transaction.category}</span>
                </div>
                <span>{new Date(transaction.date).toLocaleDateString()}</span>
              </div>
            </div>
            {isAdmin && <EditTransactionDialog transaction={transaction} />}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SwipeableTransactionRow;
