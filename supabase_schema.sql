-- ============================================
-- SUPABASE SCHEMA FOR DYNAMIC NOVA
-- VERSIÓN ACTUALIZADA CON DROP TABLES
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

-- PRIMERO: ELIMINAR TABLAS EXISTENTES (en orden correcto por dependencias)
DROP TABLE IF EXISTS internal_mail CASCADE;
DROP TABLE IF EXISTS credit_notes CASCADE;
DROP TABLE IF EXISTS authorization_requests CASCADE;
DROP TABLE IF EXISTS cash_transactions CASCADE;
DROP TABLE IF EXISTS cash_sessions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS movements CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ============================================
-- CREAR TABLAS
-- ============================================

-- 1. COMPANIES (Empresas)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rif TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    owner_id UUID,
    members UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (Usuarios del sistema)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'vendedor',
    active BOOLEAN DEFAULT true,
    modules JSONB DEFAULT '{}',
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BRANDS (Marcas)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATEGORIES (Categorías)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTS (Productos)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    sku TEXT,
    reference TEXT,
    description TEXT,
    brand TEXT,
    category TEXT,
    location TEXT,
    warehouse TEXT DEFAULT 'PRINCIPAL',
    unit TEXT,
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    price DECIMAL(10,2) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'In Stock',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PROVIDERS (Proveedores)
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    rif TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    contact_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CUSTOMERS (Clientes)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'V',
    rif TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MOVEMENTS (Movimientos de inventario)
CREATE TABLE movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    product_id UUID REFERENCES products(id),
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    notes TEXT,
    user_name TEXT,
    user_id TEXT,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PURCHASES (Compras)
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    provider_id UUID REFERENCES providers(id),
    provider_name TEXT,
    invoice_number TEXT,
    items JSONB DEFAULT '[]',
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    exchange_rate DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SALES (Ventas)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    document_number TEXT,
    document_type TEXT,
    product_id UUID,
    sku TEXT,
    description TEXT,
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    amount_usd DECIMAL(10,2),
    amount_bs DECIMAL(10,2),
    exchange_rate DECIMAL(10,2),
    payment_currency TEXT DEFAULT 'USD',
    has_iva BOOLEAN DEFAULT false,
    iva_amount DECIMAL(10,2) DEFAULT 0,
    customer_id UUID REFERENCES customers(id),
    customer JSONB,
    payment_type TEXT,
    payment_status TEXT DEFAULT 'pending',
    credit_days INTEGER,
    due_date DATE,
    is_quote BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    paid_amount DECIMAL(10,2) DEFAULT 0,
    remaining_amount DECIMAL(10,2) DEFAULT 0,
    inventory_affected BOOLEAN DEFAULT false,
    date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PAYMENTS (Pagos)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    sale_id UUID REFERENCES sales(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    reference TEXT,
    notes TEXT,
    date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CASH_SESSIONS (Sesiones de Caja)
CREATE TABLE cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    cashier_id TEXT,
    cashier_name TEXT,
    status TEXT DEFAULT 'open',
    opening_usd DECIMAL(10,2) DEFAULT 0,
    opening_bs DECIMAL(10,2) DEFAULT 0,
    closing_usd DECIMAL(10,2),
    closing_bs DECIMAL(10,2),
    expected_usd DECIMAL(10,2),
    expected_bs DECIMAL(10,2),
    difference_usd DECIMAL(10,2),
    difference_bs DECIMAL(10,2),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    notes TEXT
);

-- 13. CASH_TRANSACTIONS (Transacciones de Caja)
CREATE TABLE cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    session_id UUID REFERENCES cash_sessions(id),
    type TEXT NOT NULL,
    amount_usd DECIMAL(10,2) DEFAULT 0,
    amount_bs DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    reference TEXT,
    description TEXT,
    sale_id UUID,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. AUTHORIZATION_REQUESTS (Solicitudes de Autorización)
CREATE TABLE authorization_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    type TEXT NOT NULL,
    amount DECIMAL(10,2),
    reason TEXT,
    status TEXT DEFAULT 'pending',
    requested_by TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CREDIT_NOTES (Notas de Crédito)
CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    sale_id UUID REFERENCES sales(id),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. INTERNAL_MAIL (Correo Interno / NovaMail)
CREATE TABLE internal_mail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    from_user JSONB NOT NULL,
    to_user JSONB NOT NULL,
    subject TEXT,
    body TEXT,
    read BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_sales_company ON sales(company_id);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_movements_company ON movements(company_id);
CREATE INDEX idx_purchases_company ON purchases(company_id);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_cash_sessions_company ON cash_sessions(company_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_mail ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para usuarios autenticados
CREATE POLICY "auth_companies" ON companies FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_users" ON users FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_products" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_brands" ON brands FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_categories" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_providers" ON providers FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_movements" ON movements FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_purchases" ON purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_sales" ON sales FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_payments" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_cash_sessions" ON cash_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_cash_transactions" ON cash_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_auth_requests" ON authorization_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_credit_notes" ON credit_notes FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_internal_mail" ON internal_mail FOR ALL TO authenticated USING (true);
