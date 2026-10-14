import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountSelectorView } from '@/components/dashboard/AccountSelector';

it('renders the selected account and hides inactive/excluded ones from options', () => {
  const accts = [
    { id: '1', name: 'Checking', type: 'checking' as const, balance: 0, is_active: true, is_primary: true },
    { id: '2', name: 'Old Card', type: 'credit_card' as const, balance: 0, is_active: false, is_primary: false },
  ];
  render(<AccountSelectorView value="1" onChange={vi.fn()} accounts={accts} />);
  expect(screen.getByRole('combobox')).toHaveTextContent('Checking');
  expect(screen.queryByText('Old Card')).toBeNull();
});
