
-- HEALTH/MEDICAL & CHILDREN
INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Health/medical', 'variable', 0, '#F59E0B', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Health/medical');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Doctors/dental/vision', 'variable', 0, '#F59E0B', 'Health/medical'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Doctors/dental/vision');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Specialty care', 'variable', 0, '#F59E0B', 'Health/medical'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Specialty care');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Pharmacy', 'variable', 0, '#F59E0B', 'Health/medical'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pharmacy');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Emergency', 'variable', 0, '#F59E0B', 'Health/medical'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Emergency');

INSERT INTO categories (name, type, monthly_budget, color, parent_category)
SELECT 'Health_Other', 'variable', 0, '#F59E0B', 'Health/medical'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Health_Other');
