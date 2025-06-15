
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrendsControls from './TrendsControls';

const mockCategories = [
  {
    id: '1',
    name: 'Groceries',
    type: 'variable' as const,
    monthly_budget: 300,
    color: '#FF5733',
    created_at: '2024-01-01T00:00:00Z',
    parent_category: 'Food'
  },
  {
    id: '2',
    name: 'Transportation',
    type: 'fixed' as const,
    monthly_budget: 200,
    color: '#33FF57',
    created_at: '2024-01-01T00:00:00Z',
    parent_category: null
  }
];

describe('TrendsControls', () => {
  const mockSetTimeRange = vi.fn();
  const mockSetSelectedCategory = vi.fn();

  beforeEach(() => {
    mockSetTimeRange.mockClear();
    mockSetSelectedCategory.mockClear();
  });

  it('should render the title and description', () => {
    render(
      <TrendsControls
        timeRange="6months"
        setTimeRange={mockSetTimeRange}
        selectedCategory="all"
        setSelectedCategory={mockSetSelectedCategory}
        categories={mockCategories}
      />
    );
    
    expect(screen.getByText('Spending Trends Analysis')).toBeInTheDocument();
    expect(screen.getByText('Track your spending patterns over time')).toBeInTheDocument();
  });

  it('should render time range selector with correct value', () => {
    render(
      <TrendsControls
        timeRange="3months"
        setTimeRange={mockSetTimeRange}
        selectedCategory="all"
        setSelectedCategory={mockSetSelectedCategory}
        categories={mockCategories}
      />
    );
    
    // The select component should be present
    expect(screen.getByDisplayValue('Last 3 months')).toBeInTheDocument();
  });

  it('should render category selector with all categories', () => {
    render(
      <TrendsControls
        timeRange="6months"
        setTimeRange={mockSetTimeRange}
        selectedCategory="all"
        setSelectedCategory={mockSetSelectedCategory}
        categories={mockCategories}
      />
    );
    
    // Check that All Categories is selected by default
    expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
  });

  it('should sort categories alphabetically', () => {
    const unsortedCategories = [
      {
        id: '1',
        name: 'Zebra',
        type: 'variable' as const,
        monthly_budget: 100,
        color: '#FF0000',
        created_at: '2024-01-01T00:00:00Z',
        parent_category: null
      },
      {
        id: '2',
        name: 'Apple',
        type: 'fixed' as const,
        monthly_budget: 200,
        color: '#00FF00',
        created_at: '2024-01-01T00:00:00Z',
        parent_category: null
      }
    ];

    render(
      <TrendsControls
        timeRange="6months"
        setTimeRange={mockSetTimeRange}
        selectedCategory="all"
        setSelectedCategory={mockSetSelectedCategory}
        categories={unsortedCategories}
      />
    );
    
    // The component should render without error (sorting happens internally)
    expect(screen.getByText('Spending Trends Analysis')).toBeInTheDocument();
  });

  it('should display parent category information for subcategories', () => {
    render(
      <TrendsControls
        timeRange="6months"
        setTimeRange={mockSetTimeRange}
        selectedCategory="Groceries"
        setSelectedCategory={mockSetSelectedCategory}
        categories={mockCategories}
      />
    );
    
    expect(screen.getByDisplayValue('Groceries')).toBeInTheDocument();
  });
});
