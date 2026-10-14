import { it, expect } from 'vitest';
import { filterTransactions } from '@/lib/transactionFilters';

it('excludes pending by default', () => {
  const t = (o: any) => ({ account_id:'a1', amount:10, transaction_type:'expense', status:'posted', income_category:null, linked_transaction_id:null, transfer_pair_id:null, category:'Food', date:'2026-01-01', description:'x', type:'expense', id:'1', ...o });
  expect(filterTransactions([t({status:'pending'}), t({id:'2'})], {}).length).toBe(1);
});
