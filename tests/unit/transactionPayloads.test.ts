import { it, expect } from 'vitest';
import { buildTransferRows, buildRefundRow, buildReimbursementRow } from '@/lib/transactionPayloads';
import { effect } from '@/lib/transactionMath';

const UUID = /^[0-9a-f-]{36}$/;

it('transfer: source negative, dest positive, shared uuid pair id', () => {
  const [src, dst] = buildTransferRows({ sourceAccountId: 'c1', destAccountId: 'cc1', amount: 500, date: '2026-10-13', description: 'card pay', userId: 'u' });
  expect(src.amount).toBe(-500); expect(dst.amount).toBe(500);
  expect(src.account_id).toBe('c1'); expect(dst.account_id).toBe('cc1');
  expect(src.transfer_pair_id).toBe(dst.transfer_pair_id);
  expect(src.transfer_pair_id).toMatch(UUID);
  expect(src.transaction_type).toBe('transfer'); expect(src.type).toBe('expense');
  expect(src.category).toBe('Transfer');
  expect(effect(src) + effect(dst)).toBe(0);
});

it('rejects transfer to the same account', () => {
  expect(() => buildTransferRows({ sourceAccountId: 'c1', destAccountId: 'c1', amount: 5, date: '2026-10-13', description: 'x', userId: 'u' })).toThrow();
});

it('refund links to original + positive balance effect, no non-column keys', () => {
  const r = buildRefundRow({ originalId: 'e1', originalCategory: 'Food', accountId: 'c1', amount: 30, date: '2026-10-13', description: 'return', userId: 'u' });
  expect(r.transaction_type).toBe('refund');
  expect(r.linked_transaction_id).toBe('e1');
  expect(r.income_category).toBe('refund');
  expect(r.category).toBe('Food');
  expect(effect(r)).toBe(30);
  expect(r.type).toBe('income');
  expect(Object.keys(r)).not.toContain('balance_effect');
});

it('reimbursement sets expected date', () => {
  const r = buildReimbursementRow({ originalId: 'e1', originalCategory: 'Food', accountId: 'c1', amount: 200, date: '2026-10-13', description: 'repaid', expectedDate: '2026-10-15', userId: 'u' });
  expect(r.transaction_type).toBe('reimbursement');
  expect(r.reimbursement_expected_date).toBe('2026-10-15');
  expect(r.income_category).toBe('reimbursement');
});
