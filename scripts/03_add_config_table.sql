-- Create config table to store sitemap URL and other settings
CREATE TABLE IF NOT EXISTS git_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitemap_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default row (only one config row should exist)
INSERT INTO git_sync_config (sitemap_url) 
VALUES (NULL)
ON CONFLICT DO NOTHING;
