
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories, useParentCategories, useSubcategories, useAddCategory, useDeleteCategory, useUpdateCategory } from '@/hooks/useCategories';
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

  // For handling color picker state on each card
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [pendingColor, setPendingColor] = useState<string>('');
  const [colorSavingId, setColorSavingId] = useState<string | null>(null);

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

  const getCurrentCategories = () => {
    if (selectedMainCategory) {
      return subcategories.filter(cat => cat.parent_category === selectedMainCategory);
    }
    return parentCategories;
  };

  const handleStartColorEdit = (category: {id: string, color: string}) => {
    setEditingColorId(category.id);
    setPendingColor(category.color || "#3B82F6");
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingColor(e.target.value);
  };

  const handleSaveColor = async (category: {id: string, name: string}) => {
    setColorSavingId(category.id);
    try {
      await updateCategory.mutateAsync({ id: category.id, color: pendingColor });
      toast.success(`Color updated for "${category.name}".`);
      setEditingColorId(null);
    } catch {
      toast.error("Failed to update category color");
    } finally {
      setColorSavingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingColorId(null);
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

          {/* Parent categories grid with color next to name, editable as admin */}
          {!selectedMainCategory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {parentCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-800 border p-4"
                >
                  <div className="flex items-center gap-3">
                    {/* Color dot next to name; editable if admin */}
                    {isAdmin ? (
                      editingColorId === cat.id ? (
                        <div className="relative flex items-center group">
                          <input
                            type="color"
                            value={pendingColor}
                            onChange={handleColorChange}
                            className="w-7 h-7 border-none p-0 bg-transparent cursor-pointer rounded-full"
                            aria-label="Pick color"
                            disabled={colorSavingId === cat.id}
                            style={{ background: "none", appearance: "none", outline: "none" }}
                          />
                          <button
                            onClick={() => handleSaveColor(cat)}
                            className={`ml-2 text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition ${colorSavingId === cat.id ? 'opacity-50 cursor-wait' : ''}`}
                            disabled={colorSavingId === cat.id}
                          >
                            {colorSavingId === cat.id ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="ml-1 text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600"
                            disabled={colorSavingId === cat.id}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartColorEdit(cat)}
                          className="relative border-none outline-none bg-transparent flex items-center p-0 hover:scale-105 duration-150 transition cursor-pointer"
                          aria-label={`Edit color for category ${cat.name}`}
                          title="Edit category color"
                          style={{ background: 'none' }}
                        >
                          <span
                            className="block w-5 h-5 rounded-full"
                            style={{ background: cat.color || "#3B82F6" }}
                          />
                        </button>
                      )
                    ) : (
                      <span
                        className="block w-5 h-5 rounded-full border border-gray-300"
                        style={{ background: cat.color || "#3B82F6" }}
                        aria-label="Category color"
                      />
                    )}
                    <span className="text-lg font-semibold">{cat.name}</span>
                  </div>
                  {/* You may add more info/controls here */}
                </div>
              ))}
            </div>
          )}

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

