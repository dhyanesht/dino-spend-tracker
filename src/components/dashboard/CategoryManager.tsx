
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, ArrowLeft, FolderOpen, Folder } from 'lucide-react';
import { useCategories, useMainCategories, useSubCategories, useAddCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';
import NavigationBreadcrumb from './NavigationBreadcrumb';

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

  const getBudgetStatus = (spent: number, budget: number) => {
    if (budget === 0) return { status: 'none', color: 'bg-gray-300' };
    const percentage = (spent / budget) * 100;
    if (percentage > 100) return { status: 'over', color: 'bg-red-500' };
    if (percentage > 80) return { status: 'warning', color: 'bg-yellow-500' };
    return { status: 'good', color: 'bg-green-500' };
  };

  const getSpentAmount = (categoryName: string) => {
    return currentMonthTransactions
      .filter(t => t.category === categoryName)
      .reduce((sum, t) => sum + Number(t.amount), 0);
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Create New {selectedMainCategory ? 'Subcategory' : 'Category'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder={selectedMainCategory ? "e.g., Groceries, Gas" : "e.g., Entertainment, Transportation"}
                    />
                  </div>
                  
                  {!selectedMainCategory && (
                    <div>
                      <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
                      <Select 
                        value={newCategory.parent_category} 
                        onValueChange={(value) => setNewCategory({ ...newCategory, parent_category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None (Main Category)</SelectItem>
                          {mainCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="categoryType">Type</Label>
                    <Select 
                      value={newCategory.type} 
                      onValueChange={(value: 'fixed' | 'variable') => setNewCategory({ ...newCategory, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Expense</SelectItem>
                        <SelectItem value="variable">Variable Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="monthlyBudget">Monthly Budget</Label>
                    <Input
                      id="monthlyBudget"
                      type="number"
                      value={newCategory.monthly_budget}
                      onChange={(e) => setNewCategory({ ...newCategory, monthly_budget: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    />
                  </div>
                  
                  <Button 
                    onClick={addCategory} 
                    className="w-full"
                    disabled={addCategoryMutation.isPending}
                  >
                    {addCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoriesToShow.map((category) => {
          const spent = getSpentAmount(category.name);
          const budgetStatus = getBudgetStatus(spent, Number(category.monthly_budget));
          const spentPercentage = category.monthly_budget > 0 
            ? Math.min((spent / Number(category.monthly_budget)) * 100, 100) 
            : 0;
          
          const isMainCategory = !category.parent_category;
          const hasSubcategories = isMainCategory && allCategories.some(cat => cat.parent_category === category.name);
          
          return (
            <Card 
              key={category.id} 
              className={`p-6 hover:shadow-lg transition-shadow ${hasSubcategories ? 'cursor-pointer' : ''}`}
              onClick={hasSubcategories ? () => setSelectedMainCategory(category.name) : undefined}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  {hasSubcategories && (
                    <FolderOpen className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={category.type === 'fixed' ? 'secondary' : 'outline'}>
                        {category.type === 'fixed' ? 'Fixed' : 'Variable'}
                      </Badge>
                      {hasSubcategories && (
                        <Badge variant="outline" className="text-blue-600">
                          {allCategories.filter(cat => cat.parent_category === category.name).length} subcategories
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {!hasSubcategories && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(category.id);
                      }}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Spent this month</span>
                  <span className="font-semibold">${spent.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Monthly budget</span>
                  <span className="font-semibold">${Number(category.monthly_budget).toFixed(2)}</span>
                </div>

                {/* Progress Bar */}
                {Number(category.monthly_budget) > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{spentPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${budgetStatus.color}`}
                        style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                      ></div>
                    </div>
                    {spent > Number(category.monthly_budget) && (
                      <p className="text-sm text-red-600">
                        ${(spent - Number(category.monthly_budget)).toFixed(2)} over budget
                      </p>
                    )}
                  </div>
                )}
                
                {hasSubcategories && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-blue-600 flex items-center gap-1">
                      <Folder className="w-4 h-4" />
                      Click to view subcategories
                    </p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryManager;
