import { LEGACY_TYPE_BY_NEW } from './transactionMath';

interface Base { amount: number; date: string; description: string; userId: string; status?: 'pending' | 'posted' }
export interface TransferInput extends Base { sourceAccountId: string; destAccountId: string }
export interface RefundInput extends Base { originalId: string; originalCategory: string; accountId: string }
export interface ReimbursementInput extends RefundInput { expectedDate?: string | null }

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

/** Signed transfer pair (locked decision #1): source -amount, dest +amount, shared pair id. */
export const buildTransferRows = (i: TransferInput) => {
  if (i.sourceAccountId === i.destAccountId) throw new Error('Transfer source and destination must differ');
  const transfer_pair_id = uuid();
  const mag = Math.abs(i.amount);
  const common = {
    transaction_type: 'transfer' as const,
    type: LEGACY_TYPE_BY_NEW.transfer,
    category: 'Transfer',
    status: i.status ?? ('posted' as const),
    date: i.date,
    description: i.description,
    user_id: i.userId,
    transfer_pair_id,
    linked_transaction_id: null,
    income_category: null,
  };
  return [
    { ...common, amount: -mag, account_id: i.sourceAccountId },
    { ...common, amount: mag, account_id: i.destAccountId },
  ] as const;
};

const linkedRow = (kind: 'refund' | 'reimbursement', i: RefundInput) => ({
  transaction_type: kind,
  type: LEGACY_TYPE_BY_NEW[kind],
  income_category: kind,
  linked_transaction_id: i.originalId,
  transfer_pair_id: null,
  category: i.originalCategory,
  amount: Math.abs(i.amount),
  account_id: i.accountId,
  status: i.status ?? ('posted' as const),
  date: i.date,
  description: i.description,
  user_id: i.userId,
});

export const buildRefundRow = (i: RefundInput) => linkedRow('refund', i);
export const buildReimbursementRow = (i: ReimbursementInput) => ({
  ...linkedRow('reimbursement', i),
  reimbursement_expected_date: i.expectedDate ?? null,
});
