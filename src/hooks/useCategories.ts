
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  monthly_budget: number;
  color: string;
  parent_category?: string;
  created_at: string;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('parent_category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
      console.log('Categories fetched:', data);
      return data as Category[];
    },
  });
};

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'created_at'>) => {
      console.log('Adding category:', category);
      const { data, error } = await supabase
        .from('categories')
        .insert([category])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding category:', error);
        throw error;
      }
      console.log('Category added:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['main-categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryId: string) => {
      console.log('Deleting category:', categoryId);
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) {
        console.error('Error deleting category:', error);
        throw error;
      }
      console.log('Category deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['main-categories'] });
    },
  });
};

// Get main categories only
export const useMainCategories = () => {
  return useQuery({
    queryKey: ['main-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category', null)
        .order('name');
      
      if (error) {
        console.error('Error fetching main categories:', error);
        throw error;
      }
      return data as Category[];
    },
  });
};

// Get subcategories for a main category
export const useSubCategories = (mainCategoryName: string) => {
  return useQuery({
    queryKey: ['subcategories', mainCategoryName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_category', mainCategoryName)
        .order('name');
      
      if (error) {
        console.error('Error fetching subcategories:', error);
        throw error;
      }
      return data as Category[];
    },
    enabled: Boolean(mainCategoryName),
  });
};
