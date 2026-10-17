import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { transactionSchema } from '@/lib/validation';
import { useAuth } from '@/contexts/AuthContext';
import { LEGACY_TYPE_BY_NEW, type TransactionType, type IncomeCategory } from '@/lib/transactionMath';
import { z } from 'zod';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'expense' | 'income';
  created_at: string;
  // Extended financial-correctness fields (spec §1.2)
  account_id: string | null;
  status: 'pending' | 'posted';
  transaction_type: TransactionType;
  linked_transaction_id: string | null;
  transfer_pair_id: string | null;
  income_category: IncomeCategory | string | null;
  reimbursement_expected_date: string | null;
  user_id: string | null;
  import_batch_id: string | null;
  import_batches?: { filename: string; import_timestamp: string } | null;
}

/** Loose input accepted by the add hooks; missing fields get defaults via `transactionSchema`. */
export type TransactionInput = Omit<Transaction, 'id' | 'created_at'>;

/** Compute the legacy `type` column from `transaction_type` (locked decision #2). */
export const computeLegacyType = (transaction_type: TransactionType): 'expense' | 'income' =>
  LEGACY_TYPE_BY_NEW[transaction_type];

export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, import_batches(filename, import_timestamp)')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
      return data as Transaction[];
    },
  });
};

export const useAddTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: Partial<TransactionInput> & { description: string; amount: number; date: string; category: string }) => {
      if (!user) throw new Error('You must be logged in to add transactions');

      const validated = transactionSchema.parse({
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        category: transaction.category,
        type: transaction.type,
        transaction_type: transaction.transaction_type ?? 'expense',
        account_id: transaction.account_id,
        status: transaction.status ?? 'posted',
        linked_transaction_id: transaction.linked_transaction_id ?? null,
        transfer_pair_id: transaction.transfer_pair_id ?? null,
        income_category: transaction.income_category ?? null,
        reimbursement_expected_date: transaction.reimbursement_expected_date ?? null,
      });

      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          description: validated.description,
          amount: validated.amount,
          date: validated.date,
          category: validated.category,
          type: validated.type,
          transaction_type: validated.transaction_type,
          account_id: validated.account_id,
          status: validated.status,
          linked_transaction_id: validated.linked_transaction_id ?? null,
          transfer_pair_id: validated.transfer_pair_id ?? null,
          income_category: validated.income_category ?? null,
          reimbursement_expected_date: validated.reimbursement_expected_date ?? null,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding transaction:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useAddMultipleTransactions = (importBatchId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transactions: Partial<TransactionInput>[]) => {
      if (!user) throw new Error('You must be logged in to add transactions');

      const validated = transactions.map((t: Partial<TransactionInput>) => {
        const v = transactionSchema.parse({
          description: t.description,
          amount: t.amount,
          date: t.date,
          category: t.category,
          type: t.type,
          transaction_type: t.transaction_type ?? 'expense',
          account_id: t.account_id,
          status: t.status ?? 'posted',
          linked_transaction_id: t.linked_transaction_id ?? null,
          transfer_pair_id: t.transfer_pair_id ?? null,
          income_category: t.income_category ?? null,
           reimbursement_expected_date: t.reimbursement_expected_date ?? null,
           import_batch_id: importBatchId ?? null,
         });
        return {
          description: v.description,
          amount: v.amount,
          date: v.date,
          category: v.category,
          type: v.type,
          transaction_type: v.transaction_type,
          account_id: v.account_id,
          status: v.status,
          linked_transaction_id: v.linked_transaction_id ?? null,
          transfer_pair_id: v.transfer_pair_id ?? null,
          income_category: v.income_category ?? null,
           reimbursement_expected_date: v.reimbursement_expected_date ?? null,
           import_batch_id: v.import_batch_id ?? importBatchId ?? null,
           user_id: user.id,
        };
      });

      const { data, error } = await supabase
        .from('transactions')
        .insert(validated)
        .select();

      if (error) {
        console.error('Error adding multiple transactions:', error);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Partial<Transaction> & { id: string }) => {
      const { id, ...patch } = transaction;
      const { data, error } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useDeleteMultipleTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .in('id', transactionIds);

      if (error) {
        console.error('Error deleting multiple transactions:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

// ---- Transfer / refund / reimbursement hooks (Task 6) ----

export interface AddTransferInput {
  sourceAccountId: string;
  destAccountId: string;
  amount: number;
  date: string;
  description: string;
  status?: 'pending' | 'posted';
}

export const useAddTransfer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AddTransferInput) => {
      if (!user) throw new Error('You must be logged in');
      const { buildTransferRows } = await import('@/lib/transactionPayloads');
      const [src, dst] = buildTransferRows({ ...input, userId: user.id });
      const { data, error } = await supabase.from('transactions').insert([src, dst]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export interface AddRefundInput {
  originalId: string;
  originalCategory: string;
  accountId: string;
  amount: number;
  date: string;
  description: string;
  status?: 'pending' | 'posted';
}

export const useAddRefund = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AddRefundInput) => {
      if (!user) throw new Error('You must be logged in');
      const { buildRefundRow } = await import('@/lib/transactionPayloads');
      const row = buildRefundRow({ ...input, userId: user.id });
      const { data, error } = await supabase.from('transactions').insert([row]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export interface AddReimbursementInput extends AddRefundInput {
  expectedDate?: string | null;
}

export const useAddReimbursement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AddReimbursementInput) => {
      if (!user) throw new Error('You must be logged in');
      const { buildReimbursementRow } = await import('@/lib/transactionPayloads');
      const row = buildReimbursementRow({ ...input, userId: user.id });
      const { data, error } = await supabase.from('transactions').insert([row]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};