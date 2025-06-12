
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParentCategories, useSubcategories, useUpdateCategory } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { toast } from 'sonner';

const BudgetManager = () => {
  const { data: parentCategories = [] } = useParentCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { data: transactions = [] } = useTransactions();
  const updateCategory = useUpdateCategory();
  
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>({});

  const handleBudgetChange = (categoryId: string, value: string) => {
    setEditingBudgets(prev => ({
      ...prev,
      [categoryId]: value
    }));
  };

  const handleSaveBudget = async (categoryId: string, currentBudget: number) => {
    const newBudget = editingBudgets[categoryId];
    if (!newBudget || parseFloat(newBudget) < 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: categoryId,
        monthly_budget: parseFloat(newBudget)
      });
      
      setEditingBudgets(prev => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });
      
      toast.success('Budget updated successfully');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    }
  };

  // Calculate current month spending for each category
  const getCurrentMonthSpending = (categoryName: string, isParent: boolean = false) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    if (isParent) {
      // For parent categories, sum all subcategory spending
      const relatedSubcategories = subcategories.filter(sub => sub.parent_category === categoryName);
      return transactions
        .filter(t => 
          t.date.startsWith(currentMonth) && 
          t.type === 'expense' &&
          relatedSubcategories.some(sub => sub.name === t.category)
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);
    } else {
      // For subcategories, direct match
      return transactions
        .filter(t => 
          t.date.startsWith(currentMonth) && 
          t.type === 'expense' &&
          t.category === categoryName
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);
    }
  };

  const getBudgetUtilization = (spent: number, budget: number) => {
    if (budget === 0) return 0;
    return (spent / budget) * 100;
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-50';
    if (percentage >= 80) return 'text-orange-600 bg-orange-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Budget Management</h2>
        <p className="text-slate-600 mb-6">
          Set monthly budgets for your categories and track your spending progress.
        </p>

        {/* Parent Categories */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Parent Categories</h3>
          {parentCategories.map((category) => {
            const currentSpending = getCurrentMonthSpending(category.name, true);
            const budget = Number(category.monthly_budget);
            const utilization = getBudgetUtilization(currentSpending, budget);
            const isEditing = editingBudgets[category.id] !== undefined;

            return (
              <div key={category.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <h4 className="font-medium">{category.name}</h4>
                  </div>
                  <div className={`px-2 py-1 rounded text-sm ${getUtilizationColor(utilization)}`}>
                    {utilization.toFixed(1)}% used
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label>Monthly Budget</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingBudgets[category.id]}
                        onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <div className="text-lg font-semibold">${budget.toFixed(2)}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Current Spending</Label>
                    <div className="text-lg">${currentSpending.toFixed(2)}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveBudget(category.id, budget)}
                          disabled={updateCategory.isPending}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingBudgets(prev => {
                            const updated = { ...prev };
                            delete updated[category.id];
                            return updated;
                          })}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBudgetChange(category.id, budget.toString())}
                      >
                        Edit Budget
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      utilization >= 100 ? 'bg-red-500' :
                      utilization >= 80 ? 'bg-orange-500' :
                      utilization >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Subcategories */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-medium">Subcategories</h3>
          {subcategories.map((category) => {
            const currentSpending = getCurrentMonthSpending(category.name, false);
            const budget = Number(category.monthly_budget);
            const utilization = getBudgetUtilization(currentSpending, budget);
            const isEditing = editingBudgets[category.id] !== undefined;

            return (
              <div key={category.id} className="border rounded-lg p-4 space-y-3 ml-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <h4 className="font-medium">{category.name}</h4>
                    <span className="text-sm text-slate-500">({category.parent_category})</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-sm ${getUtilizationColor(utilization)}`}>
                    {utilization.toFixed(1)}% used
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label>Monthly Budget</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingBudgets[category.id]}
                        onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <div className="text-lg font-semibold">${budget.toFixed(2)}</div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Current Spending</Label>
                    <div className="text-lg">${currentSpending.toFixed(2)}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveBudget(category.id, budget)}
                          disabled={updateCategory.isPending}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingBudgets(prev => {
                            const updated = { ...prev };
                            delete updated[category.id];
                            return updated;
                          })}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBudgetChange(category.id, budget.toString())}
                      >
                        Edit Budget
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      utilization >= 100 ? 'bg-red-500' :
                      utilization >= 80 ? 'bg-orange-500' :
                      utilization >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default BudgetManager;
