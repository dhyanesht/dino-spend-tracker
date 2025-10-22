import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { categorySchema } from '@/lib/validation';
import { useAuth } from '@/contexts/AuthContext';

export interface Category {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  monthly_budget: number;
  color: string;
  created_at: string;
  parent_category: string | null;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
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

export const useParentCategories = () => {
  return useQuery({
    queryKey: ['parent-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category', null)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching parent categories:', error);
        throw error;
      }
      console.log('Parent categories fetched:', data);
      return data as Category[];
    },
  });
};

export const useSubcategories = () => {
  return useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .not('parent_category', 'is', null)
        .order('parent_category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching subcategories:', error);
        throw error;
      }
      console.log('Subcategories fetched:', data);
      return data as Category[];
    },
  });
};

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'created_at'>) => {
      if (!user) throw new Error('You must be logged in to add categories');
      
      // Validate input
      const validated = categorySchema.parse({
        name: category.name,
        type: category.type,
        monthly_budget: category.monthly_budget,
        color: category.color,
        parent_category: category.parent_category
      });
      
      console.log('Adding category:', validated);
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: validated.name,
          type: validated.type,
          monthly_budget: validated.monthly_budget,
          color: validated.color,
          parent_category: validated.parent_category,
          user_id: user.id
        }])
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
      queryClient.invalidateQueries({ queryKey: ['parent-categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      console.log('Updating category:', id, updates);
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating category:', error);
        throw error;
      }
      console.log('Category updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['parent-categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
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
      queryClient.invalidateQueries({ queryKey: ['parent-categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
};
