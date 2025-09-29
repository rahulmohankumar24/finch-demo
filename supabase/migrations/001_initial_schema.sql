-- Create matters table
CREATE TABLE matters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id VARCHAR(255) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id VARCHAR(255) NOT NULL REFERENCES matters(matter_id) ON DELETE CASCADE,
    task_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completion_date TIMESTAMPTZ,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(matter_id, task_id)
);

-- Create dependencies table
CREATE TABLE task_dependencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    dependency_type VARCHAR(50) NOT NULL CHECK (dependency_type IN ('task_completion', 'time_based')),
    target_task_id VARCHAR(255) NOT NULL,
    time_delay_weeks INTEGER,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (matter_id, task_id) REFERENCES tasks(matter_id, task_id) ON DELETE CASCADE,
    FOREIGN KEY (matter_id, target_task_id) REFERENCES tasks(matter_id, task_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_matters_matter_id ON matters(matter_id);
CREATE INDEX idx_tasks_matter_id ON tasks(matter_id);
CREATE INDEX idx_tasks_task_id ON tasks(task_id);
CREATE INDEX idx_task_dependencies_matter_task ON task_dependencies(matter_id, task_id);
CREATE INDEX idx_task_dependencies_target ON task_dependencies(matter_id, target_task_id);

-- Create update trigger for matters
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_matters_updated_date
    BEFORE UPDATE ON matters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_date_column();

-- Enable Row Level Security
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - you can restrict later)
CREATE POLICY "Enable read access for all users" ON matters FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON matters FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON matters FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON matters FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON tasks FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON tasks FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON task_dependencies FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON task_dependencies FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON task_dependencies FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON task_dependencies FOR DELETE USING (true);