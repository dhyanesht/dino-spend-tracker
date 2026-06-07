
-- 1. Fix categories table: remove permissive policy, add per-user policies
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;

REVOKE ALL ON public.categories FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix user_roles privilege escalation: block all writes from authenticated/anon
--    (existing "Service role can manage roles" policy already covers service_role)
CREATE POLICY "Block authenticated role inserts"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block authenticated role updates"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Block authenticated role deletes"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

-- 3. Revoke EXECUTE on internal trigger SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.update_category_groups_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_transaction_category() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_store_category() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
