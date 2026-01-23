// Run database migrations on Neon
// Usage: node scripts/run-migration.js

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.VITE_NEON_DATABASE_URL ||
  'postgresql://neondb_owner:npg_T1CbKlmBio3w@ep-jolly-term-a1ii1cjm-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  console.log('Connecting to Neon database...');

  const sql = neon(DATABASE_URL);

  // Run each migration statement using tagged template
  console.log('Running migration...');

  try {
    // Enable UUID extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('✓ UUID extension');

    // Songs table
    await sql`
      CREATE TABLE IF NOT EXISTS songs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        youtube_id VARCHAR(11) NOT NULL,
        title TEXT NOT NULL,
        artist TEXT,
        channel TEXT,
        duration INTEGER,
        thumbnail TEXT,
        rating VARCHAR(20) DEFAULT 'neutral',
        play_count INTEGER DEFAULT 0,
        skip_count INTEGER DEFAULT 0,
        popularity INTEGER DEFAULT 0,
        genres TEXT[],
        moods TEXT[],
        source VARCHAR(20),
        first_played TIMESTAMPTZ,
        last_played TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, youtube_id)
      )
    `;
    console.log('✓ Songs table');

    // Playlists table
    await sql`
      CREATE TABLE IF NOT EXISTS playlists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'smart',
        rules JSONB,
        song_ids UUID[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✓ Playlists table');

    // Play history table
    await sql`
      CREATE TABLE IF NOT EXISTS play_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
        played_at TIMESTAMPTZ DEFAULT NOW(),
        duration_watched INTEGER,
        completed BOOLEAN DEFAULT FALSE
      )
    `;
    console.log('✓ Play history table');

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_youtube_id ON songs(youtube_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_rating ON songs(rating)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_popularity ON songs(popularity DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_play_history_song_id ON play_history(song_id)`;
    console.log('✓ Indexes created');

    // GIN indexes for arrays
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_genres ON songs USING GIN(genres)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_moods ON songs USING GIN(moods)`;
    console.log('✓ GIN indexes created');

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  }
}

runMigration().catch(console.error);
