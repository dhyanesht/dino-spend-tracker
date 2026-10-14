import { it, expect } from 'vitest';
import { buildTransferRows, buildRefundRow, buildReimbursementRow } from '@/lib/transactionPayloads';

it('transfer source negative dest positive shared pair', () => {
  const [src, dst] = buildTransferRows({ sourceAccountId:'c1', destAccountId:'cc1', amount:500, date:'2026-10-13', description:'pay', userId:'u' });
  expect(src.amount).toBe(-500); expect(dst.amount).toBe(500);
  expect(src.transfer_pair_id).toBe(dst.transfer_pair_id);
});
