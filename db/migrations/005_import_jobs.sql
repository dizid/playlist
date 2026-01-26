-- Import jobs for background processing
-- Allows users to start imports and close browser while processing continues

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,

  -- Job configuration
  type VARCHAR(30) NOT NULL,            -- youtube_playlists, youtube_likes, shazam, takeout
  total_items INTEGER NOT NULL,

  -- Progress tracking
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  processed_items INTEGER DEFAULT 0,
  inserted_items INTEGER DEFAULT 0,
  skipped_items INTEGER DEFAULT 0,

  -- Notification settings
  notify_email BOOLEAN DEFAULT true,
  notify_push BOOLEAN DEFAULT true,
  email_address TEXT,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Payload: array of song objects from client
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_user_status ON import_jobs(user_id, status);

COMMENT ON TABLE import_jobs IS 'Background import jobs - allows processing to continue after browser closes';
COMMENT ON COLUMN import_jobs.payload IS 'Array of song objects: [{youtubeId, title, artist, channel, thumbnail}]';

-- Push subscriptions for Web Push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,

  -- Web Push subscription data (from PushSubscription.toJSON())
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,                 -- Public key for encryption
  auth TEXT NOT NULL,                   -- Auth secret

  -- Metadata
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ,

  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

COMMENT ON TABLE push_subscriptions IS 'Web Push subscriptions for browser notifications';
