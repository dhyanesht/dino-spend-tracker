-- Create category_groups table
CREATE TABLE public.category_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS on category_groups
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for category_groups
CREATE POLICY "Users can view own groups"
ON public.category_groups
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own groups"
ON public.category_groups
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own groups"
ON public.category_groups
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own groups"
ON public.category_groups
FOR DELETE
USING (auth.uid() = user_id);

-- Create category_group_mappings table (many-to-many relationship)
CREATE TABLE public.category_group_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES public.category_groups(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, category_id)
);

-- Enable RLS on category_group_mappings
ALTER TABLE public.category_group_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for category_group_mappings
CREATE POLICY "Users can view own mappings"
ON public.category_group_mappings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mappings"
ON public.category_group_mappings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mappings"
ON public.category_group_mappings
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_category_groups_user_id ON public.category_groups(user_id);
CREATE INDEX idx_category_group_mappings_user_id ON public.category_group_mappings(user_id);
CREATE INDEX idx_category_group_mappings_group_id ON public.category_group_mappings(group_id);
CREATE INDEX idx_category_group_mappings_category_id ON public.category_group_mappings(category_id);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_category_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_groups_updated_at
BEFORE UPDATE ON public.category_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_category_groups_updated_at();