import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoryGroup {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryGroupMapping {
  id: string;
  user_id: string;
  group_id: string;
  category_id: string;
  created_at: string;
}

export interface GroupWithCategories extends CategoryGroup {
  categories: string[];
}

// Fetch all category groups
export const useCategoryGroups = () => {
  return useQuery({
    queryKey: ['category-groups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('category_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data as CategoryGroup[];
    },
  });
};

// Fetch all group mappings
export const useGroupMappings = () => {
  return useQuery({
    queryKey: ['category-group-mappings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('category_group_mappings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as CategoryGroupMapping[];
    },
  });
};

// Add a new category group
export const useAddCategoryGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (group: Omit<CategoryGroup, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('category_groups')
        .insert({ ...group, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-groups'] });
      toast.success('Category group created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create category group: ' + error.message);
    },
  });
};

// Update a category group
export const useUpdateCategoryGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CategoryGroup> }) => {
      const { data, error } = await supabase
        .from('category_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-groups'] });
      toast.success('Category group updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update category group: ' + error.message);
    },
  });
};

// Delete a category group
export const useDeleteCategoryGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('category_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-groups'] });
      queryClient.invalidateQueries({ queryKey: ['category-group-mappings'] });
      toast.success('Category group deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete category group: ' + error.message);
    },
  });
};

// Add a mapping between a category and a group
export const useAddGroupMapping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ group_id, category_id }: { group_id: string; category_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('category_group_mappings')
        .insert({ group_id, category_id, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-group-mappings'] });
    },
    onError: (error: any) => {
      toast.error('Failed to add mapping: ' + error.message);
    },
  });
};

// Remove a mapping between a category and a group
export const useRemoveGroupMapping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ group_id, category_id }: { group_id: string; category_id: string }) => {
      const { error } = await supabase
        .from('category_group_mappings')
        .delete()
        .eq('group_id', group_id)
        .eq('category_id', category_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-group-mappings'] });
    },
    onError: (error: any) => {
      toast.error('Failed to remove mapping: ' + error.message);
    },
  });
};

// Batch update mappings for a group
export const useBatchUpdateGroupMappings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ group_id, category_ids }: { group_id: string; category_ids: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete all existing mappings for this group
      await supabase
        .from('category_group_mappings')
        .delete()
        .eq('group_id', group_id);

      // Insert new mappings
      if (category_ids.length > 0) {
        const mappings = category_ids.map(category_id => ({
          group_id,
          category_id,
          user_id: user.id,
        }));

        const { error } = await supabase
          .from('category_group_mappings')
          .insert(mappings);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-group-mappings'] });
      toast.success('Category mappings updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update mappings: ' + error.message);
    },
  });
};