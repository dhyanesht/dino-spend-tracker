import { describe, it, expect } from 'vitest';
import { effect, isExpense } from '@/lib/transactionMath';

describe('balance effect', () => {
  it('expense reduces account', () => {
    expect(effect({ account_id: 'a1', amount: 100, transaction_type: 'expense', status: 'posted', income_category: null, linked_transaction_id: null, transfer_pair_id: null })).toBe(-100);
  });
});
