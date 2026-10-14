export const detectAccountColumn = (headers: string[] | null | undefined): number | null => {
  if (!headers || headers.length === 0) return null;
  const lower = headers.map((h) => h.toLowerCase().trim());
  const idx = lower.findIndex((h) => h === "account name" || h === "account" || h === "account_name" || h === "wallet" || h === "source" || h === "target");
  return idx >= 0 ? idx : null;
};

export const isTransferPayment = (amount: number, desc: string): boolean => {
  if (isNaN(amount)) return false;
  if (amount < 0) return true;
  const d = desc.toLowerCase();
  if (d.includes("payment") || d.includes("pymt") || d.includes("paid") || d.includes("pay off")) return true;
  return false;
};

export const isRefundDescription = (desc: string): boolean => {
  const d = desc.toLowerCase();
  return d.includes("refund") || d.includes("return") || d.includes("credit") || d.includes("reversed");
};

export const parseStatus = (str: string | undefined | null): "pending" | "posted" => {
  if (!str) return "posted";
  const s = str.toLowerCase().trim();
  if (s === "pending" || s === "hold" || s === "scheduled") return "pending";
  return "posted";
};

