import { isRefund } from "./transactionMath";

export const refundedByOriginal = (txns: any[]) =>
  txns
    .filter(isRefund)
    .reduce((m: Record<string, number>, t: any) => {
      const key = t.linked_transaction_id;
      if (!key) return m;
      m[key] = (m[key] || 0) + t.amount;
      return m;
    }, {});

