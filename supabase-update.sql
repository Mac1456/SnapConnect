-- SnapConnect Database Update Script
-- Run this ONLY if you already have the main schema installed
-- This adds the missing function to handle user profile creation

-- Function to create user profile (bypasses RLS)
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  username TEXT,
  display_name TEXT,
  email TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO users (id, username, display_name, email, friends, snapchat_score, profile_picture, bio)
  VALUES (user_id, username, display_name, email, '{}', 0, null, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the RLS policy for users table (if needed)
-- Drop existing policy and recreate with better handling
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    (auth.role() = 'authenticated' AND auth.uid()::text = id::text)
  );

-- Ensure realtime is enabled for relevant tables (if not already done)
DO $$
BEGIN
  -- Check if tables exist in realtime publication, add if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'snaps'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE snaps;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stories;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'friendships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
  END IF;
END $$;

-- Script complete!
SELECT 'SnapConnect database update completed successfully!' as status; 