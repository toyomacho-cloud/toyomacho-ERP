-- ============================================
-- AGREGAR COLUMNAS FALTANTES A MOVEMENTS (SNAKE_CASE)
-- ============================================
-- Ejecutar en Supabase: SQL Editor -> New Query -> Run

-- Columna para el nombre del producto
ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '';

-- Columna para el stock resultante
ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS new_qty INTEGER DEFAULT 0;

-- Columna para el usuario (user_name)
ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';

-- Columna para ubicación
ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';

-- Verificar las columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'movements';
