-- Connected music services (Last.fm, ListenBrainz) for automatic play-history sync.
-- One row per user per provider. Sync is resumable: both cursors are saved after every page,
-- so a run can stop at any time (function timeout) and the next run continues where it left off.

CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  provider VARCHAR(20) NOT NULL,              -- lastfm, listenbrainz
  external_username TEXT NOT NULL,            -- public username on the provider

  -- Sync state
  status VARCHAR(20) DEFAULT 'pending',       -- pending, syncing, ok, error
  newest_play_ts BIGINT,                      -- unix seconds: newest play imported (forward cursor)
  oldest_play_ts BIGINT,                      -- unix seconds: oldest play imported (backfill cursor)
  backfill_done BOOLEAN DEFAULT FALSE,        -- true once the whole history has been walked
  plays_imported INTEGER DEFAULT 0,
  provider_total_plays INTEGER,               -- total plays reported by the provider (for progress)
  sync_started_at TIMESTAMPTZ,                -- run lock: set while a sync run is active
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider)
);

-- Scheduled sync picks the connections that waited longest first
CREATE INDEX IF NOT EXISTS idx_connections_last_synced ON connections(last_synced_at NULLS FIRST);

-- updated_at is set by the queries themselves (the live DB has no updated_at triggers)

-- Where a play came from (tunecraft, lastfm, listenbrainz). NULL = logged by TuneCraft before this column existed.
ALTER TABLE play_history ADD COLUMN IF NOT EXISTS source VARCHAR(20);

-- The same play can be fetched twice (re-sync, overlapping pages): make play inserts idempotent
CREATE UNIQUE INDEX IF NOT EXISTS idx_play_history_unique_play ON play_history(user_id, song_id, played_at);

-- Match synced plays to existing songs by artist + title (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_songs_user_artist_title ON songs(user_id, lower(artist), lower(title));

COMMENT ON TABLE connections IS 'Linked music services whose listening history is synced into songs + play_history';
