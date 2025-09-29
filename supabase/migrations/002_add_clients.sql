-- Create clients table
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(255),
    address TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Update matters table to reference clients
ALTER TABLE matters ADD COLUMN client_id VARCHAR(255);

-- Create foreign key relationship
ALTER TABLE matters
ADD CONSTRAINT fk_matters_client
FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_clients_client_id ON clients(client_id);
CREATE INDEX idx_matters_client_id ON matters(client_id);

-- Add update trigger for clients
CREATE TRIGGER update_clients_updated_date
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_date_column();

-- Enable Row Level Security for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Enable read access for all users" ON clients FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON clients FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON clients FOR DELETE USING (true);

-- Migrate existing matters to have client_id based on client_name
-- This will create client records for existing matters
INSERT INTO clients (client_id, name, created_date)
SELECT
    LOWER(REPLACE(REPLACE(client_name, ' ', '_'), '''', '')) as client_id,
    client_name as name,
    MIN(created_date) as created_date
FROM matters
WHERE client_name IS NOT NULL
GROUP BY client_name;

-- Update matters to reference the new client_id
UPDATE matters
SET client_id = LOWER(REPLACE(REPLACE(client_name, ' ', '_'), '''', ''))
WHERE client_name IS NOT NULL;

-- Make client_name nullable since we now have client_id relationship
ALTER TABLE matters ALTER COLUMN client_name DROP NOT NULL;