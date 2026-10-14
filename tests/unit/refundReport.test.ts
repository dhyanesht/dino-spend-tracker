import { it, expect } from 'vitest';
import { isRefund } from '@/lib/transactionMath';

it('groups refunds by original', () => {
  const txns = [
    { account_id:'a1', amount:30, transaction_type:'refund', status:'posted', income_category:'refund', linked_transaction_id:'e1', transfer_pair_id:null, category:'Food', date:'2026-01-01', description:'r', id:'r1' },
    { account_id:'a1', amount:20, transaction_type:'refund', status:'posted', income_category:'refund', linked_transaction_id:'e1', transfer_pair_id:null, category:'Food', date:'2026-01-01', description:'r', id:'r2' },
  ];
  const grouped = txns.filter(isRefund).reduce((m: any, t: any) => { (m[t.linked_transaction_id] = m[t.linked_transaction_id]||0); m[t.linked_transaction_id]+=t.amount; return m; }, {});
  expect(grouped).toEqual({ e1: 50 });
});
