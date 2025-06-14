
-- ENTERTAINMENT & CHILDREN
INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Entertainment', 'variable', 0, '#8B5CF6', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Entertainment');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Books', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Books');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Concerts/shows', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Concerts/shows');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Games', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Games');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Hobbies', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hobbies');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Movies', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Movies');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Music', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Music');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Outdoor activities', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Outdoor activities');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Photography', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Photography');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Sports', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sports');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Theater/plays', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Theater/plays');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'TV', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'TV');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Entertainment_Other', 'variable', 0, '#8B5CF6', 'Entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Entertainment_Other');



-- EVERYDAY & CHILDREN
INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Everyday', 'variable', 0, '#10B981', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Everyday');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Groceries', 'variable', 0, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Groceries');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Restaurants', 'variable', 0, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Restaurants');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Personal supplies', 'variable', 0, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Personal supplies');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Clothes', 'variable', 0, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Clothes');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Laundry/dry cleaning', 'variable', 0, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Laundry/dry cleaning');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Hair/beauty', 'variable', 0, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hair/beauty');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Subscriptions', 'variable', 0, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Subscriptions');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Everyday_Other', 'variable', 0, '#10B981', 'Everyday'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Everyday_Other');



-- HOME & CHILDREN
INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Home', 'fixed', 0, '#F59E0B', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Home');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Rent/mortgage', 'fixed', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Rent/mortgage');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Property taxes', 'fixed', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Property taxes');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Furnishings', 'variable', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Furnishings');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Lawn/garden', 'variable', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Lawn/garden');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Supplies', 'variable', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Supplies');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Maintenance', 'variable', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Maintenance');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Home Improvements', 'variable', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Home Improvements');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Moving', 'variable', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Moving');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Home_Other', 'variable', 0, '#F59E0B', 'Home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Home_Other');


-- TRANSPORTATION & CHILDREN
INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Transportation', 'variable', 0, '#3B82F6', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transportation');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Fuel', 'variable', 0, '#3B82F6', 'Transportation'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fuel');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Car payments', 'variable', 0, '#3B82F6', 'Transportation'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Car payments');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Repairs', 'variable', 0, '#3B82F6', 'Transportation'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Repairs');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Registration/license', 'variable', 0, '#3B82F6', 'Transportation'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Registration/license');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'T Supplies', 'variable', 0, '#3B82F6', 'Transportation'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'T Supplies');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Public transit', 'variable', 0, '#3B82F6', 'Transportation'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Public transit');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Transportation_Other', 'variable', 0, '#3B82F6', 'Transportation'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transportation_Other');


-- UTILITIES & CHILDREN
INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Utilities', 'fixed', 0, '#EF4444', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Utilities');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Phone', 'fixed', 0, '#EF4444', 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Phone');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'TV', 'fixed', 0, '#EF4444', 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'TV');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Internet', 'fixed', 0, '#EF4444', 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Internet');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Electricity', 'fixed', 0, '#EF4444', 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Electricity');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Heat/gas', 'fixed', 0, '#EF4444', 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Heat/gas');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Water', 'fixed', 0, '#EF4444', 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Water');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Trash', 'fixed', 0, '#EF4444', 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Trash');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Utility_Other', 'fixed', 0, '#EF4444', 'Utilities'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Utility_Other');
