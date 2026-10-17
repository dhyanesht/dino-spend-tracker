-- import schema (merged with review)
CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  content_hash TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'csv-imports',
  storage_path TEXT NOT NULL,
  import_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_rows INTEGER NOT NULL,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  parsed_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  ambiguous_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','partial','failed')),
  is_undone BOOLEAN NOT NULL DEFAULT false,
  undone_at TIMESTAMPTZ,
  undo_actor UUID,
  undo_transaction_ids UUID[],
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.import_batch_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE RESTRICT,
  row_number INTEGER NOT NULL,
  original_data JSONB NOT NULL,
  parsed_transaction JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending','imported','skipped','duplicate','ambiguous','invalid','failed')),
  reason TEXT,
  error_code TEXT,
  matched_transaction_id UUID,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (import_batch_id, row_number)
);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_transactions_import_batch ON public.transactions(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_user ON public.import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_ts ON public.import_batches(import_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_import_batch_details_batch ON public.import_batch_details(import_batch_id);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batch_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY ib_select ON public.import_batches FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY ib_insert ON public.import_batches FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY ib_update ON public.import_batches FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE POLICY ibd_select ON public.import_batch_details FOR SELECT TO authenticated USING (auth.uid()=(SELECT user_id FROM public.import_batches WHERE id=import_batch_id));
CREATE POLICY ibd_insert ON public.import_batch_details FOR INSERT TO authenticated WITH CHECK ((SELECT user_id FROM public.import_batches WHERE id=import_batch_id)=auth.uid());

INSERT INTO storage.buckets (id,name,public) VALUES ('csv-imports','csv-imports',false) ON CONFLICT DO NOTHING;
