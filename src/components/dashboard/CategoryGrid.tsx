
import React from 'react';
import CategoryCard from './CategoryCard';
import { Category } from '@/hooks/useCategories';

interface CategoryGridProps {
  categories: Category[];
  allCategories: Category[];
  getSpentAmount: (categoryName: string) => number;
  onCategoryClick?: (categoryName: string) => void;
  onDeleteCategory: (id: string) => void;
  isDeleting: boolean;
}

const CategoryGrid = ({
  categories,
  allCategories,
  getSpentAmount,
  onCategoryClick,
  onDeleteCategory,
  isDeleting
}: CategoryGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => {
        const spent = getSpentAmount(category.name);
        const isMainCategory = !category.parent_category;
        const hasSubcategories = isMainCategory && allCategories.some(cat => cat.parent_category === category.name);
        const subcategoryCount = allCategories.filter(cat => cat.parent_category === category.name).length;
        
        return (
          <CategoryCard
            key={category.id}
            category={category}
            spent={spent}
            hasSubcategories={hasSubcategories}
            subcategoryCount={subcategoryCount}
            onClick={hasSubcategories ? () => onCategoryClick?.(category.name) : undefined}
            onDelete={() => onDeleteCategory(category.id)}
            isDeleting={isDeleting}
          />
        );
      })}
    </div>
  );
};

export default CategoryGrid;
