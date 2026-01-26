-- TuneCraft RLS Migration
-- Enable Row Level Security on all user data tables

-- ============================================
-- STEP 1: Enable RLS on all tables
-- ============================================

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create helper function to get current user
-- Reads from session variable set by the application
-- ============================================

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
  SELECT COALESCE(current_setting('app.current_user_id', true), '');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================
-- STEP 3: Create RLS policies for songs table
-- ============================================

CREATE POLICY songs_select ON songs
  FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY songs_insert ON songs
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY songs_update ON songs
  FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY songs_delete ON songs
  FOR DELETE
  USING (user_id = current_user_id());

-- ============================================
-- STEP 4: Create RLS policies for playlists table
-- ============================================

CREATE POLICY playlists_select ON playlists
  FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY playlists_insert ON playlists
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY playlists_update ON playlists
  FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY playlists_delete ON playlists
  FOR DELETE
  USING (user_id = current_user_id());

-- ============================================
-- STEP 5: Create RLS policies for play_history table
-- ============================================

CREATE POLICY history_select ON play_history
  FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY history_insert ON play_history
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

CREATE POLICY history_update ON play_history
  FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY history_delete ON play_history
  FOR DELETE
  USING (user_id = current_user_id());
