-- Fix client_name NOT NULL constraint issue
-- This migration handles the case where clients table already exists

-- Check if client_id column exists in matters table, add if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'matters' AND column_name = 'client_id') THEN
        ALTER TABLE matters ADD COLUMN client_id VARCHAR(255);
    END IF;
END $$;

-- Check if matter_name column exists in matters table, add if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'matters' AND column_name = 'matter_name') THEN
        ALTER TABLE matters ADD COLUMN matter_name VARCHAR(255);
    END IF;
END $$;

-- Check if foreign key constraint exists, add if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_matters_client') THEN
        ALTER TABLE matters
        ADD CONSTRAINT fk_matters_client
        FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
CREATE INDEX IF NOT EXISTS idx_matters_client_id ON matters(client_id);

-- Check if update trigger exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers
                   WHERE trigger_name = 'update_clients_updated_date') THEN
        CREATE TRIGGER update_clients_updated_date
            BEFORE UPDATE ON clients
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_date_column();
    END IF;
END $$;

-- Enable Row Level Security for clients if not already enabled
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist (using IF NOT EXISTS equivalent)
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
DROP POLICY IF EXISTS "Enable insert access for all users" ON clients;
DROP POLICY IF EXISTS "Enable update access for all users" ON clients;
DROP POLICY IF EXISTS "Enable delete access for all users" ON clients;

CREATE POLICY "Enable read access for all users" ON clients FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON clients FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON clients FOR DELETE USING (true);

-- Migrate existing matters to have client_id based on client_name
-- Only if there are matters without client_id
INSERT INTO clients (client_id, name, created_date)
SELECT
    LOWER(REPLACE(REPLACE(client_name, ' ', '_'), '''', '')) as client_id,
    client_name as name,
    MIN(created_date) as created_date
FROM matters
WHERE client_name IS NOT NULL
  AND client_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM clients
    WHERE client_id = LOWER(REPLACE(REPLACE(matters.client_name, ' ', '_'), '''', ''))
  )
GROUP BY client_name;

-- Update matters to reference the new client_id
UPDATE matters
SET client_id = LOWER(REPLACE(REPLACE(client_name, ' ', '_'), '''', ''))
WHERE client_name IS NOT NULL AND client_id IS NULL;

-- Make client_name nullable since we now have client_id relationship
-- Check if the column is currently NOT NULL before trying to change it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'matters'
               AND column_name = 'client_name'
               AND is_nullable = 'NO') THEN
        ALTER TABLE matters ALTER COLUMN client_name DROP NOT NULL;
    END IF;
END $$;