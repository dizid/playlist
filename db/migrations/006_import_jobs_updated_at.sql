-- Add missing updated_at column to import_jobs
-- Referenced by import-process-background.mts for progress updates

ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
