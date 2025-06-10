
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ArrowLeft } from 'lucide-react';
import { useCategories, useMainCategories, useSubCategories, useAddCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';
import NavigationBreadcrumb from './NavigationBreadcrumb';
import CategoryGrid from './CategoryGrid';
import CategoryDialog from './CategoryDialog';

const CategoryManager = () => {
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ 
    name: '', 
    type: 'variable' as 'fixed' | 'variable', 
    monthly_budget: 0, 
    color: '#3B82F6',
    parent_category: ''
  });

  const { data: allCategories = [], isLoading } = useCategories();
  const { data: mainCategories = [] } = useMainCategories();
  const { data: subCategories = [] } = useSubCategories(selectedMainCategory || '');
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
      const categoryToAdd = {
        ...newCategory,
        parent_category: selectedMainCategory || newCategory.parent_category || undefined
      };
      
      await addCategoryMutation.mutateAsync(categoryToAdd);
      setNewCategory({ name: '', type: 'variable', monthly_budget: 0, color: '#3B82F6', parent_category: '' });
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

  const breadcrumbItems = selectedMainCategory 
    ? [
        { label: 'Categories', onClick: () => setSelectedMainCategory(null) },
        { label: selectedMainCategory }
      ]
    : [{ label: 'Categories' }];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const categoriesToShow = selectedMainCategory ? subCategories : mainCategories;

  return (
    <div className="space-y-6">
      <NavigationBreadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              {selectedMainCategory ? `${selectedMainCategory} Subcategories` : 'Category Management'}
            </h2>
            <p className="text-slate-600">
              {selectedMainCategory 
                ? `Manage subcategories for ${selectedMainCategory}`
                : 'Organize and track your spending categories'
              }
            </p>
          </div>
          <div className="flex gap-2">
            {selectedMainCategory && (
              <Button 
                variant="outline" 
                onClick={() => setSelectedMainCategory(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Main Categories
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add {selectedMainCategory ? 'Subcategory' : 'Category'}
                </Button>
              </DialogTrigger>
              <CategoryDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                selectedMainCategory={selectedMainCategory}
                mainCategories={mainCategories}
                newCategory={newCategory}
                setNewCategory={setNewCategory}
                onAddCategory={addCategory}
                isAdding={addCategoryMutation.isPending}
              />
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Categories Grid */}
      <CategoryGrid
        categories={categoriesToShow}
        allCategories={allCategories}
        getSpentAmount={getSpentAmount}
        onCategoryClick={setSelectedMainCategory}
        onDeleteCategory={deleteCategory}
        isDeleting={deleteCategoryMutation.isPending}
      />
    </div>
  );
};

export default CategoryManager;
