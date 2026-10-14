import type { MathTransaction } from "./transactionMath";

export interface FilterSpec {
  account?: string;
  type?: string;
  status?: string;
  includePending?: boolean;
  term?: string;
  date?: string;
  minAmount?: number;
  maxAmount?: number;
}

export const filterTransactions = (
  txns: (MathTransaction & { category?: string; date?: string; description?: string; type?: string; id?: string })[],
  filters: FilterSpec = {}
): typeof txns => {
  const { account, type, status, includePending = false, term, date, minAmount, maxAmount } = filters;

  return txns.filter((t) => {
    if (!includePending && t.status === "pending") {
      return false;
    }
    if (status && t.status !== status) {
      return false;
    }
    if (account && t.account_id !== account) {
      return false;
    }
    if (type && t.transaction_type !== type) {
      return false;
    }
    if (minAmount !== undefined && t.amount < minAmount) {
      return false;
    }
    if (maxAmount !== undefined && t.amount > maxAmount) {
      return false;
    }
    if (date && t.date !== date) {
      return false;
    }
    if (term) {
      const hay = `${t.description ?? ""} ${t.category ?? ""}`.toLowerCase();
      if (!hay.includes(term.toLowerCase())) {
        return false;
      }
    }
    return true;
  });
};

