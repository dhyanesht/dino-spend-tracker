
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTransactions, useDeleteMultipleTransactions } from '@/hooks/useTransactions';
import { useSubcategories } from '@/hooks/useCategories';
import EditTransactionDialog from './EditTransactionDialog';

const TransactionsList = () => {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();
  const deleteTransactions = useDeleteMultipleTransactions();

  if (transactionsLoading || subcategoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesType && matchesSearch;
  });

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
          {selectedTransactions.length > 0 ? (
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{selectedTransactions.length} selected</h2>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deleteTransactions.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span>Delete</span>
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold">All Transactions</h2>
              <p className="text-slate-600">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </p>
            </div>
          )}
          
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {subcategories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                    {category.parent_category && (
                      <span className="text-slate-500 text-sm"> ({category.parent_category})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 px-2">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
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
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    data-state={selectedTransactions.includes(transaction.id) ? "selected" : undefined}
                  >
                    <TableCell className="px-2">
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.id)}
                        onCheckedChange={(checked) => handleSelectOne(transaction.id, !!checked)}
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
                      <EditTransactionDialog transaction={transaction} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No transactions found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default TransactionsList;
