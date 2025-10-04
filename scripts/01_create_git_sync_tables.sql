-- Create table for GitHub account configuration
CREATE TABLE IF NOT EXISTS git_sync_acc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for syncing pages
-- Removed folder_id foreign key constraint to simplify folder structure
CREATE TABLE IF NOT EXISTS git_sync_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  folder_name TEXT,
  folder_path TEXT,
  last_synced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Removed folder_id index since we no longer have that column
-- Enable Row Level Security
ALTER TABLE git_sync_acc ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_sync_pages ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can customize these based on your auth needs)
CREATE POLICY "Allow all operations on git_sync_acc" ON git_sync_acc
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on git_sync_pages" ON git_sync_pages
  FOR ALL USING (true) WITH CHECK (true);
