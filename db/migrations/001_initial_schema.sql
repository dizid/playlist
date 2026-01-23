-- TuneLayer Database Schema
-- Run this in Neon SQL Editor or via psql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Songs table (your library)
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- Google user ID
  youtube_id VARCHAR(11) NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  channel TEXT,
  duration INTEGER,
  thumbnail TEXT,
  rating VARCHAR(20) DEFAULT 'neutral',  -- loved/liked/neutral/disliked/blocked
  play_count INTEGER DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  popularity INTEGER DEFAULT 0,          -- computed 0-100
  genres TEXT[],                         -- PostgreSQL array
  moods TEXT[],
  source VARCHAR(20),                    -- youtube/shazam/spotify/manual
  first_played TIMESTAMPTZ,
  last_played TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, youtube_id)
);

-- Smart playlists (rule-based)
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'smart',      -- smart/manual
  rules JSONB,                           -- {minPopularity, genres, moods, etc}
  song_ids UUID[],                       -- for manual playlists
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Play history (for stats & tracking)
CREATE TABLE IF NOT EXISTS play_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  duration_watched INTEGER,              -- seconds
  completed BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_youtube_id ON songs(youtube_id);
CREATE INDEX IF NOT EXISTS idx_songs_rating ON songs(rating);
CREATE INDEX IF NOT EXISTS idx_songs_popularity ON songs(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_songs_last_played ON songs(last_played DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_song_id ON play_history(song_id);

-- GIN index for array columns (fast genre/mood filtering)
CREATE INDEX IF NOT EXISTS idx_songs_genres ON songs USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_songs_moods ON songs USING GIN(moods);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_songs_updated_at ON songs;
CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
