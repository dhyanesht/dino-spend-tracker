
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useCategories, useParentCategories, useSubcategories, useAddCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';
import CategoryGrid from './CategoryGrid';
import CategoryDialog from './CategoryDialog';

const CategoryManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ 
    name: '', 
    type: 'variable' as 'fixed' | 'variable', 
    monthly_budget: 0, 
    color: '#3B82F6',
    parent_category: null as string | null
  });

  const { data: allCategories = [], isLoading } = useCategories();
  const { data: parentCategories = [] } = useParentCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { data: transactions = [] } = useTransactions();
  const addCategoryMutation = useAddCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { toast } = useToast();

  // Calculate current month spending for categories
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = transactions.filter(t => 
    t.date.startsWith(currentMonth) && t.type === 'expense'
  );

  const getSpentAmount = (categoryName: string) => {
    return currentMonthTransactions
      .filter(t => t.category === categoryName)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getParentCategorySpentAmount = (parentCategoryName: string) => {
    const relatedSubcategories = subcategories.filter(sub => sub.parent_category === parentCategoryName);
    return currentMonthTransactions
      .filter(t => relatedSubcategories.some(sub => sub.name === t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await addCategoryMutation.mutateAsync(newCategory);
      setNewCategory({ name: '', type: 'variable', monthly_budget: 0, color: '#3B82F6', parent_category: null });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteCategoryMutation.mutateAsync(id);
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleParentCategoryClick = (parentCategoryName: string) => {
    setSelectedMainCategory(selectedMainCategory === parentCategoryName ? null : parentCategoryName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const displayCategories = selectedMainCategory 
    ? subcategories.filter(cat => cat.parent_category === selectedMainCategory)
    : parentCategories;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Category Management</h2>
            <p className="text-slate-600">
              {selectedMainCategory 
                ? `Subcategories in ${selectedMainCategory}`
                : 'Organize and track your spending categories'}
            </p>
            {selectedMainCategory && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedMainCategory(null)}
                className="mt-2"
              >
                ← Back to Parent Categories
              </Button>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <CategoryDialog
              isOpen={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              selectedMainCategory={selectedMainCategory}
              mainCategories={parentCategories}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              onAddCategory={addCategory}
              isAdding={addCategoryMutation.isPending}
            />
          </Dialog>
        </div>
      </Card>

      {/* Categories Grid */}
      <CategoryGrid
        categories={displayCategories}
        allCategories={allCategories}
        getSpentAmount={selectedMainCategory ? getSpentAmount : getParentCategorySpentAmount}
        onDeleteCategory={deleteCategory}
        onClick={selectedMainCategory ? undefined : handleParentCategoryClick}
        isDeleting={deleteCategoryMutation.isPending}
      />
    </div>
  );
};

export default CategoryManager;
