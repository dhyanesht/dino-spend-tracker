-- Create a function to validate that a transaction's category is not a parent category
CREATE OR REPLACE FUNCTION public.validate_transaction_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the category exists and is not a parent category
  IF EXISTS (
    SELECT 1 
    FROM public.categories 
    WHERE name = NEW.category 
    AND parent_category IS NULL
    AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Transactions cannot be assigned to parent categories. Please use a subcategory instead.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT operations
CREATE TRIGGER validate_transaction_category_on_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_category();

-- Create trigger for UPDATE operations
CREATE TRIGGER validate_transaction_category_on_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.category IS DISTINCT FROM NEW.category)
  EXECUTE FUNCTION public.validate_transaction_category();

-- Also add validation for stores table to ensure store mappings use subcategories
CREATE OR REPLACE FUNCTION public.validate_store_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the category exists and is not a parent category
  IF EXISTS (
    SELECT 1 
    FROM public.categories 
    WHERE name = NEW.category_name 
    AND parent_category IS NULL
    AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Store mappings cannot use parent categories. Please use a subcategory instead.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for stores INSERT operations
CREATE TRIGGER validate_store_category_on_insert
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_store_category();

-- Create trigger for stores UPDATE operations
CREATE TRIGGER validate_store_category_on_update
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  WHEN (OLD.category_name IS DISTINCT FROM NEW.category_name)
  EXECUTE FUNCTION public.validate_store_category();