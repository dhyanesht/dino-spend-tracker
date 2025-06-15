
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrendsInsights from './TrendsInsights';

describe('TrendsInsights', () => {
  it('should render spending down card when spending decreased', () => {
    render(
      <TrendsInsights
        currentSpending={100}
        spendingChange={-10}
        totalTransactions={50}
      />
    );
    
    expect(screen.getByText('Spending Down')).toBeInTheDocument();
    expect(screen.getByText('10.0% decrease from last month')).toBeInTheDocument();
  });

  it('should render spending up card when spending increased', () => {
    render(
      <TrendsInsights
        currentSpending={150}
        spendingChange={20}
        totalTransactions={75}
      />
    );
    
    expect(screen.getByText('Spending Up')).toBeInTheDocument();
    expect(screen.getByText('20.0% increase from last month')).toBeInTheDocument();
  });

  it('should display current month spending', () => {
    render(
      <TrendsInsights
        currentSpending={250.50}
        spendingChange={5}
        totalTransactions={30}
      />
    );
    
    expect(screen.getByText('$250.50 spent so far')).toBeInTheDocument();
  });

  it('should display total transactions count', () => {
    render(
      <TrendsInsights
        currentSpending={100}
        spendingChange={0}
        totalTransactions={42}
      />
    );
    
    expect(screen.getByText('42 transactions recorded')).toBeInTheDocument();
  });

  it('should handle zero spending change', () => {
    render(
      <TrendsInsights
        currentSpending={100}
        spendingChange={0}
        totalTransactions={10}
      />
    );
    
    expect(screen.getByText('Spending Up')).toBeInTheDocument();
    expect(screen.getByText('0.0% increase from last month')).toBeInTheDocument();
  });
});
