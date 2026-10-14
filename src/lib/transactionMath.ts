export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund' | 'reimbursement';
export type TxStatus = 'pending' | 'posted';

export interface MathTransaction {
  id?: string;
  account_id: string | null;
  amount: number;
  transaction_type: TransactionType;
  status: TxStatus;
  income_category: string | null;
  linked_transaction_id: string | null;
  transfer_pair_id: string | null;
}

export const isPosted = (t: MathTransaction) => t.status === 'posted';
export const isExpense = (t: MathTransaction) => isPosted(t) && t.transaction_type === 'expense';

export const effect = (t: MathTransaction): number => {
  if (!isPosted(t) || !t.account_id) return 0;
  switch (t.transaction_type) {
    case 'expense': return -t.amount;
    case 'income': case 'refund': case 'reimbursement': return t.amount;
    case 'transfer': return t.amount;
    default: return 0;
  }
};
