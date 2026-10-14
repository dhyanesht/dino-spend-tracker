import { it, expect } from 'vitest';
import { setPrimaryMutations, pickDefaultAccount } from '@/lib/accountOps';

it('setPrimaryMutations unsets the others first, then sets the chosen one', () => {
  const [unset, set] = setPrimaryMutations('u1', 'acc-2');
  expect(unset).toEqual({ match: { user_id: 'u1', is_primary: true }, values: { is_primary: false } });
  expect(set).toEqual({ match: { id: 'acc-2' }, values: { is_primary: true } });
});

it('pickDefaultAccount prefers active primary, then first active checking, then first active', () => {
  const a = (o: object) => ({ id: 'x', type: 'savings', is_active: true, is_primary: false, ...o });
  expect(pickDefaultAccount([a({ id: '1' }), a({ id: '2', is_primary: true })])?.id).toBe('2');
  expect(pickDefaultAccount([a({ id: '1' }), a({ id: '2', type: 'checking' })])?.id).toBe('2');
  expect(pickDefaultAccount([a({ id: '1', is_active: false, is_primary: true }), a({ id: '3' })])?.id).toBe('3');
  expect(pickDefaultAccount([])).toBeNull();
});
