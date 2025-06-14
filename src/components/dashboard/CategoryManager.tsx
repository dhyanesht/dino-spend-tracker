import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories, useParentCategories, useSubcategories, useAddCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import CategoryGrid from './CategoryGrid';
import CategoryDialog from './CategoryDialog';
import StoreManager from './StoreManager';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';

const CategoryManager = () => {
  const { isAdmin } = useAdmin();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'variable' as 'fixed' | 'variable',
    monthly_budget: 0,
    color: '#3B82F6',
    parent_category: null as string | null,
  });

  const { data: allCategories = [], isLoading: categoriesLoading } = useCategories();
  const { data: parentCategories = [], isLoading: parentLoading } = useParentCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();
  const { data: transactions = [] } = useTransactions();
  const addCategory = useAddCategory();
  const deleteCategory = useDeleteCategory();

  const getSpentAmount = (categoryName: string) => {
    return transactions
      .filter(t => t.category === categoryName && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const handleCategoryClick = (categoryName: string) => {
    setSelectedMainCategory(categoryName);
  };

  const handleBackToParentCategories = () => {
    setSelectedMainCategory(null);
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      await addCategory.mutateAsync(newCategory);
      toast.success('Category created successfully!');
      setIsDialogOpen(false);
      setNewCategory({
        name: '',
        type: 'variable',
        monthly_budget: 0,
        color: '#3B82F6',
        parent_category: null,
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory.mutateAsync(categoryId);
      toast.success('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const getCurrentCategories = () => {
    if (selectedMainCategory) {
      return subcategories.filter(cat => cat.parent_category === selectedMainCategory);
    }
    return parentCategories;
  };

  if (categoriesLoading || parentLoading || subcategoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="stores">Store Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedMainCategory && (
                <Button
                  variant="outline"
                  onClick={handleBackToParentCategories}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Categories
                </Button>
              )}
              <div>
                <h2 className="text-2xl font-semibold">
                  {selectedMainCategory ? `${selectedMainCategory} Subcategories` : 'Expense Categories'}
                </h2>
                <p className="text-slate-600">
                  {selectedMainCategory 
                    ? `Manage subcategories within ${selectedMainCategory}`
                    : 'Manage your expense categories and budgets'
                  }
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              className="flex items-center gap-2"
              disabled={!isAdmin}
              variant={!isAdmin ? "outline" : undefined}
              title={!isAdmin ? "Unlock edit mode to add categories" : undefined}
            >
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </div>

          <CategoryGrid
            categories={getCurrentCategories()}
            allCategories={allCategories}
            getSpentAmount={getSpentAmount}
            onDeleteCategory={isAdmin ? handleDeleteCategory : undefined}
            onClick={selectedMainCategory ? undefined : (isAdmin ? handleCategoryClick : undefined)}
            isDeleting={deleteCategory.isPending}
          />

          <CategoryDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            selectedMainCategory={selectedMainCategory}
            mainCategories={parentCategories}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            onAddCategory={isAdmin ? handleAddCategory : () => {}}
            isAdding={addCategory.isPending}
          />
        </TabsContent>

        <TabsContent value="stores" className="space-y-6">
          <StoreManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CategoryManager;
