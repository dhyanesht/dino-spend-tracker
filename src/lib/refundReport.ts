import { isRefund } from "./transactionMath";
import type { MathTransaction } from "./transactionMath";

export const refundedByOriginal = (txns: MathTransaction[]) =>
  txns
    .filter(isRefund)
    .reduce((m: Record<string, number>, t) => {
      const key = t.linked_transaction_id;
      if (!key) return m;
      m[key] = (m[key] || 0) + t.amount;
      return m;
    }, {});

