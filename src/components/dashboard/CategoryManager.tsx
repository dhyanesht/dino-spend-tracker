
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useCategories, useAddCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';

const CategoryManager = () => {
  const { data: categories = [], isLoading } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const addCategoryMutation = useAddCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { toast } = useToast();

  const [newCategory, setNewCategory] = React.useState({ 
    name: '', 
    type: 'variable' as 'fixed' | 'variable', 
    monthly_budget: 0, 
    color: '#3B82F6' 
  });
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

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
      setNewCategory({ name: '', type: 'variable', monthly_budget: 0, color: '#3B82F6' });
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

  // Calculate current month spending for each category
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = transactions.filter(t => 
    t.date.startsWith(currentMonth) && t.type === 'expense'
  );

  const getBudgetStatus = (spent: number, budget: number) => {
    if (budget === 0) return { status: 'none', color: 'bg-gray-300' };
    const percentage = (spent / budget) * 100;
    if (percentage > 100) return { status: 'over', color: 'bg-red-500' };
    if (percentage > 80) return { status: 'warning', color: 'bg-yellow-500' };
    return { status: 'good', color: 'bg-green-500' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Category Management</h2>
            <p className="text-slate-600">Organize and track your spending categories</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
      </Card>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const spent = currentMonthTransactions
            .filter(t => t.category === category.name)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          const budgetStatus = getBudgetStatus(spent, Number(category.monthly_budget));
          const spentPercentage = category.monthly_budget > 0 
            ? Math.min((spent / Number(category.monthly_budget)) * 100, 100) 
            : 0;
          
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteCategory(category.id)}
                    disabled={deleteCategoryMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
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
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryManager;
