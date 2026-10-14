import { it, expect } from 'vitest';
import { transactionSchema, accountSchema } from '@/lib/validation';

const ACC = '00000000-0000-0000-0000-000000000000';
const base = { description: 'x', amount: 5, date: '2026-01-02', account_id: ACC };

it('requires category for expense', () => { expect(transactionSchema.safeParse({ ...base, transaction_type: 'expense' }).success).toBe(false); });
it('requires transfer_pair_id for transfer', () => { expect(transactionSchema.safeParse({ ...base, category: 'Food', transaction_type: 'transfer' }).success).toBe(false); });
it('requires linked_transaction_id for refund', () => { expect(transactionSchema.safeParse({ ...base, transaction_type: 'refund' }).success).toBe(false); });
it('requires income_category for income', () => { expect(transactionSchema.safeParse({ ...base, transaction_type: 'income' }).success).toBe(false); });
it('defaults type=expense, status=posted, transaction_type=expense', () => {
  const r = transactionSchema.parse({ ...base, category: 'Food' });
  expect(r.transaction_type).toBe('expense'); expect(r.status).toBe('posted'); expect(r.type).toBe('expense');
});
it('accepts a valid refund', () => {
  expect(transactionSchema.safeParse({ ...base, transaction_type: 'refund', linked_transaction_id: ACC, income_category: 'refund' }).success).toBe(true);
});
it('account schema defaults currency USD, is_active true', () => {
  const a = accountSchema.parse({ name: 'Checking', type: 'checking' });
  expect(a.currency).toBe('USD'); expect(a.is_active).toBe(true); expect(a.is_primary).toBe(false);
});
