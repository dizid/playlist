-- Remove rating column from songs table
-- Rating is redundant since all imported songs are already "liked" in their source apps

ALTER TABLE songs DROP COLUMN IF EXISTS rating;
DROP INDEX IF EXISTS idx_songs_rating;
