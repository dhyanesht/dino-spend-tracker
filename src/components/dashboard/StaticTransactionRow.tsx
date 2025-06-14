
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import EditTransactionDialog from './EditTransactionDialog';
import { Transaction } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface StaticTransactionRowProps {
  transaction: Transaction;
  isSelected: boolean;
  onSelectOne: (id: string, checked: boolean) => void;
  onDelete: (ids: string[]) => Promise<any>;
  getCategoryColor: (category: string) => string;
  getParentCategory: (category: string) => string | null;
}

const StaticTransactionRow = ({ transaction, isSelected, onSelectOne, onDelete, getCategoryColor, getParentCategory }: StaticTransactionRowProps) => {
  const handleDelete = () => {
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
    <TableRow 
      data-state={isSelected ? "selected" : undefined}
    >
      <TableCell className="px-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectOne(transaction.id, !!checked)}
          aria-label={`Select transaction ${transaction.description}`}
        />
      </TableCell>
      <TableCell className="font-medium">
        {new Date(transaction.date).toLocaleDateString()}
      </TableCell>
      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: getCategoryColor(transaction.category) }}
          ></div>
          <span className="truncate">{transaction.category}</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-slate-600 truncate">
          {getParentCategory(transaction.category) || 'N/A'}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'}>
          {transaction.type}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-medium">
        <span className={transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}>
          {transaction.type === 'expense' ? '-' : '+'}${Number(transaction.amount).toFixed(2)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end">
          <EditTransactionDialog transaction={transaction} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default StaticTransactionRow;
