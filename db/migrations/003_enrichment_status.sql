-- Add enrichment tracking to songs table
-- Values: pending, completed, failed, manual

ALTER TABLE songs ADD COLUMN IF NOT EXISTS enrichment_status VARCHAR(20) DEFAULT 'pending';

-- Index for finding songs that need enrichment
CREATE INDEX IF NOT EXISTS idx_songs_enrichment_status ON songs(enrichment_status);

COMMENT ON COLUMN songs.enrichment_status IS 'Status of genre/mood enrichment: pending, completed, failed, manual';
