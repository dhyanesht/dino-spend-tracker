-- Create indexes for optimal query performance

-- Stores table indexes
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_name_user_id ON stores(name, user_id);
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Categories table indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);