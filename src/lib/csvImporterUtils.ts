import { supabase } from '@/integrations/supabase/client';
import type { ImportBatchDetailInsert, ImportBatchDetailStatus } from '@/lib/validation';

export async function computeContentHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export async function uploadCsvToStorage(file: File, userId: string): Promise<{ path: string; bucket: string }> {
  const bucket = 'csv-imports';
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, bucket };
}

export async function createSignedUrlForImport(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('csv-imports').createSignedUrl(storagePath, 30);
  if (error || !data?.signedUrl) throw error ?? new Error('no url');
  return data.signedUrl;
}

export async function downloadCsvFromStorage(storagePath: string): Promise<Blob> {
  const url = await createSignedUrlForImport(storagePath);
  const res = await fetch(url);
  return await res.blob();
}

export function generateBatchDetails(
  rows: string[][],
  rowStatuses: Record<number, { status: ImportBatchDetailStatus; reason?: string; matchedTransactionId?: string }>,
  batchId: string
): ImportBatchDetailInsert[] {
  return rows.map((_, i) => ({
    import_batch_id: batchId,
    row_number: i + 1,
    original_data: Object.fromEntries(rows[i].map((v, j) => [j, v])),
    parsed_transaction: null,
    status: rowStatuses[i]?.status ?? 'pending',
    reason: rowStatuses[i]?.reason ?? null,
    matched_transaction_id: rowStatuses[i]?.matchedTransactionId ?? null,
  }));
}
