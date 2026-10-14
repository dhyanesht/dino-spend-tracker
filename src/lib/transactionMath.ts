// Canonical mirror of the DB balance trigger + report predicates.
// Keep `effect` identical to public.transaction_balance_effect().
export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund' | 'reimbursement';
export type TxStatus = 'pending' | 'posted';
export type IncomeCategory = 'salary' | 'interest' | 'dividends' | 'refund' | 'reimbursement' | 'other';

export const TRANSACTION_TYPES: readonly TransactionType[] = ['expense', 'income', 'transfer', 'refund', 'reimbursement'];
export const TRUE_INCOME_CATEGORIES: readonly IncomeCategory[] = ['salary', 'interest', 'dividends', 'other'];
export const LEGACY_TYPE_BY_NEW: Record<TransactionType, 'expense' | 'income'> = {
  expense: 'expense', income: 'income', transfer: 'expense', refund: 'income', reimbursement: 'income',
};

export interface MathTransaction {
  id?: string;
  account_id: string | null;
  amount: number;
  transaction_type: TransactionType;
  status: TxStatus;
  income_category: IncomeCategory | string | null;
  linked_transaction_id: string | null;
  transfer_pair_id: string | null;
}

type MathLike = Pick<MathTransaction, 'transaction_type' | 'status'> & Partial<MathTransaction> & { amount: number | string };

const amt = (t: { amount: number | string }) => Number(t.amount);

export const isPosted = (t: Pick<MathTransaction, 'status'>) => t.status === 'posted';
export const isExpense = (t: MathLike) => isPosted(t) && t.transaction_type === 'expense';
export const isTrueIncome = (t: MathLike) =>
  isPosted(t) && t.transaction_type === 'income' &&
  t.income_category != null && (TRUE_INCOME_CATEGORIES as readonly string[]).includes(t.income_category);
export const isRefund = (t: MathLike) => isPosted(t) && t.transaction_type === 'refund';
export const isReimbursement = (t: MathLike) => isPosted(t) && t.transaction_type === 'reimbursement';

export const effect = (t: MathLike): number => {
  if (!isPosted(t) || !t.account_id) return 0;
  switch (t.transaction_type) {
    case 'expense': return -amt(t);
    case 'income': case 'refund': case 'reimbursement': return amt(t);
    case 'transfer': return amt(t); // signed at insert (source -, dest +)
    default: return 0;
  }
};

const sumBy = (pred: (t: MathLike) => boolean) => (txns: MathLike[]) =>
  txns.filter(pred).reduce((s, t) => s + amt(t), 0);

export const sumExpenses = sumBy(isExpense);
export const sumTrueIncome = sumBy(isTrueIncome);
export const sumRefunds = sumBy(isRefund);
export const sumReimbursements = sumBy(isReimbursement);
export const netCashFlow = (txns: MathLike[]) =>
  sumTrueIncome(txns) - sumExpenses(txns) + sumRefunds(txns) + sumReimbursements(txns);

/** Treat pending rows as posted (client-side "include pending" recompute). */
export const withPendingAsPosted = <T extends MathLike>(txns: T[]): T[] =>
  txns.map((t) => (t.status === 'pending' ? { ...t, status: 'posted' as const } : t));

// Refund-over-original guard (spec §9.3) — mirrors validate_transaction_integrity()
export const wouldExceedOriginal = (originalAmount: number, existing: MathLike[], incoming: number) =>
  existing.filter((t) => isRefund(t) || isReimbursement(t)).reduce((s, t) => s + amt(t), 0) + incoming > originalAmount;
