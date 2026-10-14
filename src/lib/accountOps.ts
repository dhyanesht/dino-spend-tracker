export interface AccountLike { id: string; type: string; is_active: boolean; is_primary: boolean }

export interface UpdateOp { match: Record<string, string | boolean>; values: Record<string, boolean> }

/** Two ordered updates: unset current primary (unique partial index), then set the chosen one. */
export const setPrimaryMutations = (userId: string, accountId: string): [UpdateOp, UpdateOp] => [
  { match: { user_id: userId, is_primary: true }, values: { is_primary: false } },
  { match: { id: accountId }, values: { is_primary: true } },
];

export const pickDefaultAccount = <T extends AccountLike>(accounts: T[]): T | null => {
  const active = accounts.filter((a) => a.is_active);
  return active.find((a) => a.is_primary) ?? active.find((a) => a.type === 'checking') ?? active[0] ?? null;
};
