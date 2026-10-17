CREATE OR REPLACE FUNCTION public.cleanup_import_batch(p_batch_id UUID, p_user_id UUID, p_force BOOLEAN DEFAULT false)
RETURNS TABLE(deleted_transaction_ids UUID[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ids UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.import_batches WHERE id=p_batch_id AND user_id=p_user_id) THEN
    RAISE EXCEPTION 'Import batch not found or not owned by user';
  END IF;
  IF (SELECT is_undone FROM public.import_batches WHERE id=p_batch_id) THEN
    RETURN QUERY SELECT undo_transaction_ids FROM public.import_batches WHERE id=p_batch_id;
    RETURN;
  END IF;
  SELECT array_agg(id) INTO v_ids
  FROM public.transactions
  WHERE import_batch_id = p_batch_id
     OR id IN (SELECT linked_transaction_id FROM public.transactions WHERE import_batch_id = p_batch_id)
     OR transfer_pair_id IN (
       SELECT transfer_pair_id
       FROM public.transactions
       WHERE import_batch_id = p_batch_id
         AND transfer_pair_id IS NOT NULL
     );
  DELETE FROM public.transactions
  WHERE import_batch_id = p_batch_id
     OR id IN (SELECT linked_transaction_id FROM public.transactions WHERE import_batch_id = p_batch_id)
     OR transfer_pair_id IN (
       SELECT transfer_pair_id
       FROM public.transactions
       WHERE import_batch_id = p_batch_id
         AND transfer_pair_id IS NOT NULL
     );
  DELETE FROM public.import_batch_details WHERE import_batch_id = p_batch_id;
  UPDATE public.import_batches
  SET is_undone = true,
      undone_at = now(),
      undo_actor = p_user_id,
      undo_transaction_ids = v_ids,
      updated_at = now()
  WHERE id = p_batch_id;
  RETURN QUERY SELECT v_ids;
END; $$;

REVOKE EXECUTE ON FUNCTION public.cleanup_import_batch(UUID,UUID,BOOLEAN) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_import_batch(UUID,UUID,BOOLEAN) TO authenticated;
