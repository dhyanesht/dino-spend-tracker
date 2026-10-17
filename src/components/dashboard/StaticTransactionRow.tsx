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
  onDelete: (ids: string[]) => Promise<unknown>;
  getCategoryColor: (category: string) => string;
  getParentCategory: (category: string) => string | null;
  getAccountName: (accountId: string | null | undefined) => string;
  isReadOnly?: boolean;
}

const typeVariant = (t: Transaction) => {
  if (t.transaction_type === 'expense') return 'destructive' as const;
  if (t.transaction_type === 'income') return 'default' as const;
  if (t.transaction_type === 'transfer') return 'secondary' as const;
  return 'outline' as const;
};

const typeLabel = (t: Transaction) => {
  if (t.transaction_type === 'transfer') return 'Transfer';
  if (t.transaction_type === 'refund') return 'Refund';
  if (t.transaction_type === 'reimbursement') return 'Reimbursement';
  return t.type;
};

const StaticTransactionRow = ({ transaction, isSelected, onSelectOne, onDelete, getCategoryColor, getParentCategory, getAccountName, isReadOnly }: StaticTransactionRowProps) => {
  const handleDelete = () => {
    if (isReadOnly) return;
    onDelete([transaction.id])
      .then(() => {
        toast.success('Transaction deleted.');
      })
      .catch((error) => {
        console.error('Failed to delete transaction:', error);
        toast.error('Failed to delete transaction.');
      });
  };

  const isPending = transaction.status === 'pending';
  const rowClass = isPending ? 'opacity-60' : '';

  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className={rowClass}
    >
      <TableCell className="px-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={isReadOnly ? undefined : (checked) => onSelectOne(transaction.id, !!checked)}
          aria-label={`Select transaction ${transaction.description}`}
          disabled={isReadOnly}
        />
      </TableCell>
      <TableCell className="font-medium">
        {new Date(transaction.date).toLocaleDateString()}
      </TableCell>
      <TableCell className="max-w-xs truncate">
        {transaction.description}
        {transaction.import_batches?.filename && (
          <span className="text-xs text-muted-foreground block">From: {transaction.import_batches.filename}</span>
        )}
      </TableCell>
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
        <span className="truncate">{getAccountName(transaction.account_id)}</span>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge variant={typeVariant(transaction)}>{typeLabel(transaction)}</Badge>
          {isPending && <Badge variant="outline" className="text-[10px]">Pending</Badge>}
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">
        <span className={transaction.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'}>
          {transaction.transaction_type === 'expense' ? '-' : '+'}${Number(transaction.amount).toFixed(2)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end">
          {isReadOnly ? null : <EditTransactionDialog transaction={transaction} />}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete} disabled={isReadOnly}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default StaticTransactionRow;