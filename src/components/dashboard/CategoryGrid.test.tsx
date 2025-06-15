
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryGrid from './CategoryGrid';
import { Category } from '@/hooks/useCategories';

const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Groceries',
    type: 'variable',
    monthly_budget: 300,
    color: '#FF5733',
    created_at: '2024-01-01T00:00:00Z',
    parent_category: 'Food'
  },
  {
    id: '2',
    name: 'Transportation',
    type: 'fixed',
    monthly_budget: 200,
    color: '#33FF57',
    created_at: '2024-01-01T00:00:00Z',
    parent_category: null
  },
  {
    id: '3',
    name: 'Gas',
    type: 'variable',
    monthly_budget: 100,
    color: '#3357FF',
    created_at: '2024-01-01T00:00:00Z',
    parent_category: 'Transportation'
  }
];

describe('CategoryGrid', () => {
  const mockGetSpentAmount = vi.fn((categoryName: string) => {
    const amounts: { [key: string]: number } = {
      'Groceries': 150,
      'Transportation': 180,
      'Gas': 75
    };
    return amounts[categoryName] || 0;
  });

  const mockOnDeleteCategory = vi.fn();
  const mockOnUpdateCategoryColor = vi.fn();
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockGetSpentAmount.mockClear();
    mockOnDeleteCategory.mockClear();
    mockOnUpdateCategoryColor.mockClear();
    mockOnClick.mockClear();
  });

  it('should render all categories', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        allCategories={mockCategories}
        getSpentAmount={mockGetSpentAmount}
        onDeleteCategory={mockOnDeleteCategory}
        onUpdateCategoryColor={mockOnUpdateCategoryColor}
        onClick={mockOnClick}
        isDeleting={false}
        isUpdating={false}
      />
    );
    
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.getByText('Gas')).toBeInTheDocument();
  });

  it('should call getSpentAmount for each category', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        allCategories={mockCategories}
        getSpentAmount={mockGetSpentAmount}
        onDeleteCategory={mockOnDeleteCategory}
        onUpdateCategoryColor={mockOnUpdateCategoryColor}
        onClick={mockOnClick}
        isDeleting={false}
        isUpdating={false}
      />
    );
    
    expect(mockGetSpentAmount).toHaveBeenCalledWith('Groceries');
    expect(mockGetSpentAmount).toHaveBeenCalledWith('Transportation');
    expect(mockGetSpentAmount).toHaveBeenCalledWith('Gas');
  });

  it('should calculate subcategory count for parent categories', () => {
    render(
      <CategoryGrid
        categories={[mockCategories[1]]} // Transportation (parent category)
        allCategories={mockCategories}
        getSpentAmount={mockGetSpentAmount}
        onDeleteCategory={mockOnDeleteCategory}
        onUpdateCategoryColor={mockOnUpdateCategoryColor}
        onClick={mockOnClick}
        isDeleting={false}
        isUpdating={false}
      />
    );
    
    // Transportation should have 1 subcategory (Gas)
    expect(mockGetSpentAmount).toHaveBeenCalledWith('Transportation');
  });

  it('should handle empty categories array', () => {
    render(
      <CategoryGrid
        categories={[]}
        allCategories={[]}
        getSpentAmount={mockGetSpentAmount}
        onDeleteCategory={mockOnDeleteCategory}
        onUpdateCategoryColor={mockOnUpdateCategoryColor}
        onClick={mockOnClick}
        isDeleting={false}
        isUpdating={false}
      />
    );
    
    expect(mockGetSpentAmount).not.toHaveBeenCalled();
  });

  it('should pass correct props to CategoryCard components', () => {
    render(
      <CategoryGrid
        categories={[mockCategories[0]]}
        allCategories={mockCategories}
        getSpentAmount={mockGetSpentAmount}
        onDeleteCategory={mockOnDeleteCategory}
        onUpdateCategoryColor={mockOnUpdateCategoryColor}
        onClick={mockOnClick}
        isDeleting={true}
        isUpdating={true}
      />
    );
    
    expect(mockGetSpentAmount).toHaveBeenCalledWith('Groceries');
  });
});
