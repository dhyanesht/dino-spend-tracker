
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';

const CategoryManager = () => {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Food & Dining', type: 'variable', monthlyBudget: 800, spent: 850, color: '#3B82F6' },
    { id: 2, name: 'Transportation', type: 'variable', monthlyBudget: 400, spent: 420, color: '#10B981' },
    { id: 3, name: 'Entertainment', type: 'variable', monthlyBudget: 300, spent: 320, color: '#F59E0B' },
    { id: 4, name: 'Shopping', type: 'variable', monthlyBudget: 500, spent: 680, color: '#EF4444' },
    { id: 5, name: 'Rent', type: 'fixed', monthlyBudget: 1200, spent: 1200, color: '#8B5CF6' },
    { id: 6, name: 'Utilities', type: 'fixed', monthlyBudget: 250, spent: 280, color: '#06B6D4' },
  ]);

  const [newCategory, setNewCategory] = useState({ name: '', type: 'variable', monthlyBudget: 0, color: '#3B82F6' });

  const addCategory = () => {
    if (newCategory.name) {
      setCategories([
        ...categories,
        {
          id: Date.now(),
          ...newCategory,
          spent: 0,
        }
      ]);
      setNewCategory({ name: '', type: 'variable', monthlyBudget: 0, color: '#3B82F6' });
    }
  };

  const deleteCategory = (id: number) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage > 100) return { status: 'over', color: 'bg-red-500' };
    if (percentage > 80) return { status: 'warning', color: 'bg-yellow-500' };
    return { status: 'good', color: 'bg-green-500' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Category Management</h2>
            <p className="text-slate-600">Organize and track your spending categories</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g., Groceries, Gas, Subscriptions"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryType">Type</Label>
                  <Select 
                    value={newCategory.type} 
                    onValueChange={(value) => setNewCategory({ ...newCategory, type: value })}
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
                    value={newCategory.monthlyBudget}
                    onChange={(e) => setNewCategory({ ...newCategory, monthlyBudget: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <Button onClick={addCategory} className="w-full">
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const budgetStatus = getBudgetStatus(category.spent, category.monthlyBudget);
          const spentPercentage = Math.min((category.spent / category.monthlyBudget) * 100, 100);
          
          return (
            <Card key={category.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <Badge variant={category.type === 'fixed' ? 'secondary' : 'outline'}>
                    {category.type === 'fixed' ? 'Fixed' : 'Variable'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteCategory(category.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Spent this month</span>
                  <span className="font-semibold">${category.spent}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Monthly budget</span>
                  <span className="font-semibold">${category.monthlyBudget}</span>
                </div>

                {/* Progress Bar */}
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
                  {category.spent > category.monthlyBudget && (
                    <p className="text-sm text-red-600">
                      ${category.spent - category.monthlyBudget} over budget
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryManager;
