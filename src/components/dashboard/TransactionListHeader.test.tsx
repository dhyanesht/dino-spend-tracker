import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionListHeader from './TransactionListHeader';

describe('TransactionListHeader', () => {
  const mockOnDeleteSelected = vi.fn();

  beforeEach(() => {
    mockOnDeleteSelected.mockClear();
  });

  it('should display transaction count when no transactions are selected', () => {
    render(
      <TransactionListHeader
        selectedCount={0}
        filteredCount={25}
        totalCount={100}
        onDeleteSelected={mockOnDeleteSelected}
        isDeletePending={false}
        isAdmin={true}
      />
    );
    
    expect(screen.getByText('All Transactions')).toBeInTheDocument();
    expect(screen.getByText('Showing 25 of 100 transactions')).toBeInTheDocument();
  });

  it('should display selected count when transactions are selected', () => {
    render(
      <TransactionListHeader
        selectedCount={5}
        filteredCount={25}
        totalCount={100}
        onDeleteSelected={mockOnDeleteSelected}
        isDeletePending={false}
        isAdmin={true}
      />
    );
    
    expect(screen.getByText('5 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('should call onDeleteSelected when delete button is clicked', () => {
    render(
      <TransactionListHeader
        selectedCount={3}
        filteredCount={25}
        totalCount={100}
        onDeleteSelected={mockOnDeleteSelected}
        isDeletePending={false}
        isAdmin={true}
      />
    );
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    
    expect(mockOnDeleteSelected).toHaveBeenCalledTimes(1);
  });

  it('should disable delete button when isDeletePending is true', () => {
    render(
      <TransactionListHeader
        selectedCount={2}
        filteredCount={25}
        totalCount={100}
        onDeleteSelected={mockOnDeleteSelected}
        isDeletePending={true}
        isAdmin={true}
      />
    );
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();
  });

  it('should disable delete button when user is not admin', () => {
    render(
      <TransactionListHeader
        selectedCount={2}
        filteredCount={25}
        totalCount={100}
        onDeleteSelected={mockOnDeleteSelected}
        isDeletePending={false}
        isAdmin={false}
      />
    );
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute('title', 'Unlock edit mode to delete transactions');
  });
});
