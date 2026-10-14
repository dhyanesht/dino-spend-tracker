export const filterTransactions = (txns: any[], filters: any={}) => {
  let res = txns;
  if (!filters.includePending) res = res.filter((t:any) => t.status === 'posted');
  if (filters.account) res = res.filter((t:any) => t.account_id === filters.account);
  if (filters.type) res = res.filter((t:any) => t.transaction_type === filters.type);
  return res;
};
