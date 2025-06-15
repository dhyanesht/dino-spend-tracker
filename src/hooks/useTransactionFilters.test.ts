
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionFilters } from './useTransactionFilters';
import { Transaction } from './useTransactions';

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
    description: 'Salary Payment',
    amount: 3000.00,
    category: 'Income',
    date: '2024-06-01',
    type: 'income',
    created_at: '2024-06-01T10:00:00Z'
  },
  {
    id: '4',
    description: 'Restaurant Bill',
    amount: 25.00,
    category: 'Dining',
    date: '2024-05-15',
    type: 'expense',
    created_at: '2024-05-15T10:00:00Z'
  }
];

describe('useTransactionFilters', () => {
  it('should initialize with default filter values', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    expect(result.current.filters.category).toBe('all');
    expect(result.current.filters.type).toBe('all');
    expect(result.current.filters.term).toBe('');
    expect(result.current.filters.date).toBeUndefined();
    expect(result.current.filters.minAmount).toBe('');
    expect(result.current.filters.maxAmount).toBe('');
  });

  it('should return all transactions when no filters are applied', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    expect(result.current.filteredTransactions).toHaveLength(4);
  });

  it('should filter by category', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    act(() => {
      result.current.setters.setCategory('Groceries');
    });
    
    expect(result.current.filteredTransactions).toHaveLength(1);
    expect(result.current.filteredTransactions[0].category).toBe('Groceries');
  });

  it('should filter by type', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    act(() => {
      result.current.setters.setType('income');
    });
    
    expect(result.current.filteredTransactions).toHaveLength(1);
    expect(result.current.filteredTransactions[0].type).toBe('income');
  });

  it('should filter by search term', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    act(() => {
      result.current.setters.setTerm('grocery');
    });
    
    expect(result.current.filteredTransactions).toHaveLength(1);
    expect(result.current.filteredTransactions[0].description).toContain('Grocery');
  });

  it('should filter by minimum amount', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    act(() => {
      result.current.setters.setMinAmount('100');
    });
    
    expect(result.current.filteredTransactions).toHaveLength(1);
    expect(result.current.filteredTransactions[0].amount).toBeGreaterThanOrEqual(100);
  });

  it('should filter by maximum amount', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    act(() => {
      result.current.setters.setMaxAmount('50');
    });
    
    expect(result.current.filteredTransactions).toHaveLength(3);
    expect(result.current.filteredTransactions.every(t => t.amount <= 50)).toBe(true);
  });

  it('should reset all filters', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    act(() => {
      result.current.setters.setCategory('Groceries');
      result.current.setters.setType('expense');
      result.current.setters.setTerm('test');
      result.current.setters.setMinAmount('10');
      result.current.setters.setMaxAmount('100');
    });
    
    act(() => {
      result.current.handleResetFilters();
    });
    
    expect(result.current.filters.category).toBe('all');
    expect(result.current.filters.type).toBe('all');
    expect(result.current.filters.term).toBe('');
    expect(result.current.filters.date).toBeUndefined();
    expect(result.current.filters.minAmount).toBe('');
    expect(result.current.filters.maxAmount).toBe('');
    expect(result.current.filteredTransactions).toHaveLength(4);
  });

  it('should handle empty transactions array', () => {
    const { result } = renderHook(() => useTransactionFilters([]));
    
    expect(result.current.filteredTransactions).toHaveLength(0);
  });

  it('should combine multiple filters', () => {
    const { result } = renderHook(() => useTransactionFilters(mockTransactions));
    
    act(() => {
      result.current.setters.setType('expense');
      result.current.setters.setMinAmount('30');
    });
    
    expect(result.current.filteredTransactions).toHaveLength(2);
    expect(result.current.filteredTransactions.every(t => t.type === 'expense')).toBe(true);
    expect(result.current.filteredTransactions.every(t => t.amount >= 30)).toBe(true);
  });
});
