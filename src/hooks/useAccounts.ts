import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { accountSchema, type AccountInput } from '@/lib/validation';
import { setPrimaryMutations, pickDefaultAccount } from '@/lib/accountOps';
import type { Database } from '@/integrations/supabase/types';

export type Account = Database['public']['Tables']['accounts']['Row'];
export type AccountType = Database['public']['Enums']['account_type'];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking', savings: 'Savings', credit_card: 'Credit Card',
  investment: 'Investment', cash: 'Cash', other: 'Other',
};

export const useAccounts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['accounts'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*').order('name');
      if (error) throw error;
      return data as Account[];
    },
  });
};

export const useDefaultAccount = () => {
  const { data = [] } = useAccounts();
  return pickDefaultAccount(data);
};

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['accounts'] });
};

export const useAddAccount = () => {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: AccountInput) => {
      if (!user) throw new Error('You must be logged in');
      const v = accountSchema.parse(input);
      const { data, error } = await supabase.from('accounts').insert({
        name: v.name, type: v.type, currency: v.currency, is_active: v.is_active,
        balance: v.balance ?? 0, is_primary: false, user_id: user.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateAccount = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Account, 'user_id' | 'is_primary' | 'id'>> }) => {
      const { error } = await supabase.from('accounts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
};

/** Soft delete (is_active=false) so historical transactions keep their account. */
export const useDeleteAccount = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').update({ is_active: false, is_primary: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
};

export const useSetPrimaryAccount = () => {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('You must be logged in');
      const [unset, set] = setPrimaryMutations(user.id, id);
      const r1 = await supabase.from('accounts').update(unset.values).eq('user_id', user.id).eq('is_primary', true);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from('accounts').update(set.values).eq('id', id);
      if (r2.error) throw r2.error;
    },
    onSuccess: invalidate,
  });
};
