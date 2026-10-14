export const detectAccountColumn = (headers: string[]) => headers.indexOf('Account Name') >= 0 ? headers.indexOf('Account Name') : null;
export const isTransferPayment = (amount: number, desc: string) => amount < 0 || /PAYMENT|PYMT/i.test(desc);
export const isRefundDescription = (desc: string) => /RETURN|REFUND/i.test(desc);
export const parseStatus = (s: string) => s === 'pending' ? 'pending' : 'posted';
