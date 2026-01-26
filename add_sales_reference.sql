-- Add reference column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales';
