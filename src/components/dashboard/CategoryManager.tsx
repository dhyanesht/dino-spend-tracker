
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Download, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories, useParentCategories, useSubcategories, useAddCategory, useDeleteCategory, useUpdateCategory } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import CategoryGrid from './CategoryGrid';
import CategoryDialog from './CategoryDialog';
import StoreManager from './StoreManager';
import CategoryGroupManager from './CategoryGroupManager';
import { toast } from 'sonner';

const CategoryManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'variable' as 'fixed' | 'variable',
    monthly_budget: 0,
    color: '#3B82F6',
    parent_category: null as string | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allCategories = [], isLoading: categoriesLoading } = useCategories();
  const { data: parentCategories = [], isLoading: parentLoading } = useParentCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();
  const { data: transactions = [] } = useTransactions();
  const addCategory = useAddCategory();
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();

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

  const handleUpdateCategoryColor = async (categoryId: string, color: string) => {
    try {
      await updateCategory.mutateAsync({ id: categoryId, color });
      toast.success('Category color updated successfully!');
    } catch (error) {
      console.error('Error updating category color:', error);
      toast.error('Failed to update category color');
    }
  };

  const getCurrentCategories = () => {
    if (selectedMainCategory) {
      return subcategories.filter(cat => cat.parent_category === selectedMainCategory);
    }
    return parentCategories;
  };

  const handleExportCategories = () => {
    try {
      // Prepare export data (exclude id, user_id, created_at)
      const exportData = allCategories.map(cat => ({
        name: cat.name,
        type: cat.type,
        monthly_budget: cat.monthly_budget,
        color: cat.color,
        parent_category: cat.parent_category,
      }));

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categories-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.length} categories`);
    } catch (error) {
      console.error('Error exporting categories:', error);
      toast.error('Failed to export categories');
    }
  };

  const handleImportCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedCategories = JSON.parse(content);

        if (!Array.isArray(importedCategories)) {
          throw new Error('Invalid file format. Expected an array of categories.');
        }

        // Validate structure
        const validCategories = importedCategories.filter(cat => 
          cat.name && cat.type && typeof cat.monthly_budget === 'number'
        );

        if (validCategories.length === 0) {
          throw new Error('No valid categories found in file');
        }

        // Import categories one by one
        let successCount = 0;
        let skipCount = 0;

        for (const cat of validCategories) {
          try {
            // Check if category already exists
            const exists = allCategories.some(existing => existing.name === cat.name);
            if (exists) {
              skipCount++;
              continue;
            }

            await addCategory.mutateAsync({
              name: cat.name,
              type: cat.type,
              monthly_budget: cat.monthly_budget || 0,
              color: cat.color || '#3B82F6',
              parent_category: cat.parent_category || null,
            });
            successCount++;
          } catch (error) {
            console.error(`Failed to import category ${cat.name}:`, error);
          }
        }

        toast.success(
          `Import complete! Added ${successCount} categories${skipCount > 0 ? `, skipped ${skipCount} duplicates` : ''}`
        );
      } catch (error) {
        console.error('Error importing categories:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to import categories');
      }
    };

    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportCategories}
        className="hidden"
      />
      
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="groups">Category Groups</TabsTrigger>
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={handleExportCategories}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </div>
          </div>

          <CategoryGrid
            categories={getCurrentCategories()}
            allCategories={allCategories}
            getSpentAmount={getSpentAmount}
            onDeleteCategory={handleDeleteCategory}
            onUpdateCategoryColor={handleUpdateCategoryColor}
            onClick={selectedMainCategory ? undefined : handleCategoryClick}
            isDeleting={deleteCategory.isPending}
            isUpdating={updateCategory.isPending}
          />

          <CategoryDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            selectedMainCategory={selectedMainCategory}
            mainCategories={parentCategories}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            onAddCategory={handleAddCategory}
            isAdding={addCategory.isPending}
          />
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <CategoryGroupManager />
        </TabsContent>

        <TabsContent value="stores" className="space-y-6">
          <StoreManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CategoryManager;
