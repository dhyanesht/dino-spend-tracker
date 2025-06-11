
-- Create stores table to map store names to categories
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster store name lookups
CREATE INDEX idx_stores_name ON public.stores(name);

-- Add some example store mappings
INSERT INTO public.stores (name, category_name) VALUES
('Costco', 'Groceries'),
('Walmart', 'Groceries'),
('Target', 'Shopping'),
('Amazon', 'Shopping'),
('Starbucks', 'Coffee & Snacks'),
('McDonald''s', 'Restaurants'),
('Shell', 'Gas'),
('Chevron', 'Gas'),
('Netflix', 'Movies & Shows'),
('Spotify', 'Entertainment & Leisure'),
('LA Fitness', 'Gym & Fitness'),
('CVS Pharmacy', 'Healthcare'),
('Home Depot', 'Shopping'),
('Best Buy', 'Shopping'),
('Uber', 'Transportation & Travel'),
('Lyft', 'Transportation & Travel');

-- Enable RLS on stores table (optional - can be public for simplicity)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create policy that allows everyone to read stores (since it's reference data)
CREATE POLICY "Anyone can view stores" 
  ON public.stores 
  FOR SELECT 
  USING (true);

-- Create policy that allows anyone to insert new stores
CREATE POLICY "Anyone can create stores" 
  ON public.stores 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that allows anyone to update stores
CREATE POLICY "Anyone can update stores" 
  ON public.stores 
  FOR UPDATE 
  USING (true);
