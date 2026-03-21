import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import StaticTransactionRow from './StaticTransactionRow';
import SwipeableTransactionRow from './SwipeableTransactionRow';
import { Transaction } from '@/hooks/useTransactions';

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

const PAGE_SIZE_OPTIONS = [25, 50, 100];

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset to page 1 when transactions change (e.g. filter applied)
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, safePage, pageSize]);

  // Reset page when filters change the transaction list length
  React.useEffect(() => {
    setCurrentPage(1);
  }, [transactions.length]);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const startRow = (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, transactions.length);

  return (
    <div className="space-y-3">
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
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction) => (
                isMobile ? (
                  <SwipeableTransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    isSelected={selectedTransactions.includes(transaction.id)}
                    onSelectOne={onSelectOne}
                    onDelete={onDelete}
                    getCategoryColor={getCategoryColor}
                  />
                ) : (
                  <StaticTransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    isSelected={selectedTransactions.includes(transaction.id)}
                    onSelectOne={onSelectOne}
                    onDelete={onDelete}
                    getCategoryColor={getCategoryColor}
                    getParentCategory={getParentCategory}
                    isReadOnly={false}
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

      {/* Pagination controls */}
      {transactions.length > PAGE_SIZE_OPTIONS[0] && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span>
            {startRow}–{endRow} of {transactions.length}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2 font-medium">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
