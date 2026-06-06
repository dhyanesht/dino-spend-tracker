import { extractStoreName } from '@/hooks/useStores';

export type DedupStatus = 'new' | 'duplicate' | 'ambiguous';

export interface ExistingTxn {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
}

export interface IncomingTxn {
  description: string;
  amount: number;
  date: string;
}

export interface ClassifiedTxn<T extends IncomingTxn> {
  txn: T;
  status: DedupStatus;
  match?: ExistingTxn;
  reason?: string;
}

const normalize = (desc: string): string => extractStoreName(desc || '').toUpperCase();

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m: number[][] = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
};

const similarity = (a: string, b: string): number => {
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - levenshtein(a, b) / max;
};

const daysBetween = (a: string, b: string): number => {
  const diff = new Date(a).getTime() - new Date(b).getTime();
  return Math.abs(diff) / (1000 * 60 * 60 * 24);
};

export interface DedupOptions {
  dateWindowDays?: number;
  similarityThreshold?: number;
}

/**
 * Classifies incoming transactions against existing ones using:
 * 1. Occurrence-counting bucket match on (date, amount, normalized_store) — handles legitimate twins.
 * 2. Fuzzy fallback within ±N days, same amount, normalized desc similarity ≥ threshold.
 *
 * Incoming rows are processed in order. Each existing row can only "absorb" one incoming row.
 */
export const classifyIncoming = <T extends IncomingTxn>(
  incoming: T[],
  existing: ExistingTxn[],
  opts: DedupOptions = {}
): ClassifiedTxn<T>[] => {
  const dateWindow = opts.dateWindowDays ?? 3;
  const simThreshold = opts.similarityThreshold ?? 0.85;

  // Pre-compute normalized form for existing rows. Track which have been "claimed".
  const existingMeta = existing.map((e) => ({
    row: e,
    norm: normalize(e.description),
    claimed: false,
  }));

  // Build a bucket index for exact (date|amount|norm) matches.
  const bucket = new Map<string, number[]>(); // key -> indices into existingMeta
  existingMeta.forEach((meta, idx) => {
    const key = `${meta.row.date}|${meta.row.amount.toFixed(2)}|${meta.norm}`;
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key)!.push(idx);
  });

  const results: ClassifiedTxn<T>[] = [];

  for (const txn of incoming) {
    const norm = normalize(txn.description);
    const key = `${txn.date}|${txn.amount.toFixed(2)}|${norm}`;

    // 1. Exact bucket match
    const bucketIdxs = bucket.get(key);
    let matched: { idx: number; status: DedupStatus; reason: string } | null = null;

    if (bucketIdxs) {
      const free = bucketIdxs.find((i) => !existingMeta[i].claimed);
      if (free !== undefined) {
        matched = { idx: free, status: 'duplicate', reason: 'Exact match (date, amount, merchant)' };
      }
    }

    // 2. Fuzzy fallback: same amount, within date window, similar normalized desc
    if (!matched) {
      let bestIdx = -1;
      let bestSim = 0;
      existingMeta.forEach((meta, idx) => {
        if (meta.claimed) return;
        if (meta.row.amount.toFixed(2) !== txn.amount.toFixed(2)) return;
        if (daysBetween(meta.row.date, txn.date) > dateWindow) return;
        const sim = similarity(norm, meta.norm);
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = idx;
        }
      });

      if (bestIdx >= 0 && bestSim >= simThreshold) {
        matched = {
          idx: bestIdx,
          status: 'ambiguous',
          reason: `Likely duplicate (${Math.round(bestSim * 100)}% match, within ${dateWindow} days)`,
        };
      }
    }

    if (matched) {
      existingMeta[matched.idx].claimed = true;
      results.push({
        txn,
        status: matched.status,
        match: existingMeta[matched.idx].row,
        reason: matched.reason,
      });
    } else {
      results.push({ txn, status: 'new' });
    }
  }

  return results;
};
