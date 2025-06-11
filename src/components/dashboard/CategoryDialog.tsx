
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category } from '@/hooks/useCategories';

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMainCategory: string | null;
  mainCategories: Category[];
  newCategory: {
    name: string;
    type: 'fixed' | 'variable';
    monthly_budget: number;
    color: string;
    parent_category: string | null;
  };
  setNewCategory: (category: any) => void;
  onAddCategory: () => void;
  isAdding: boolean;
}

const CategoryDialog = ({
  isOpen,
  onOpenChange,
  selectedMainCategory,
  mainCategories,
  newCategory,
  setNewCategory,
  onAddCategory,
  isAdding
}: CategoryDialogProps) => {
  const isCreatingSubcategory = selectedMainCategory !== null;

  React.useEffect(() => {
    if (isCreatingSubcategory) {
      setNewCategory({ 
        ...newCategory, 
        parent_category: selectedMainCategory 
      });
    } else {
      setNewCategory({ 
        ...newCategory, 
        parent_category: null 
      });
    }
  }, [selectedMainCategory, isCreatingSubcategory]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCreatingSubcategory 
              ? `Create New Subcategory in ${selectedMainCategory}` 
              : 'Create New Category'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="categoryName">Category Name</Label>
            <Input
              id="categoryName"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder={isCreatingSubcategory 
                ? "e.g., Groceries, Gas, Movies" 
                : "e.g., Everyday, Transportation, Entertainment"
              }
            />
          </div>
          
          {!isCreatingSubcategory && (
            <div>
              <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
              <Select 
                value={newCategory.parent_category || 'none'} 
                onValueChange={(value) => setNewCategory({ 
                  ...newCategory, 
                  parent_category: value === 'none' ? null : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Create as Parent Category</SelectItem>
                  {mainCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
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
            onClick={onAddCategory} 
            className="w-full"
            disabled={isAdding}
          >
            {isAdding ? 'Creating...' : 'Create Category'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;
