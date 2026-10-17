CREATE TABLE public.import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 idempotency_key uuid NOT NULL, filename text NOT NULL, file_size integer, mime_type text, content_hash text,
 storage_bucket text NOT NULL DEFAULT 'csv-imports', storage_path text NOT NULL,
 import_timestamp timestamptz NOT NULL DEFAULT now(), total_rows integer NOT NULL,
 valid_rows integer NOT NULL DEFAULT 0, parsed_count integer NOT NULL DEFAULT 0,
 imported_count integer NOT NULL DEFAULT 0, skipped_count integer NOT NULL DEFAULT 0,
 duplicate_count integer NOT NULL DEFAULT 0, ambiguous_count integer NOT NULL DEFAULT 0,
 failed_count integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','partial','failed')),
 is_undone boolean NOT NULL DEFAULT false, undone_at timestamptz, undo_actor uuid, undo_transaction_ids uuid[],
 retry_count integer NOT NULL DEFAULT 0, last_retry_at timestamptz, error_code text, error_message text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,idempotency_key)
);
GRANT SELECT, INSERT, UPDATE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY ib_select ON public.import_batches FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY ib_insert ON public.import_batches FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id AND storage_bucket='csv-imports' AND split_part(storage_path,'/',1)=auth.uid()::text);
CREATE POLICY ib_update ON public.import_batches FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id AND storage_bucket='csv-imports' AND split_part(storage_path,'/',1)=auth.uid()::text);
CREATE TRIGGER set_import_batches_updated_at BEFORE UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.import_batch_details (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 import_batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE RESTRICT,
 row_number integer NOT NULL, original_data jsonb NOT NULL, parsed_transaction jsonb,
 status text NOT NULL CHECK(status IN ('pending','imported','skipped','duplicate','ambiguous','invalid','failed')),
 reason text, error_code text, matched_transaction_id uuid, retry_count integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(import_batch_id,row_number)
);
GRANT SELECT, INSERT, UPDATE ON public.import_batch_details TO authenticated;
GRANT ALL ON public.import_batch_details TO service_role;
ALTER TABLE public.import_batch_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY ibd_select ON public.import_batch_details FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.import_batches b WHERE b.id=import_batch_id AND b.user_id=auth.uid()));
CREATE POLICY ibd_insert ON public.import_batch_details FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.import_batches b WHERE b.id=import_batch_id AND b.user_id=auth.uid()));
CREATE POLICY ibd_update ON public.import_batch_details FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM public.import_batches b WHERE b.id=import_batch_id AND b.user_id=auth.uid())) WITH CHECK (EXISTS(SELECT 1 FROM public.import_batches b WHERE b.id=import_batch_id AND b.user_id=auth.uid()));
CREATE TRIGGER set_import_batch_details_updated_at BEFORE UPDATE ON public.import_batch_details FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.transactions ADD COLUMN import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE RESTRICT;
CREATE INDEX idx_transactions_import_batch ON public.transactions(import_batch_id);
CREATE INDEX idx_import_batches_user ON public.import_batches(user_id,import_timestamp DESC);
CREATE INDEX idx_import_batches_ts ON public.import_batches(import_timestamp DESC);
CREATE INDEX idx_import_batch_details_batch ON public.import_batch_details(import_batch_id);
CREATE INDEX idx_transactions_transfer_pair ON public.transactions(transfer_pair_id) WHERE transfer_pair_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_transaction_import_batch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.import_batch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.import_batches WHERE id=NEW.import_batch_id AND user_id=NEW.user_id AND NOT is_undone) THEN
  RAISE EXCEPTION 'Import batch not found, already undone, or belongs to another user';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_transaction_import_batch() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_transaction_import_batch BEFORE INSERT OR UPDATE OF import_batch_id,user_id ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_import_batch();

CREATE POLICY csv_imports_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='csv-imports' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY csv_imports_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='csv-imports' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY csv_imports_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='csv-imports' AND (storage.foldername(name))[1]=auth.uid()::text);

CREATE OR REPLACE FUNCTION public.cleanup_import_batch(p_batch_id uuid,p_user_id uuid,p_force boolean DEFAULT false)
RETURNS TABLE(deleted_transaction_ids uuid[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_batch public.import_batches%ROWTYPE; v_ids uuid[];
BEGIN
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
  RAISE EXCEPTION 'Authenticated owner required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_batch FROM public.import_batches WHERE id=p_batch_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Import batch not found or not owned by user' USING ERRCODE='42501'; END IF;
 IF v_batch.is_undone THEN RETURN QUERY SELECT COALESCE(v_batch.undo_transaction_ids,ARRAY[]::uuid[]); RETURN; END IF;
 IF v_batch.status='processing' THEN RAISE EXCEPTION 'Cannot undo an import while it is processing'; END IF;
 PERFORM t.id FROM public.transactions t WHERE t.user_id=p_user_id AND (t.import_batch_id=p_batch_id OR t.transfer_pair_id IN (SELECT s.transfer_pair_id FROM public.transactions s WHERE s.import_batch_id=p_batch_id AND s.user_id=p_user_id AND s.transfer_pair_id IS NOT NULL)) ORDER BY t.id FOR UPDATE;
 SELECT COALESCE(array_agg(t.id),ARRAY[]::uuid[]) INTO v_ids FROM public.transactions t
 WHERE t.user_id=p_user_id AND (t.import_batch_id=p_batch_id OR t.transfer_pair_id IN (SELECT s.transfer_pair_id FROM public.transactions s WHERE s.import_batch_id=p_batch_id AND s.user_id=p_user_id AND s.transfer_pair_id IS NOT NULL));
 IF EXISTS(SELECT 1 FROM public.transactions WHERE linked_transaction_id=ANY(v_ids) AND NOT(id=ANY(v_ids))) THEN
  RAISE EXCEPTION 'Cannot undo: transactions outside this import reference the imported transactions';
 END IF;
 IF NOT p_force AND EXISTS(SELECT 1 FROM public.transactions WHERE id=ANY(v_ids) AND import_batch_id IS DISTINCT FROM p_batch_id) THEN
  RAISE EXCEPTION 'A transfer leg outside this import requires explicit confirmation';
 END IF;
 DELETE FROM public.transactions WHERE id=ANY(v_ids) AND user_id=p_user_id;
 UPDATE public.import_batches SET is_undone=true,undone_at=now(),undo_actor=auth.uid(),undo_transaction_ids=v_ids WHERE id=p_batch_id;
 RETURN QUERY SELECT v_ids;
END; $$;
REVOKE ALL ON FUNCTION public.cleanup_import_batch(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_import_batch(uuid,uuid,boolean) TO authenticated;