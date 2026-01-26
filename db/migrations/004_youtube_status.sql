-- Add YouTube video status tracking
-- Values: valid (real YouTube ID), pending (needs lookup), not_found (searched but no match)

ALTER TABLE songs ADD COLUMN IF NOT EXISTS youtube_status VARCHAR(20) DEFAULT 'valid';

-- Set existing songs with shz* prefix (Shazam placeholder IDs) to pending
UPDATE songs SET youtube_status = 'pending' WHERE youtube_id LIKE 'shz%';

-- Index for finding songs that need YouTube lookup
CREATE INDEX IF NOT EXISTS idx_songs_youtube_status ON songs(youtube_status);

COMMENT ON COLUMN songs.youtube_status IS 'YouTube video status: valid, pending (needs lookup), not_found';
