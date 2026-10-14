import { it, expect } from 'vitest';
import { setPrimaryPayload } from '@/lib/accountOps';

it('setPrimaryPayload returns id', () => {
  expect(setPrimaryPayload('acc-1')).toBe('acc-1');
});
