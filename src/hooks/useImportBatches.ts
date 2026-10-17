import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ImportBatchInsert } from '@/lib/validation';

export const useImportBatches = () => useQuery({
  queryKey: ['import_batches'],
  queryFn: async () => {
    const { data, error } = await supabase.from('import_batches').select('*').order('import_timestamp', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const useImportBatch = (batchId: string) => useQuery({
  queryKey: ['import_batch', batchId],
  queryFn: async () => {
    const { data, error } = await supabase.from('import_batches').select('*').eq('id', batchId).single();
    if (error) throw error;
    return data;
  },
  enabled: !!batchId,
});

export const useImportBatchDetails = (batchId: string) => useQuery({
  queryKey: ['import_batch_details', batchId],
  queryFn: async () => {
    const { data, error } = await supabase.from('import_batch_details').select('*').eq('import_batch_id', batchId).order('row_number');
    if (error) throw error;
    return data ?? [];
  },
  enabled: !!batchId,
});

export const useCreateImportBatch = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (batch: ImportBatchInsert) => {
      if (!user) throw new Error('You must be logged in');
      const { data, error } = await supabase.from('import_batches').insert([{ ...batch, user_id: user.id }]).select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import_batches'] }),
  });
};

export const useUpdateImportBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, updates }: { batchId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('import_batches').update(updates).eq('id', batchId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import_batches'] }),
  });
};

export const useRetryImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data: batch, error: batchError } = await supabase.from('import_batches').select('retry_count').eq('id', batchId).single();
      if (batchError) throw batchError;
      const { error } = await supabase.from('import_batches').update({
        status: 'processing',
        retry_count: (batch?.retry_count ?? 0) + 1,
        last_retry_at: new Date().toISOString(),
      }).eq('id', batchId);
      if (error) throw error;
      return batchId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import_batches'] }),
  });
};
export const useUndoImport = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (batchId: string): Promise<string[]> => {
      if (!user) throw new Error('You must be logged in');
      const { data, error } = await supabase.rpc('cleanup_import_batch', { p_batch_id: batchId, p_user_id: user.id, p_force: false });
      if (error) throw error;
      return (data as string[]) ?? [];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['import_batches'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};
