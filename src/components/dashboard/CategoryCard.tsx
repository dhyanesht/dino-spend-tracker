import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FolderOpen, Folder } from 'lucide-react';
import { Category } from '@/hooks/useCategories';

interface CategoryCardProps {
  category: Category;
  spent: number;
  hasSubcategories: boolean;
  subcategoryCount: number;
  onEdit?: () => void;
  onDelete: () => void;
  onClick?: () => void;
  isDeleting?: boolean;
}

const CategoryCard = ({ 
  category, 
  spent, 
  hasSubcategories, 
  subcategoryCount,
  onEdit, 
  onDelete, 
  onClick,
  isDeleting 
}: CategoryCardProps) => {
  const budgetStatus = getBudgetStatus(spent, Number(category.monthly_budget));
  const spentPercentage = category.monthly_budget > 0 
    ? Math.min((spent / Number(category.monthly_budget)) * 100, 100) 
    : 0;

  return (
    <Card 
      className={`p-4 hover:shadow-lg transition-shadow ${hasSubcategories ? 'cursor-pointer' : ''}`}
      onClick={hasSubcategories ? onClick : undefined}
    >
      <div className="flex justify-between items-start mb-3">
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
                  {subcategoryCount} subcategories
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {!hasSubcategories && (
          <div className="flex gap-1">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
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
          <div className="space-y-1">
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
              <p className="text-xs text-red-600">
                ${(spent - Number(category.monthly_budget)).toFixed(2)} over budget
              </p>
            )}
          </div>
        )}
        
        {hasSubcategories && (
          <div className="pt-2 border-t mt-2">
            <p className="text-sm text-blue-600 flex items-center gap-1">
              <Folder className="w-4 h-4" />
              Click to view subcategories
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

const getBudgetStatus = (spent: number, budget: number) => {
  if (budget === 0) return { status: 'none', color: 'bg-gray-300' };
  const percentage = (spent / budget) * 100;
  if (percentage > 100) return { status: 'over', color: 'bg-red-500' };
  if (percentage > 80) return { status: 'warning', color: 'bg-yellow-500' };
  return { status: 'good', color: 'bg-green-500' };
};

export default CategoryCard;
