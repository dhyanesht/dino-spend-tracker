-- Fix security warning: Set search_path for the function
DROP FUNCTION IF EXISTS public.update_category_groups_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_category_groups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_category_groups_updated_at
BEFORE UPDATE ON public.category_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_category_groups_updated_at();