
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Transaction } from '@/hooks/useTransactions';

export const useTransactionFilters = (transactions: Transaction[]) => {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<DateRange | undefined>();
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const handleResetFilters = () => {
    setFilterCategory('all');
    setFilterType('all');
    setSearchTerm('');
    setDate(undefined);
    setMinAmount('');
    setMaxAmount('');
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    const formattedStartDate = date?.from ? format(date.from, 'yyyy-MM-dd') : null;
    const formattedEndDate = date?.to ? format(date.to, 'yyyy-MM-dd') : null;

    return transactions.filter(transaction => {
      const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
      const matchesType = filterType === 'all' || transaction.type === filterType;
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStartDate = !formattedStartDate || transaction.date >= formattedStartDate;
      const matchesEndDate = !formattedEndDate || transaction.date <= formattedEndDate;

      const transactionAmount = Number(transaction.amount);
      const matchesMinAmount = minAmount === '' || isNaN(parseFloat(minAmount)) || transactionAmount >= parseFloat(minAmount);
      const matchesMaxAmount = maxAmount === '' || isNaN(parseFloat(maxAmount)) || transactionAmount <= parseFloat(maxAmount);

      return matchesCategory && matchesType && matchesSearch && matchesStartDate && matchesEndDate && matchesMinAmount && matchesMaxAmount;
    });
  }, [transactions, filterCategory, filterType, searchTerm, date, minAmount, maxAmount]);

  return {
    filters: {
      category: filterCategory,
      type: filterType,
      term: searchTerm,
      date,
      minAmount,
      maxAmount,
    },
    setters: {
      setCategory: setFilterCategory,
      setType: setFilterType,
      setTerm: setSearchTerm,
      setDate,
      setMinAmount,
      setMaxAmount,
    },
    handleResetFilters,
    filteredTransactions,
  };
};
