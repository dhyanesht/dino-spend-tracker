import { describe, it, expect } from 'vitest';
import { effect, isExpense, isTrueIncome, netCashFlow, sumExpenses, sumRefunds, wouldExceedOriginal, LEGACY_TYPE_BY_NEW, type MathTransaction } from '@/lib/transactionMath';

const exp = (t: Partial<MathTransaction>): MathTransaction => ({ account_id: 'a1', amount: 100, transaction_type: 'expense', status: 'posted', income_category: null, linked_transaction_id: null, transfer_pair_id: null, ...t });

describe('isExpense excludes transfers/refunds/reimbursements/pending', () => {
  it('excludes a posted transfer', () => {
    expect(isExpense(exp({ transaction_type: 'transfer', amount: -500, transfer_pair_id: 'p1' }))).toBe(false);
  });
  it('excludes a pending expense', () => { expect(isExpense(exp({ status: 'pending' }))).toBe(false); });
  it('includes a posted expense', () => { expect(isExpense(exp({}))).toBe(true); });
});

describe('true income', () => {
  it('accepts salary', () => { expect(isTrueIncome(exp({ transaction_type: 'income', income_category: 'salary' }))).toBe(true); });
  it('rejects refund/reimbursement income_category', () => { expect(isTrueIncome(exp({ transaction_type: 'income', income_category: 'refund' }))).toBe(false); });
});

describe('net cash flow & double-count guard (spec §9.2)', () => {
  it('100 expense + 30 refund => expenses 100, refunds 30, net -70', () => {
    const txns = [exp({ amount: 100 }), exp({ transaction_type: 'refund', linked_transaction_id: 'e1', income_category: 'refund', amount: 30 })];
    expect(sumExpenses(txns)).toBe(100);
    expect(sumRefunds(txns)).toBe(30);
    expect(netCashFlow(txns)).toBe(-70);
  });
  it('transfer pair nets to zero and is excluded (spec §9.1)', () => {
    const txns = [
      exp({ transaction_type: 'transfer', amount: -500, account_id: 'checking', transfer_pair_id: 'p1' }),
      exp({ transaction_type: 'transfer', amount: 500, account_id: 'cc', transfer_pair_id: 'p1' }),
    ];
    expect(sumExpenses(txns)).toBe(0);
    expect(netCashFlow(txns)).toBe(0);
  });
});

describe('balance effect mirror of trigger', () => {
  it('source transfer -500, dest +500', () => {
    expect(effect(exp({ transaction_type: 'transfer', amount: -500, account_id: 'checking' }))).toBe(-500);
    expect(effect(exp({ transaction_type: 'transfer', amount: 500, account_id: 'cc' }))).toBe(500);
  });
  it('expense reduces account', () => { expect(effect(exp({}))).toBe(-100); });
  it('pending is a no-op', () => { expect(effect(exp({ status: 'pending' }))).toBe(0); });
  it('null account is a no-op', () => { expect(effect(exp({ account_id: null }))).toBe(0); });
});

describe('refund over-original guard (spec §9.3)', () => {
  it('allows 50+40 of 120, rejects a further 50', () => {
    const existing = [exp({ transaction_type: 'refund', amount: 50 }), exp({ transaction_type: 'refund', amount: 40 })];
    expect(wouldExceedOriginal(120, existing, 0)).toBe(false);
    expect(wouldExceedOriginal(120, existing, 50)).toBe(true);
  });
});

describe('legacy type mapping (decision #2)', () => {
  it('maps per spec §8.1', () => {
    expect(LEGACY_TYPE_BY_NEW.transfer).toBe('expense');
    expect(LEGACY_TYPE_BY_NEW.refund).toBe('income');
    expect(LEGACY_TYPE_BY_NEW.reimbursement).toBe('income');
  });
});
