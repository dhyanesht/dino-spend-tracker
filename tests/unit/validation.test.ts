import { it, expect } from 'vitest';
import { transactionSchema, accountSchema, accountTypeSchema } from '@/lib/validation';

it('account schema exists', () => {
  expect(typeof accountSchema).toBe('function');
});
