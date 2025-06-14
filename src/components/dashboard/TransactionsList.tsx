
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTransactions, useDeleteMultipleTransactions } from '@/hooks/useTransactions';
import { useSubcategories } from '@/hooks/useCategories';
import { useMobile } from '@/hooks/useMobile';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import TransactionListHeader from './TransactionListHeader';
import TransactionFilters from './TransactionFilters';
import TransactionTable from './TransactionTable';

const TransactionsList = () => {
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();
  const deleteTransactions = useDeleteMultipleTransactions();
  const isMobile = useMobile();

  const {
    filters,
    setters,
    handleResetFilters,
    filteredTransactions,
  } = useTransactionFilters(transactions);

  if (transactionsLoading || subcategoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const getCategoryColor = (categoryName: string) => {
    const subcategory = subcategories.find(cat => cat.name === categoryName);
    return subcategory?.color || '#6B7280';
  };

  const getParentCategory = (categoryName: string) => {
    const subcategory = subcategories.find(cat => cat.name === categoryName);
    return subcategory?.parent_category || null;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleSelectOne = (transactionId: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactions(prev => [...prev, transactionId]);
    } else {
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId));
    }
  };

  const handleDeleteSelected = async () => {
    await deleteTransactions.mutateAsync(selectedTransactions, {
      onSuccess: () => {
        toast.success(`${selectedTransactions.length} transaction(s) deleted.`);
        setSelectedTransactions([]);
      },
      onError: (error) => {
        console.error('Failed to delete transactions:', error);
        toast.error('Failed to delete transactions.');
      }
    });
  };

  const isAllSelected = filteredTransactions.length > 0 && selectedTransactions.length === filteredTransactions.length;
  const isSomeSelected = selectedTransactions.length > 0 && selectedTransactions.length < filteredTransactions.length;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <TransactionListHeader
            selectedCount={selectedTransactions.length}
            filteredCount={filteredTransactions.length}
            totalCount={transactions.length}
            onDeleteSelected={handleDeleteSelected}
            isDeletePending={deleteTransactions.isPending}
          />
          
          <TransactionFilters
            filters={filters}
            setters={setters}
            handleResetFilters={handleResetFilters}
            subcategories={subcategories}
            isMobile={isMobile}
          />
        </div>

        <TransactionTable
          transactions={filteredTransactions}
          isMobile={isMobile}
          selectedTransactions={selectedTransactions}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onDelete={deleteTransactions.mutateAsync}
          getCategoryColor={getCategoryColor}
          getParentCategory={getParentCategory}
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
        />
      </Card>
    </div>
  );
};

export default TransactionsList;
