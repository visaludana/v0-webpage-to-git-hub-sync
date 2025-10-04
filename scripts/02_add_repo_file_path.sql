-- Add column to store the actual repository file path
ALTER TABLE git_sync_pages
ADD COLUMN IF NOT EXISTS repo_file_path TEXT;

-- Update existing records to set repo_file_path based on folder_path and name
UPDATE git_sync_pages
SET repo_file_path = CASE
  WHEN folder_path IS NOT NULL AND folder_path != '' THEN folder_path || '/' || name || '.html'
  ELSE name || '.html'
END
WHERE repo_file_path IS NULL;
