import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'expense' | 'income';
  created_at: string;
}

export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      console.log('Fetching transactions...');
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
      console.log('Transactions fetched:', data?.length, 'records');
      return data as Transaction[];
    },
  });
};

export const useAddTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
      console.log('Adding transaction:', transaction);
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding transaction:', error);
        throw error;
      }
      console.log('Transaction added successfully:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Invalidating transactions query cache');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useAddMultipleTransactions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactions: Omit<Transaction, 'id' | 'created_at'>[]) => {
      console.log('Adding multiple transactions:', transactions.length, 'records');
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();
      
      if (error) {
        console.error('Error adding multiple transactions:', error);
        throw error;
      }
      console.log('Multiple transactions added successfully:', data?.length, 'records');
      return data;
    },
    onSuccess: (data) => {
      console.log('Invalidating transactions query cache after bulk insert');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: Partial<Transaction> & { id: string }) => {
      console.log('Updating transaction:', transaction);
      const { data, error } = await supabase
        .from('transactions')
        .update({
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          type: transaction.type,
          date: transaction.date
        })
        .eq('id', transaction.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }
      console.log('Transaction updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Invalidating transactions query cache');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useDeleteMultipleTransactions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      console.log('Deleting multiple transactions:', transactionIds.length, 'records');
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .in('id', transactionIds);
      
      if (error) {
        console.error('Error deleting multiple transactions:', error);
        throw error;
      }
      console.log('Multiple transactions deleted successfully');
      return data;
    },
    onSuccess: () => {
      console.log('Invalidating transactions query cache after bulk delete');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
