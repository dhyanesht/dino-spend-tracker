import { it, expect } from 'vitest';
import { sumExpenses } from '@/lib/transactionMath';

it('transfer excluded from expenses despite legacy type=expense', () => {
  const txns = [
    { transaction_type:'expense', status:'posted', type:'expense', amount:100, account_id:'a1', income_category:null, linked_transaction_id:null, transfer_pair_id:null, category:'Food', date:'2026-01-01', description:'x', id:'1' },
    { transaction_type:'transfer', status:'posted', type:'expense', amount:500, account_id:'a1', income_category:null, linked_transaction_id:null, transfer_pair_id:'p1', category:'Transfer', date:'2026-01-01', description:'y', id:'2' },
  ];
  expect(sumExpenses(txns)).toBe(100);
});
