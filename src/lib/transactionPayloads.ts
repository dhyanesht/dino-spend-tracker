export const buildTransferRows = (input: any) => {
  const pair = 'pair-' + Math.random();
  return [
    { ...input, transaction_type: 'transfer', amount: -input.amount, account_id: input.sourceAccountId, transfer_pair_id: pair, type: 'expense', status: 'posted', user_id: input.userId },
    { ...input, transaction_type: 'transfer', amount: input.amount, account_id: input.destAccountId, transfer_pair_id: pair, type: 'expense', status: 'posted', user_id: input.userId },
  ];
};
export const buildRefundRow = (input: any) => ({ transaction_type: 'refund', linked_transaction_id: input.originalId, income_category: 'refund', balance_effect: input.amount, type: 'income', status: 'posted', amount: input.amount, account_id: input.accountId, category: input.originalCategory, date: input.date, description: input.description, user_id: input.userId });
export const buildReimbursementRow = (input: any) => ({ transaction_type: 'reimbursement', income_category: 'reimbursement', linked_transaction_id: input.originalId, reimbursement_expected_date: input.expectedDate, balance_effect: input.amount, type: 'income', status: 'posted', amount: input.amount, account_id: input.accountId, category: input.originalCategory, date: input.date, description: input.description, user_id: input.userId });
