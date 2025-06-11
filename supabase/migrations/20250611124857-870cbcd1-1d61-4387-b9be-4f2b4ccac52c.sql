
-- Add parent_category column to categories table (if it doesn't exist)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_category text;

-- First, let's insert parent categories only if they don't exist
INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Everyday', 'variable', 1500, '#10B981', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Everyday');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Food & Dining', 'variable', 800, '#10B981', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Food & Dining');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Entertainment & Leisure', 'variable', 400, '#8B5CF6', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Entertainment & Leisure');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Health & Fitness', 'variable', 300, '#F59E0B', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Health & Fitness');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Bills & Utilities', 'fixed', 1200, '#EF4444', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Bills & Utilities');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Transportation & Travel', 'variable', 800, '#3B82F6', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transportation & Travel');

-- Now insert subcategories
INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Groceries', 'variable', 800, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Groceries');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Restaurants', 'variable', 400, '#10B981', 'Food & Dining'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Restaurants');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Coffee & Snacks', 'variable', 200, '#10B981', 'Food & Dining'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Coffee & Snacks');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Shopping', 'variable', 300, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Shopping');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Gas', 'variable', 400, '#3B82F6', 'Transportation & Travel'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Gas');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Public Transit', 'variable', 200, '#3B82F6', 'Transportation & Travel'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Public Transit');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Car Maintenance', 'variable', 200, '#3B82F6', 'Transportation & Travel'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Car Maintenance');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Movies & Shows', 'variable', 150, '#8B5CF6', 'Entertainment & Leisure'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Movies & Shows');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Gaming', 'variable', 100, '#8B5CF6', 'Entertainment & Leisure'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Gaming');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Books & Media', 'variable', 75, '#8B5CF6', 'Entertainment & Leisure'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Books & Media');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Hobbies', 'variable', 200, '#8B5CF6', 'Entertainment & Leisure'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hobbies');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Gym & Fitness', 'variable', 100, '#F59E0B', 'Health & Fitness'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Gym & Fitness');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Healthcare', 'variable', 200, '#F59E0B', 'Health & Fitness'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Healthcare');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Rent', 'fixed', 800, '#EF4444', 'Bills & Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Rent');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Electricity', 'fixed', 150, '#EF4444', 'Bills & Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Electricity');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Internet', 'fixed', 80, '#EF4444', 'Bills & Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Internet');

INSERT INTO categories (name, type, monthly_budget, color, parent_category) 
SELECT 'Phone', 'fixed', 60, '#EF4444', 'Bills & Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Phone');
