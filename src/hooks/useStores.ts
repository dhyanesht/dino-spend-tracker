
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Store {
  id: string;
  name: string;
  category_name: string;
  created_at: string;
  updated_at: string;
}

export const useStores = () => {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      console.log('Fetching stores...');
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching stores:', error);
        throw error;
      }
      console.log('Stores fetched:', data?.length, 'records');
      return data as Store[];
    },
  });
};

export const useStoreByName = (storeName: string) => {
  return useQuery({
    queryKey: ['store', storeName],
    queryFn: async () => {
      if (!storeName) return null;
      
      console.log('Looking up store:', storeName);
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('name', storeName)
        .maybeSingle();
      
      if (error) {
        console.error('Error looking up store:', error);
        throw error;
      }
      console.log('Store lookup result:', data);
      return data as Store | null;
    },
    enabled: !!storeName,
  });
};

export const useAddStore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (store: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Adding store mapping:', store);
      const { data, error } = await supabase
        .from('stores')
        .insert([store])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding store:', error);
        throw error;
      }
      console.log('Store added successfully:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Invalidating stores query cache');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};

export const useUpdateStore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Store> & { id: string }) => {
      console.log('Updating store:', id, updates);
      const { data, error } = await supabase
        .from('stores')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating store:', error);
        throw error;
      }
      console.log('Store updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Invalidating stores query cache');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};
