
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface TransactionListHeaderProps {
  selectedCount: number;
  filteredCount: number;
  totalCount: number;
  onDeleteSelected: () => void;
  isDeletePending: boolean;
  isAdmin?: boolean;
}

const TransactionListHeader = ({
  selectedCount,
  filteredCount,
  totalCount,
  onDeleteSelected,
  isDeletePending,
  isAdmin = false,
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
            disabled={isDeletePending || !isAdmin}
            className={!isAdmin ? "opacity-60 cursor-not-allowed" : ""}
            title={!isAdmin ? "Unlock edit mode to delete transactions" : undefined}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <span>Delete</span>
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold">All Transactions</h2>
          <p className="text-sm text-muted-foreground">
            Showing {filteredCount} of {totalCount} transactions
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionListHeader;
