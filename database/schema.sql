-- ==============================================================================
-- SHIV LAMINATE STOCK HANDLING DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Laminate Items Table
CREATE TABLE IF NOT EXISTS laminate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(32) UNIQUE NOT NULL,                 -- e.g. SMT-1901
    code VARCHAR(16) NOT NULL,                       -- e.g. 1901
    finish VARCHAR(16) NOT NULL,                     -- e.g. SMT, HG, SF
    name VARCHAR(128) NOT NULL,                      -- e.g. Shiv Pastel 1901 (SMT)
    category VARCHAR(64) DEFAULT 'Pastel Colour',
    brand VARCHAR(64) DEFAULT 'SHIV LAMINATE',
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_threshold INTEGER NOT NULL DEFAULT 5,
    unit_price NUMERIC(10, 2) DEFAULT 850.00,
    location VARCHAR(64) DEFAULT 'Rack Main',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for high-speed searches by code, finish, and SKU
CREATE INDEX IF NOT EXISTS idx_laminate_code ON laminate_items(code);
CREATE INDEX IF NOT EXISTS idx_laminate_finish ON laminate_items(finish);
CREATE INDEX IF NOT EXISTS idx_laminate_sku ON laminate_items(sku);
CREATE INDEX IF NOT EXISTS idx_laminate_quantity ON laminate_items(quantity);

-- 2. Stock Transactions (Audit Ledger) Table
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES laminate_items(id) ON DELETE CASCADE,
    sku VARCHAR(32) NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity_change INTEGER NOT NULL,                -- Positive for IN, negative for OUT
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference VARCHAR(128),                          -- Invoice #, Client Name, Supplier
    reason TEXT,                                     -- "Client delivery", "Damaged", etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON stock_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON stock_transactions(type);

-- 3. Application Settings Table (For single user configuration)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default single-user configuration (default PIN: '1901' - can be changed in settings)
INSERT INTO app_settings (key, value)
VALUES 
    ('auth_pin', '{"pin": "1901", "enabled": true}'::jsonb),
    ('low_stock_default', '{"threshold": 5}'::jsonb),
    ('app_info', '{"name": "Shiv Laminate Stock System", "owner": "Single Owner"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Automatic updated_at trigger for laminate_items
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_laminate_items_timestamp ON laminate_items;
CREATE TRIGGER trg_update_laminate_items_timestamp
BEFORE UPDATE ON laminate_items
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- 5. Helper view for analytics
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
    COUNT(*) as total_skus,
    COALESCE(SUM(quantity), 0) as total_sheets,
    COUNT(CASE WHEN quantity <= min_threshold AND quantity > 0 THEN 1 END) as low_stock_count,
    COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_count
FROM laminate_items;
