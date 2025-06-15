
import { describe, it, expect } from 'vitest';
import {
  getMonthlyTrends,
  getCategoryComparisonData,
  getYearOverYearData,
  calculateSpendingInsights,
  Transaction,
  Category
} from './trendsDataUtils';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    description: 'Grocery Store',
    amount: 50.00,
    category: 'Groceries',
    date: '2024-06-01',
    type: 'expense',
    created_at: '2024-06-01T10:00:00Z'
  },
  {
    id: '2',
    description: 'Gas Station',
    amount: 40.00,
    category: 'Transportation',
    date: '2024-06-15',
    type: 'expense',
    created_at: '2024-06-15T10:00:00Z'
  },
  {
    id: '3',
    description: 'Salary',
    amount: 3000.00,
    category: 'Income',
    date: '2024-05-01',
    type: 'income',
    created_at: '2024-05-01T10:00:00Z'
  },
  {
    id: '4',
    description: 'Restaurant',
    amount: 25.00,
    category: 'Dining',
    date: '2023-06-01',
    type: 'expense',
    created_at: '2023-06-01T10:00:00Z'
  }
];

const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Groceries',
    type: 'variable',
    color: '#FF5733',
    created_at: '2024-01-01T00:00:00Z',
    parent_category: 'Food',
    monthly_budget: 300
  },
  {
    id: '2',
    name: 'Transportation',
    type: 'variable',
    color: '#33FF57',
    created_at: '2024-01-01T00:00:00Z',
    parent_category: null,
    monthly_budget: 200
  },
  {
    id: '3',
    name: 'Dining',
    type: 'variable',
    color: '#3357FF',
    created_at: '2024-01-01T00:00:00Z',
    parent_category: 'Food',
    monthly_budget: 150
  }
];

describe('getMonthlyTrends', () => {
  it('should return monthly trends for 6 months by default', () => {
    const result = getMonthlyTrends(mockTransactions, '6months');
    expect(result).toHaveLength(6);
    expect(result[0]).toHaveProperty('month');
    expect(result[0]).toHaveProperty('total');
  });

  it('should return monthly trends for 3 months', () => {
    const result = getMonthlyTrends(mockTransactions, '3months');
    expect(result).toHaveLength(3);
  });

  it('should return monthly trends for 1 year', () => {
    const result = getMonthlyTrends(mockTransactions, '1year');
    expect(result).toHaveLength(12);
  });

  it('should calculate correct totals for each month', () => {
    const result = getMonthlyTrends(mockTransactions, '6months');
    const currentMonth = result.find(month => month.total > 0);
    expect(currentMonth?.total).toBeGreaterThan(0);
  });

  it('should handle empty transactions array', () => {
    const result = getMonthlyTrends([], '6months');
    expect(result).toHaveLength(6);
    expect(result.every(month => month.total === 0)).toBe(true);
  });
});

describe('getCategoryComparisonData', () => {
  it('should return empty data when selectedCategory is not "all"', () => {
    const result = getCategoryComparisonData(mockTransactions, mockCategories, '6months', 'Groceries');
    expect(result.data).toHaveLength(0);
    expect(result.topCategories).toHaveLength(0);
  });

  it('should return category comparison data for all categories', () => {
    const result = getCategoryComparisonData(mockTransactions, mockCategories, '6months', 'all');
    expect(result.data).toHaveLength(6);
    expect(result.topCategories).toHaveLength(3);
  });

  it('should sort categories by total spending', () => {
    const result = getCategoryComparisonData(mockTransactions, mockCategories, '6months', 'all');
    const topCategories = result.topCategories;
    for (let i = 0; i < topCategories.length - 1; i++) {
      expect(topCategories[i].total).toBeGreaterThanOrEqual(topCategories[i + 1].total);
    }
  });

  it('should handle empty transactions', () => {
    const result = getCategoryComparisonData([], mockCategories, '6months', 'all');
    expect(result.data).toHaveLength(6);
    expect(result.topCategories.every(cat => cat.total === 0)).toBe(true);
  });
});

describe('getYearOverYearData', () => {
  it('should return 12 months of data', () => {
    const result = getYearOverYearData(mockTransactions);
    expect(result).toHaveLength(12);
  });

  it('should include both current and last year data', () => {
    const result = getYearOverYearData(mockTransactions);
    expect(result[0]).toHaveProperty('This Year');
    expect(result[0]).toHaveProperty('Last Year');
  });

  it('should handle empty transactions', () => {
    const result = getYearOverYearData([]);
    expect(result).toHaveLength(12);
    expect(result.every(month => month['This Year'] === 0 && month['Last Year'] === 0)).toBe(true);
  });

  it('should correctly categorize transactions by year', () => {
    const result = getYearOverYearData(mockTransactions);
    const hasCurrentYearData = result.some(month => month['This Year'] > 0);
    const hasLastYearData = result.some(month => month['Last Year'] > 0);
    expect(hasCurrentYearData || hasLastYearData).toBe(true);
  });
});

describe('calculateSpendingInsights', () => {
  it('should calculate current and previous month spending', () => {
    const result = calculateSpendingInsights(mockTransactions);
    expect(result).toHaveProperty('currentSpending');
    expect(result).toHaveProperty('previousSpending');
    expect(result).toHaveProperty('spendingChange');
  });

  it('should calculate spending change percentage', () => {
    const result = calculateSpendingInsights(mockTransactions);
    expect(typeof result.spendingChange).toBe('number');
  });

  it('should handle zero previous spending', () => {
    const currentMonthTransaction: Transaction[] = [{
      id: '1',
      description: 'Test',
      amount: 100,
      category: 'Test',
      date: new Date().toISOString().slice(0, 10),
      type: 'expense',
      created_at: new Date().toISOString()
    }];
    
    const result = calculateSpendingInsights(currentMonthTransaction);
    expect(result.spendingChange).toBe(0);
  });

  it('should handle empty transactions', () => {
    const result = calculateSpendingInsights([]);
    expect(result.currentSpending).toBe(0);
    expect(result.previousSpending).toBe(0);
    expect(result.spendingChange).toBe(0);
  });
});
