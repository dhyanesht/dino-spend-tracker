
import React from 'react';
import CategoryCard from './CategoryCard';
import { Category } from '@/hooks/useCategories';

interface CategoryGridProps {
  categories: Category[];
  allCategories: Category[];
  getSpentAmount: (categoryName: string) => number;
  onDeleteCategory: (id: string) => void;
  onClick?: (categoryName: string) => void;
  isDeleting: boolean;
}

const CategoryGrid = ({
  categories,
  allCategories,
  getSpentAmount,
  onDeleteCategory,
  onClick,
  isDeleting
}: CategoryGridProps) => {
  const getSubcategoryCount = (parentCategoryName: string) => {
    return allCategories.filter(cat => cat.parent_category === parentCategoryName).length;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => {
        const spent = getSpentAmount(category.name);
        const isParentCategory = category.parent_category === null;
        const subcategoryCount = isParentCategory ? getSubcategoryCount(category.name) : 0;
        
        return (
          <CategoryCard
            key={category.id}
            category={category}
            spent={spent}
            hasSubcategories={isParentCategory && subcategoryCount > 0}
            subcategoryCount={subcategoryCount}
            onClick={onClick ? () => onClick(category.name) : undefined}
            onDelete={() => onDeleteCategory(category.id)}
            isDeleting={isDeleting}
          />
        );
      })}
    </div>
  );
};

export default CategoryGrid;
