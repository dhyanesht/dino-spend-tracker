export interface AccountLike {
  id: string;
  type?: string;
  is_active?: boolean;
  is_primary?: boolean;
  [k: string]: unknown;
}

export const setPrimaryMutations = (userId: string, id: string) => [
  { match: { user_id: userId, is_primary: true }, values: { is_primary: false } },
  { match: { id }, values: { is_primary: true } },
];

export const pickDefaultAccount = (accounts: AccountLike[] = []): AccountLike | null => {
  const active = accounts.filter((a) => a.is_active !== false);
  if (active.length === 0) return null;
  const primary = active.find((a) => a.is_primary);
  if (primary) return primary;
  const checking = active.find((a) => a.type === "checking");
  if (checking) return checking;
  return active[0];
};

