
import React from 'react';
import CategoryCard from './CategoryCard';
import { Category } from '@/hooks/useCategories';

interface CategoryGridProps {
  categories: Category[];
  allCategories: Category[];
  getSpentAmount: (categoryName: string) => number;
  onDeleteCategory: (id: string) => void;
  isDeleting: boolean;
}

const CategoryGrid = ({
  categories,
  allCategories,
  getSpentAmount,
  onDeleteCategory,
  isDeleting
}: CategoryGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => {
        const spent = getSpentAmount(category.name);
        
        return (
          <CategoryCard
            key={category.id}
            category={category}
            spent={spent}
            hasSubcategories={false}
            subcategoryCount={0}
            onClick={undefined}
            onDelete={() => onDeleteCategory(category.id)}
            isDeleting={isDeleting}
          />
        );
      })}
    </div>
  );
};

export default CategoryGrid;
