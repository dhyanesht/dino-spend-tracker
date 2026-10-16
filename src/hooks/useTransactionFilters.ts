
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Transaction } from '@/hooks/useTransactions';

export const useTransactionFilters = (transactions: Transaction[]) => {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTransactionType, setFilterTransactionType] = useState('all');
  const [includePending, setIncludePending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<DateRange | undefined>();
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const handleResetFilters = () => {
    setFilterCategory('all');
    setFilterAccount('all');
    setFilterStatus('all');
    setFilterTransactionType('all');
    setIncludePending(false);
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
      const matchesAccount = filterAccount === 'all' || transaction.account_id === filterAccount;
      const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
      const matchesTransactionType = filterTransactionType === 'all' || transaction.transaction_type === filterTransactionType;
      const matchesPending = includePending || transaction.status !== 'pending';
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStartDate = !formattedStartDate || transaction.date >= formattedStartDate;
      const matchesEndDate = !formattedEndDate || transaction.date <= formattedEndDate;

      const transactionAmount = Number(transaction.amount);
      const matchesMinAmount = minAmount === '' || isNaN(parseFloat(minAmount)) || transactionAmount >= parseFloat(minAmount);
      const matchesMaxAmount = maxAmount === '' || isNaN(parseFloat(maxAmount)) || transactionAmount <= parseFloat(maxAmount);

      return matchesCategory && matchesAccount && matchesStatus &&
             matchesTransactionType && matchesPending && matchesSearch &&
             matchesStartDate && matchesEndDate && matchesMinAmount && matchesMaxAmount;
    });
  }, [transactions, filterCategory, filterAccount, filterStatus,
      filterTransactionType, includePending, searchTerm, date, minAmount, maxAmount]);

  return {
    filters: {
      category: filterCategory,
      account: filterAccount,
      status: filterStatus,
      transactionType: filterTransactionType,
      includePending,
      term: searchTerm,
      date,
      minAmount,
      maxAmount,
    },
    setters: {
      setCategory: setFilterCategory,
      setAccount: setFilterAccount,
      setStatus: setFilterStatus,
      setTransactionType: setFilterTransactionType,
      setIncludePending: setIncludePending,
      setTerm: setSearchTerm,
      setDate,
      setMinAmount,
      setMaxAmount,
    },
    handleResetFilters,
    filteredTransactions,
  };
};
