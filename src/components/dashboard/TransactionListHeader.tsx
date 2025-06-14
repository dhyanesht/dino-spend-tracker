
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface TransactionListHeaderProps {
  selectedCount: number;
  filteredCount: number;
  totalCount: number;
  onDeleteSelected: () => void;
  isDeletePending: boolean;
}

const TransactionListHeader = ({
  selectedCount,
  filteredCount,
  totalCount,
  onDeleteSelected,
  isDeletePending,
}: TransactionListHeaderProps) => {
  return (
    <div>
      {selectedCount > 0 ? (
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{selectedCount} selected</h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            disabled={isDeletePending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <span>Delete</span>
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold">All Transactions</h2>
          <p className="text-slate-600">
            Showing {filteredCount} of {totalCount} transactions
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionListHeader;
