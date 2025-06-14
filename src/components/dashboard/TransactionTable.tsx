import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import StaticTransactionRow from './StaticTransactionRow';
import SwipeableTransactionRow from './SwipeableTransactionRow';
import { Transaction } from '@/hooks/useTransactions';
import { useAdmin } from '@/contexts/AdminContext';

interface TransactionTableProps {
  transactions: Transaction[];
  isMobile: boolean;
  selectedTransactions: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onDelete: (ids: string[]) => Promise<any>;
  getCategoryColor: (category: string) => string;
  getParentCategory: (category: string) => string | null;
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

const TransactionTable = ({
  transactions,
  isMobile,
  selectedTransactions,
  onSelectAll,
  onSelectOne,
  onDelete,
  getCategoryColor,
  getParentCategory,
  isAllSelected,
  isSomeSelected,
}: TransactionTableProps) => {
  const { isAdmin } = useAdmin();

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        {!isMobile && (
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 px-2">
                <Checkbox
                  checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                  aria-label="Select all"
                  disabled={!isAdmin}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Parent Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              isMobile ? (
                <SwipeableTransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isSelected={selectedTransactions.includes(transaction.id)}
                  onSelectOne={isAdmin ? onSelectOne : () => {}}
                  onDelete={isAdmin ? onDelete : async () => {}}
                  getCategoryColor={getCategoryColor}
                />
              ) : (
                <StaticTransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isSelected={selectedTransactions.includes(transaction.id)}
                  onSelectOne={isAdmin ? onSelectOne : () => {}}
                  onDelete={isAdmin ? onDelete : async () => {}}
                  getCategoryColor={getCategoryColor}
                  getParentCategory={getParentCategory}
                  isReadOnly={!isAdmin}
                />
              )
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={isMobile ? 1 : 8} className="text-center py-8 text-muted-foreground">
                No transactions found matching your filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionTable;
