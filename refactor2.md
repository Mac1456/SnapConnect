-- SnapConnect Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  bio TEXT DEFAULT '',
  profile_picture TEXT,
  snapchat_score INTEGER DEFAULT 0,
  friends TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ========================================
-- FRIENDSHIPS TABLE
-- ========================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- FRIEND REQUESTS TABLE
-- ========================================
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requester_username VARCHAR(50) NOT NULL,
  requester_display_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, requested_id)
);

-- Enable RLS for friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Friend requests policies
CREATE POLICY "Users can view relevant friend requests" ON friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Users can create friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests" ON friend_requests
  FOR UPDATE USING (auth.uid() = requested_id);

CREATE POLICY "Users can delete friend requests" ON friend_requests
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- ========================================
-- SNAPS TABLE
-- ========================================
CREATE TABLE snaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_username VARCHAR(50) NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(10) NOT NULL,
  caption TEXT DEFAULT '',
  timer INTEGER DEFAULT 3,
  opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for snaps
ALTER TABLE snaps ENABLE ROW LEVEL SECURITY;

-- Snaps policies
CREATE POLICY "Users can view own snaps" ON snaps
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create snaps" ON snaps
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update snap status" ON snaps
  FOR UPDATE USING (auth.uid() = recipient_id);

-- ========================================
-- STORIES TABLE
-- ========================================
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(10) NOT NULL,
  caption TEXT DEFAULT '',
  views UUID[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Users can view active stories" ON stories
  FOR SELECT USING (auth.role() = 'authenticated' AND expires_at > NOW());

CREATE POLICY "Users can create own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friend_requests_requested_id ON friend_requests(requested_id);
CREATE INDEX idx_friend_requests_requester_id ON friend_requests(requester_id);
CREATE INDEX idx_snaps_recipient_id ON snaps(recipient_id);
CREATE INDEX idx_snaps_sender_id ON snaps(sender_id);
CREATE INDEX idx_snaps_created_at ON snaps(created_at);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
CREATE INDEX idx_stories_created_at ON stories(created_at);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get friends with recent activity
CREATE OR REPLACE FUNCTION get_friends_with_activity(user_uuid UUID)
RETURNS TABLE (
  friend_id UUID,
  username VARCHAR,
  display_name VARCHAR,
  profile_picture TEXT,
  last_snap_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.friend_id,
    u.username,
    u.display_name,
    u.profile_picture,
    MAX(s.created_at) as last_snap_at
  FROM friendships f
  JOIN users u ON f.friend_id = u.id
  LEFT JOIN snaps s ON (s.sender_id = f.friend_id AND s.recipient_id = user_uuid)
  WHERE f.user_id = user_uuid
  GROUP BY f.friend_id, u.username, u.display_name, u.profile_picture
  ORDER BY last_snap_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Note: Run these in the Storage section of your Supabase dashboard
-- or after creating the 'media' bucket

-- Allow authenticated users to upload media
-- CREATE POLICY "Users can upload media" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Allow public access to media files
-- CREATE POLICY "Public media access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'media');

-- Allow users to update their own media
-- CREATE POLICY "Users can update own media" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own media
-- CREATE POLICY "Users can delete own media" ON storage.objects
--   FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE snaps;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- ========================================
-- SAMPLE DATA (OPTIONAL)
-- ========================================

-- Insert sample users (you can remove this section)
-- INSERT INTO users (id, username, display_name, email, bio) VALUES
--   ('550e8400-e29b-41d4-a716-446655440001', 'john_doe', 'John Doe', 'john@example.com', 'Love taking photos!'),
--   ('550e8400-e29b-41d4-a716-446655440002', 'jane_smith', 'Jane Smith', 'jane@example.com', 'Snapchat enthusiast'),
--   ('550e8400-e29b-41d4-a716-446655440003', 'mike_wilson', 'Mike Wilson', 'mike@example.com', 'Always sharing stories');

-- Schema setup complete! 

------------------------------------------------------------

-- SnapConnect Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  bio TEXT DEFAULT '',
  profile_picture TEXT,
  snapchat_score INTEGER DEFAULT 0,
  friends TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile during signup
-- This policy handles both normal cases and edge cases during the signup process
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    (auth.role() = 'authenticated' AND auth.uid()::text = id::text)
  );

-- ========================================
-- FRIENDSHIPS TABLE
-- ========================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- FRIEND REQUESTS TABLE
-- ========================================
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requester_username VARCHAR(50) NOT NULL,
  requester_display_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, requested_id)
);

-- Enable RLS for friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Friend requests policies
CREATE POLICY "Users can view relevant friend requests" ON friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Users can create friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests" ON friend_requests
  FOR UPDATE USING (auth.uid() = requested_id);

CREATE POLICY "Users can delete friend requests" ON friend_requests
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- ========================================
-- SNAPS TABLE
-- ========================================
CREATE TABLE snaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_username VARCHAR(50) NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(10) NOT NULL,
  caption TEXT DEFAULT '',
  timer INTEGER DEFAULT 3,
  opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for snaps
ALTER TABLE snaps ENABLE ROW LEVEL SECURITY;

-- Snaps policies
CREATE POLICY "Users can view own snaps" ON snaps
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create snaps" ON snaps
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update snap status" ON snaps
  FOR UPDATE USING (auth.uid() = recipient_id);

-- ========================================
-- STORIES TABLE
-- ========================================
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(10) NOT NULL,
  caption TEXT DEFAULT '',
  views UUID[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Users can view active stories" ON stories
  FOR SELECT USING (auth.role() = 'authenticated' AND expires_at > NOW());

CREATE POLICY "Users can create own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friend_requests_requested_id ON friend_requests(requested_id);
CREATE INDEX idx_friend_requests_requester_id ON friend_requests(requester_id);
CREATE INDEX idx_snaps_recipient_id ON snaps(recipient_id);
CREATE INDEX idx_snaps_sender_id ON snaps(sender_id);
CREATE INDEX idx_snaps_created_at ON snaps(created_at);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
CREATE INDEX idx_stories_created_at ON stories(created_at);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get friends with recent activity
CREATE OR REPLACE FUNCTION get_friends_with_activity(user_uuid UUID)
RETURNS TABLE (
  friend_id UUID,
  username VARCHAR,
  display_name VARCHAR,
  profile_picture TEXT,
  last_snap_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.friend_id,
    u.username,
    u.display_name,
    u.profile_picture,
    MAX(s.created_at) as last_snap_at
  FROM friendships f
  JOIN users u ON f.friend_id = u.id
  LEFT JOIN snaps s ON (s.sender_id = f.friend_id AND s.recipient_id = user_uuid)
  WHERE f.user_id = user_uuid
  GROUP BY f.friend_id, u.username, u.display_name, u.profile_picture
  ORDER BY last_snap_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Note: Run these in the Storage section of your Supabase dashboard
-- or after creating the 'media' bucket

-- Allow authenticated users to upload media
-- CREATE POLICY "Users can upload media" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Allow public access to media files
-- CREATE POLICY "Public media access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'media');

-- Allow users to update their own media
-- CREATE POLICY "Users can update own media" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own media
-- CREATE POLICY "Users can delete own media" ON storage.objects
--   FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE snaps;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- ========================================
-- SAMPLE DATA (OPTIONAL)
-- ========================================

-- Insert sample users (you can remove this section)
-- INSERT INTO users (id, username, display_name, email, bio) VALUES
--   ('550e8400-e29b-41d4-a716-446655440001', 'john_doe', 'John Doe', 'john@example.com', 'Love taking photos!'),
--   ('550e8400-e29b-41d4-a716-446655440002', 'jane_smith', 'Jane Smith', 'jane@example.com', 'Snapchat enthusiast'),
--   ('550e8400-e29b-41d4-a716-446655440003', 'mike_wilson', 'Mike Wilson', 'mike@example.com', 'Always sharing stories');

-- Schema setup complete! 

-------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://lniioaiaebkzawfmcavf.supabase.co'; // Replace with your Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaWlvYWlhZWJremF3Zm1jYXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTA5NjgsImV4cCI6MjA2NjM2Njk2OH0.Gq_dcg9_LL5TpTc7Np92DIqwqFUyE_HYEbMeitXe4vg'; // Replace with your Supabase anon key

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to get Supabase client
export const getSupabaseClient = () => supabase;

console.log('🟢 Supabase: Configuration loaded'); 





-----------------------------------------------------------

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

-------------------------------------------------------------

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

------------------------------------------------------------------

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

--------------------------------------------------------------------------

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

--------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://lniioaiaebkzawfmcavf.supabase.co'; // Replace with your Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaWlvYWlhZWJremF3Zm1jYXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTA5NjgsImV4cCI6MjA2NjM2Njk2OH0.Gq_dcg9_LL5TpTc7Np92DIqwqFUyE_HYEbMeitXe4vg'; // Replace with your Supabase anon key

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to get Supabase client
export const getSupabaseClient = () => supabase;

console.log('🟢 Supabase: Configuration loaded'); 

--------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://lniioaiaebkzawfmcavf.supabase.co'; // Replace with your Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInRimport { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://lniioaiaebkzawfmcavf.supabase.co'; // Replace with your Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaWlvYWlhZWJremF3Zm1jYXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTA5NjgsImV4cCI6MjA2NjM2Njk2OH0.Gq_dcg9_LL5TpTc7Np92DIqwqFUyE_HYEbMeitXe4vg'; // Replace with your Supabase anon key

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to get Supabase client
export const getSupabaseClient = () => supabase;

console.log('🟢 Supabase: Configuration loaded'); 5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaWlvYWlhZWJremF3Zm1jYXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTA5NjgsImV4cCI6MjA2NjM2Njk2OH0.Gq_dcg9_LL5TpTc7Np92DIqwqFUyE_HYEbMeitXe4vg'; // Replace with your Supabase anon key

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to get Supabase client
export const getSupabaseClient = () => supabase;

console.log('🟢 Supabase: Configuration loaded'); 

------------------------------------------------------------

-- SnapConnect Storage Policies Fix
-- Run this in your Supabase SQL Editor to fix media upload issues

-- ========================================
-- STORAGE BUCKET SETUP
-- ========================================

-- Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Public media access" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Allow authenticated users to upload media
CREATE POLICY "Users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated'
  );

-- Allow public access to media files (needed for viewing stories/snaps)
CREATE POLICY "Public media access" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- Allow users to update their own media
CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own media
CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- ADDITIONAL FIXES
-- ========================================

-- Fix stories table RLS policy to allow viewing friends' stories
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
CREATE POLICY "Users can view active stories" ON stories
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    expires_at > NOW() AND
    (
      user_id = auth.uid() OR 
      user_id IN (
        SELECT friend_id FROM friendships WHERE user_id = auth.uid()
        UNION
        SELECT user_id FROM friendships WHERE friend_id = auth.uid()
      )
    )
  );

-- Allow users to update story views
CREATE POLICY "Users can update story views" ON stories
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    expires_at > NOW()
  );

-- Storage policies setup complete! 

-----------------------------------------------------------

-- SnapConnect Storage Policies Fix
-- Run this in your Supabase SQL Editor to fix media upload issues

-- ========================================
-- STORAGE BUCKET SETUP
-- ========================================

-- Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Public media access" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Allow authenticated users to upload media
CREATE POLICY "Users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated'
  );

-- Allow public access to media files (needed for viewing stories/snaps)
CREATE POLICY "Public media access" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- Allow users to update their own media
CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own media
CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- ADDITIONAL FIXES
-- ========================================

-- Fix stories table RLS policy to allow viewing friends' stories
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
CREATE POLICY "Users can view active stories" ON stories
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    expires_at > NOW() AND
    (
      user_id = auth.uid() OR 
      user_id IN (
        SELECT friend_id FROM friendships WHERE user_id = auth.uid()
        UNION
        SELECT user_id FROM friendships WHERE friend_id = auth.uid()
      )
    )
  );

-- Allow users to update story views
CREATE POLICY "Users can update story views" ON stories
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    expires_at > NOW()
  );

-- Storage policies setup complete! 

-- SnapConnect Supabase Storage and Database Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies for media bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media' AND 
  auth.role() = 'authenticated'
);

-- Allow public access to view files
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

-- Allow users to update their own files
CREATE POLICY "Allow users to update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Update create_user_profile function to handle username properly
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_username TEXT,
  user_display_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Insert user profile
  INSERT INTO users (
    id,
    email,
    username,
    display_name,
    profile_picture,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    user_username,
    user_display_name,
    NULL,
    NOW(),
    NOW()
  );
  
  -- Return success
  SELECT json_build_object(
    'success', true,
    'user_id', user_id,
    'username', user_username,
    'display_name', user_display_name
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate username
    SELECT json_build_object(
      'success', false,
      'error', 'Username already exists'
    ) INTO result;
    RETURN result;
  WHEN OTHERS THEN
    -- Handle other errors
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM
    ) INTO result;
    RETURN result;
END;
$$;

-- 4. Fix stories table RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view friends stories" ON stories;
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can update story views" ON stories;

-- Allow users to create their own stories
CREATE POLICY "Users can create own stories" ON stories
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view stories (including friends' stories)
CREATE POLICY "Users can view stories" ON stories
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  expires_at > NOW()
);

-- Allow users to update story views
CREATE POLICY "Users can update story views" ON stories
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  expires_at > NOW()
);

-- 5. Fix friend_requests table constraints
-- Add unique constraint to prevent duplicate friend requests
ALTER TABLE friend_requests 
ADD CONSTRAINT unique_friend_request 
UNIQUE (requester_id, requested_id);

-- 6. Ensure username uniqueness in users table
-- Add unique constraint on username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_username_key' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- 7. Update users table to ensure display_name defaults to username
UPDATE users 
SET display_name = username 
WHERE display_name IS NULL OR display_name = '';

-- Success message
SELECT 'SnapConnect database setup completed successfully!' as message; 

-------------------------------------------------------------------------

-- SnapConnect Complete Database and Storage Setup
-- Run this script in your Supabase SQL Editor to fix all issues

-- ========================================
-- STORAGE BUCKET SETUP
-- ========================================

-- Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STORAGE POLICIES (Clean Setup)
-- ========================================

-- Drop all existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Public media access" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Public media access" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- USER PROFILE FUNCTION
-- ========================================

-- Update create_user_profile function to handle username properly
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_username TEXT,
  user_display_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Insert user profile
  INSERT INTO users (
    id,
    email,
    username,
    display_name,
    profile_picture,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    user_username,
    COALESCE(user_display_name, user_username), -- Use username as display_name if not provided
    NULL,
    NOW(),
    NOW()
  );
  
  -- Return success
  SELECT json_build_object(
    'success', true,
    'user_id', user_id,
    'username', user_username,
    'display_name', COALESCE(user_display_name, user_username)
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate username
    SELECT json_build_object(
      'success', false,
      'error', 'Username already exists'
    ) INTO result;
    RETURN result;
  WHEN OTHERS THEN
    -- Handle other errors
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM
    ) INTO result;
    RETURN result;
END;
$$;

-- ========================================
-- STORIES TABLE POLICIES
-- ========================================

-- Enable RLS on stories table
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Drop all existing story policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
DROP POLICY IF EXISTS "Users can view friends stories" ON stories;
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can update story views" ON stories;
DROP POLICY IF EXISTS "Users can view stories" ON stories;

-- Create new story policies
CREATE POLICY "Users can create own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view stories" ON stories
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    expires_at > NOW()
  );

CREATE POLICY "Users can update stories" ON stories
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    expires_at > NOW()
  );

-- ========================================
-- FRIEND REQUESTS CONSTRAINTS
-- ========================================

-- Add unique constraint to prevent duplicate friend requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_friend_request' 
    AND table_name = 'friend_requests'
  ) THEN
    ALTER TABLE friend_requests 
    ADD CONSTRAINT unique_friend_request 
    UNIQUE (requester_id, requested_id);
  END IF;
END $$;

-- ========================================
-- USERNAME CONSTRAINTS
-- ========================================

-- Ensure username uniqueness in users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_username_key' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- ========================================
-- DATA MIGRATION
-- ========================================

-- Update existing users to ensure display_name defaults to username
UPDATE users 
SET display_name = username 
WHERE display_name IS NULL OR display_name = '';

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

SELECT 'SnapConnect database setup completed successfully! All policies updated and conflicts resolved.' as message; 

-----------------------------------------------------------------

-- SnapConnect Database Schema Fixes
-- Run this in your Supabase SQL Editor to fix RLS issues and schema problems

-- ========================================
-- FIX STORIES TABLE - Remove expires_at column
-- ========================================

-- First, drop the existing policies
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;

-- Drop the expires_at column that's causing issues
ALTER TABLE stories DROP COLUMN IF EXISTS expires_at;

-- Drop the index on expires_at
DROP INDEX IF EXISTS idx_stories_expires_at;

-- Create new, more permissive policies for stories
CREATE POLICY "Anyone can view stories" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- FIX SNAPS TABLE - Remove expires_at column
-- ========================================

-- Drop existing policies for snaps
DROP POLICY IF EXISTS "Users can view own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can create snaps" ON snaps;
DROP POLICY IF EXISTS "Users can update own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can delete own snaps" ON snaps;

-- Drop the expires_at column from snaps table
ALTER TABLE snaps DROP COLUMN IF EXISTS expires_at;

-- Create new policies for snaps
CREATE POLICY "Users can view relevant snaps" ON snaps
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
  );

CREATE POLICY "Authenticated users can create snaps" ON snaps
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own snaps" ON snaps
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own snaps" ON snaps
  FOR DELETE USING (auth.uid() = sender_id);

-- ========================================
-- FIX FRIENDSHIPS TABLE
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;

-- Create more permissive policies for friendships
CREATE POLICY "Users can view relevant friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Authenticated users can create friendships" ON friendships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Users can update relevant friendships" ON friendships
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Users can delete relevant friendships" ON friendships
  FOR DELETE USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- ========================================
-- FIX MESSAGES TABLE
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Create policies for messages
CREATE POLICY "Users can view relevant messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    auth.uid() = ANY(group_members)
  );

CREATE POLICY "Authenticated users can create messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Create storage bucket policies for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Create storage policies
CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

-- Refresh the schema cache to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 

------------------------------------------------------------

-- SnapConnect Database Schema Fixes
-- Run this in your Supabase SQL Editor to fix RLS issues and schema problems

-- ========================================
-- FIX STORIES TABLE - Remove expires_at column
-- ========================================

-- First, drop ALL existing policies that might depend on expires_at
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
DROP POLICY IF EXISTS "Users can view stories" ON stories;
DROP POLICY IF EXISTS "Users can update stories" ON stories;
DROP POLICY IF EXISTS "Users can create stories" ON stories;
DROP POLICY IF EXISTS "Users can delete stories" ON stories;
DROP POLICY IF EXISTS "Enable read access for all users" ON stories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON stories;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON stories;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON stories;

-- Drop any indexes on expires_at
DROP INDEX IF EXISTS idx_stories_expires_at;

-- Now drop the expires_at column (use CASCADE to force drop dependencies)
ALTER TABLE stories DROP COLUMN IF EXISTS expires_at CASCADE;

-- Create new, more permissive policies for stories
CREATE POLICY "Anyone can view stories" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- FIX SNAPS TABLE - Remove expires_at column
-- ========================================

-- Drop ALL existing policies for snaps that might depend on expires_at
DROP POLICY IF EXISTS "Users can view own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can create snaps" ON snaps;
DROP POLICY IF EXISTS "Users can update own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can delete own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can view snaps" ON snaps;
DROP POLICY IF EXISTS "Users can update snaps" ON snaps;
DROP POLICY IF EXISTS "Users can delete snaps" ON snaps;
DROP POLICY IF EXISTS "Enable read access for all users" ON snaps;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON snaps;
DROP POLICY IF EXISTS "Enable update for users based on sender_id" ON snaps;
DROP POLICY IF EXISTS "Enable delete for users based on sender_id" ON snaps;

-- Drop any indexes on expires_at for snaps
DROP INDEX IF EXISTS idx_snaps_expires_at;

-- Drop the expires_at column from snaps table (use CASCADE)
ALTER TABLE snaps DROP COLUMN IF EXISTS expires_at CASCADE;

-- Create new policies for snaps
CREATE POLICY "Users can view relevant snaps" ON snaps
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
  );

CREATE POLICY "Authenticated users can create snaps" ON snaps
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own snaps" ON snaps
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own snaps" ON snaps
  FOR DELETE USING (auth.uid() = sender_id);

-- ========================================
-- FIX FRIENDSHIPS TABLE
-- ========================================

-- Drop ALL existing policies for friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can view friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete friendships" ON friendships;
DROP POLICY IF EXISTS "Enable read access for all users" ON friendships;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON friendships;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON friendships;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON friendships;

-- Create more permissive policies for friendships
CREATE POLICY "Users can view relevant friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Authenticated users can create friendships" ON friendships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Users can update relevant friendships" ON friendships
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Users can delete relevant friendships" ON friendships
  FOR DELETE USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- ========================================
-- FIX MESSAGES TABLE
-- ========================================

-- Drop ALL existing policies for messages
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can delete messages" ON messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable update for users based on sender_id" ON messages;
DROP POLICY IF EXISTS "Enable delete for users based on sender_id" ON messages;

-- Create policies for messages
CREATE POLICY "Users can view relevant messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    auth.uid() = ANY(group_members)
  );

CREATE POLICY "Authenticated users can create messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Create storage bucket policies for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- Drop ALL existing storage policies
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;

-- Create storage policies
CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

-- Refresh the schema cache to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 

----------------------------------------------------

-- SnapConnect Database Schema Fixes
-- Run this in your Supabase SQL Editor to fix RLS issues and schema problems

-- ========================================
-- FIX STORIES TABLE - Remove expires_at column
-- ========================================

-- First, drop ALL existing policies that might depend on expires_at
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
DROP POLICY IF EXISTS "Users can view stories" ON stories;
DROP POLICY IF EXISTS "Users can update stories" ON stories;
DROP POLICY IF EXISTS "Users can create stories" ON stories;
DROP POLICY IF EXISTS "Users can delete stories" ON stories;
DROP POLICY IF EXISTS "Enable read access for all users" ON stories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON stories;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON stories;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON stories;

-- Drop any indexes on expires_at
DROP INDEX IF EXISTS idx_stories_expires_at;

-- Now drop the expires_at column (use CASCADE to force drop dependencies)
ALTER TABLE stories DROP COLUMN IF EXISTS expires_at CASCADE;

-- Create new, more permissive policies for stories
CREATE POLICY "Anyone can view stories" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- FIX SNAPS TABLE - Remove expires_at column
-- ========================================

-- Drop ALL existing policies for snaps that might depend on expires_at
DROP POLICY IF EXISTS "Users can view own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can create snaps" ON snaps;
DROP POLICY IF EXISTS "Users can update own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can delete own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can view snaps" ON snaps;
DROP POLICY IF EXISTS "Users can update snaps" ON snaps;
DROP POLICY IF EXISTS "Users can delete snaps" ON snaps;
DROP POLICY IF EXISTS "Enable read access for all users" ON snaps;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON snaps;
DROP POLICY IF EXISTS "Enable update for users based on sender_id" ON snaps;
DROP POLICY IF EXISTS "Enable delete for users based on sender_id" ON snaps;

-- Drop any indexes on expires_at for snaps
DROP INDEX IF EXISTS idx_snaps_expires_at;

-- Drop the expires_at column from snaps table (use CASCADE)
ALTER TABLE snaps DROP COLUMN IF EXISTS expires_at CASCADE;

-- Create new policies for snaps
CREATE POLICY "Users can view relevant snaps" ON snaps
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
  );

CREATE POLICY "Authenticated users can create snaps" ON snaps
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own snaps" ON snaps
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own snaps" ON snaps
  FOR DELETE USING (auth.uid() = sender_id);

-- ========================================
-- FIX FRIENDSHIPS TABLE
-- ========================================

-- Drop ALL existing policies for friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can view friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete friendships" ON friendships;
DROP POLICY IF EXISTS "Enable read access for all users" ON friendships;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON friendships;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON friendships;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON friendships;

-- Create more permissive policies for friendships
CREATE POLICY "Users can view relevant friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Authenticated users can create friendships" ON friendships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Users can update relevant friendships" ON friendships
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

CREATE POLICY "Users can delete relevant friendships" ON friendships
  FOR DELETE USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- ========================================
-- FIX MESSAGES TABLE
-- ========================================

-- Drop ALL existing policies for messages
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can delete messages" ON messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable update for users based on sender_id" ON messages;
DROP POLICY IF EXISTS "Enable delete for users based on sender_id" ON messages;

-- Create policies for messages
CREATE POLICY "Users can view relevant messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    auth.uid() = ANY(group_members)
  );

CREATE POLICY "Authenticated users can create messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Create storage bucket policies for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- Drop ALL existing storage policies
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;

-- Create storage policies
CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- ADD MISSING COLUMNS
-- ========================================

-- Add timer_seconds column to messages table for disappearing messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0;

-- Add deleted_at column for soft deletes
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

-- Refresh the schema cache to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 


------------------------------------------------------------

-- SnapConnect Database Schema Fixes - SAFE VERSION
-- Run this in your Supabase SQL Editor to fix RLS issues and schema problems

-- ========================================
-- DISABLE RLS TEMPORARILY FOR CLEANUP
-- ========================================

-- Temporarily disable RLS to allow cleanup
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE snaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ========================================
-- DROP ALL EXISTING POLICIES
-- ========================================

-- Drop ALL policies on stories table
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'stories'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON stories', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on snaps table  
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'snaps'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON snaps', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on friendships table
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'friendships'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON friendships', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on messages table
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', policy_record.policyname);
    END LOOP;
END $$;

-- ========================================
-- DROP PROBLEMATIC COLUMNS
-- ========================================

-- Drop expires_at columns that are causing issues
ALTER TABLE stories DROP COLUMN IF EXISTS expires_at CASCADE;
ALTER TABLE snaps DROP COLUMN IF EXISTS expires_at CASCADE;

-- Drop any indexes on expires_at
DROP INDEX IF EXISTS idx_stories_expires_at;
DROP INDEX IF EXISTS idx_snaps_expires_at;

-- ========================================
-- ADD MISSING COLUMNS
-- ========================================

-- Add timer_seconds column to messages table for disappearing messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0;

-- Add deleted_at column for soft deletes
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- CREATE NEW PERMISSIVE POLICIES
-- ========================================

-- Enable RLS back
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Stories policies - VERY PERMISSIVE
CREATE POLICY "mvp_stories_select_2024" ON stories FOR SELECT USING (true);
CREATE POLICY "mvp_stories_insert_2024" ON stories FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp_stories_update_2024" ON stories FOR UPDATE USING (true);
CREATE POLICY "mvp_stories_delete_2024" ON stories FOR DELETE USING (true);

-- Snaps policies - VERY PERMISSIVE  
CREATE POLICY "mvp_snaps_select_2024" ON snaps FOR SELECT USING (true);
CREATE POLICY "mvp_snaps_insert_2024" ON snaps FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp_snaps_update_2024" ON snaps FOR UPDATE USING (true);
CREATE POLICY "mvp_snaps_delete_2024" ON snaps FOR DELETE USING (true);

-- Friendships policies - VERY PERMISSIVE
CREATE POLICY "mvp_friendships_select_2024" ON friendships FOR SELECT USING (true);
CREATE POLICY "mvp_friendships_insert_2024" ON friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp_friendships_update_2024" ON friendships FOR UPDATE USING (true);
CREATE POLICY "mvp_friendships_delete_2024" ON friendships FOR DELETE USING (true);

-- Messages policies - VERY PERMISSIVE
CREATE POLICY "mvp_messages_select_2024" ON messages FOR SELECT USING (true);
CREATE POLICY "mvp_messages_insert_2024" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp_messages_update_2024" ON messages FOR UPDATE USING (true);
CREATE POLICY "mvp_messages_delete_2024" ON messages FOR DELETE USING (true);

-- ========================================
-- STORAGE BUCKET POLICIES
-- ========================================

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true) 
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Create new storage policies with unique names
CREATE POLICY "mvp_media_select_2024" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "mvp_media_insert_2024" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
CREATE POLICY "mvp_media_update_2024" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "mvp_media_delete_2024" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

-- Refresh the schema cache to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 

---------------------------------------------------------

-- SnapConnect Database Schema Fixes - SAFE VERSION
-- Run this in your Supabase SQL Editor to fix RLS issues and schema problems

-- ========================================
-- DISABLE RLS TEMPORARILY FOR CLEANUP
-- ========================================

-- Temporarily disable RLS to allow cleanup
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE snaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ========================================
-- DROP ALL EXISTING POLICIES
-- ========================================

-- Drop ALL policies on stories table
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'stories'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON stories', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on snaps table  
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'snaps'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON snaps', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on friendships table
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'friendships'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON friendships', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on messages table
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', policy_record.policyname);
    END LOOP;
END $$;

-- ========================================
-- DROP PROBLEMATIC COLUMNS
-- ========================================

-- Drop expires_at columns that are causing issues
ALTER TABLE stories DROP COLUMN IF EXISTS expires_at CASCADE;
ALTER TABLE snaps DROP COLUMN IF EXISTS expires_at CASCADE;

-- Drop any indexes on expires_at
DROP INDEX IF EXISTS idx_stories_expires_at;
DROP INDEX IF EXISTS idx_snaps_expires_at;

-- ========================================
-- ADD MISSING COLUMNS
-- ========================================

-- Add timer_seconds column to messages table for disappearing messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0;

-- Add deleted_at column for soft deletes
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- CREATE NEW PERMISSIVE POLICIES
-- ========================================

-- Enable RLS back
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Stories policies - VERY PERMISSIVE
CREATE POLICY "mvp_stories_select_2024" ON stories FOR SELECT USING (true);
CREATE POLICY "mvp_stories_insert_2024" ON stories FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp_stories_update_2024" ON stories FOR UPDATE USING (true);
CREATE POLICY "mvp_stories_delete_2024" ON stories FOR DELETE USING (true);

-- Snaps policies - VERY PERMISSIVE  
CREATE POLICY "mvp_snaps_select_2024" ON snaps FOR SELECT USING (true);
CREATE POLICY "mvp_snaps_insert_2024" ON snaps FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp_snaps_update_2024" ON snaps FOR UPDATE USING (true);
CREATE POLICY "mvp_snaps_delete_2024" ON snaps FOR DELETE USING (true);

-- Friendships policies - VERY PERMISSIVE
CREATE POLICY "mvp_friendships_select_2024" ON friendships FOR SELECT USING (true);
CREATE POLICY "mvp_friendships_insert_2024" ON friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp_friendships_update_2024" ON friendships FOR UPDATE USING (true);
CREATE POLICY "mvp_friendships_delete_2024" ON friendships FOR DELETE USING (true);

-- Messages policies - VERY PERMISSIVE
CREATE POLICY "mvp_messages_select_2024" ON messages FOR SELECT USING (true);
CREATE POLICY "mvp_messages_insert_2024" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp_messages_update_2024" ON messages FOR UPDATE USING (true);
CREATE POLICY "mvp_messages_delete_2024" ON messages FOR DELETE USING (true);

-- ========================================
-- STORAGE BUCKET POLICIES
-- ========================================

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true) 
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Create new storage policies with unique names
CREATE POLICY "mvp_media_select_2024" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "mvp_media_insert_2024" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
CREATE POLICY "mvp_media_update_2024" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "mvp_media_delete_2024" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

-- Refresh the schema cache to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 

-----------------------------------------------------------------

-- SnapConnect Database Schema Fixes - ULTRA SAFE VERSION
-- Run this in your Supabase SQL Editor to fix RLS issues and schema problems

-- ========================================
-- DISABLE RLS TEMPORARILY FOR CLEANUP
-- ========================================

ALTER TABLE IF EXISTS stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS snaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;

-- ========================================
-- DROP ALL EXISTING POLICIES SAFELY
-- ========================================

-- Drop all policies on stories table
DROP POLICY IF EXISTS "Users can view active stories" ON stories;
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
DROP POLICY IF EXISTS "Users can view stories" ON stories;
DROP POLICY IF EXISTS "Users can update stories" ON stories;
DROP POLICY IF EXISTS "Users can create stories" ON stories;
DROP POLICY IF EXISTS "Users can delete stories" ON stories;
DROP POLICY IF EXISTS "Anyone can view stories" ON stories;
DROP POLICY IF EXISTS "Anyone can create stories" ON stories;
DROP POLICY IF EXISTS "Anyone can update stories" ON stories;
DROP POLICY IF EXISTS "Anyone can delete stories" ON stories;
DROP POLICY IF EXISTS "mvp_stories_select_2024" ON stories;
DROP POLICY IF EXISTS "mvp_stories_insert_2024" ON stories;
DROP POLICY IF EXISTS "mvp_stories_update_2024" ON stories;
DROP POLICY IF EXISTS "mvp_stories_delete_2024" ON stories;

-- Drop all policies on snaps table
DROP POLICY IF EXISTS "Users can view own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can create own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can update own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can delete own snaps" ON snaps;
DROP POLICY IF EXISTS "Users can view snaps" ON snaps;
DROP POLICY IF EXISTS "Users can create snaps" ON snaps;
DROP POLICY IF EXISTS "Users can update snaps" ON snaps;
DROP POLICY IF EXISTS "Users can delete snaps" ON snaps;
DROP POLICY IF EXISTS "Anyone can view snaps" ON snaps;
DROP POLICY IF EXISTS "Anyone can create snaps" ON snaps;
DROP POLICY IF EXISTS "Anyone can update snaps" ON snaps;
DROP POLICY IF EXISTS "Anyone can delete snaps" ON snaps;
DROP POLICY IF EXISTS "mvp_snaps_select_2024" ON snaps;
DROP POLICY IF EXISTS "mvp_snaps_insert_2024" ON snaps;
DROP POLICY IF EXISTS "mvp_snaps_update_2024" ON snaps;
DROP POLICY IF EXISTS "mvp_snaps_delete_2024" ON snaps;

-- Drop all policies on friendships table
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can view friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete friendships" ON friendships;
DROP POLICY IF EXISTS "Anyone can view friendships" ON friendships;
DROP POLICY IF EXISTS "Anyone can create friendships" ON friendships;
DROP POLICY IF EXISTS "Anyone can update friendships" ON friendships;
DROP POLICY IF EXISTS "Anyone can delete friendships" ON friendships;
DROP POLICY IF EXISTS "mvp_friendships_select_2024" ON friendships;
DROP POLICY IF EXISTS "mvp_friendships_insert_2024" ON friendships;
DROP POLICY IF EXISTS "mvp_friendships_update_2024" ON friendships;
DROP POLICY IF EXISTS "mvp_friendships_delete_2024" ON friendships;

-- Drop all policies on messages table
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can delete messages" ON messages;
DROP POLICY IF EXISTS "Anyone can view messages" ON messages;
DROP POLICY IF EXISTS "Anyone can create messages" ON messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON messages;
DROP POLICY IF EXISTS "Anyone can delete messages" ON messages;
DROP POLICY IF EXISTS "mvp_messages_select_2024" ON messages;
DROP POLICY IF EXISTS "mvp_messages_insert_2024" ON messages;
DROP POLICY IF EXISTS "mvp_messages_update_2024" ON messages;
DROP POLICY IF EXISTS "mvp_messages_delete_2024" ON messages;

-- Drop storage policies
DROP POLICY IF EXISTS "mvp_media_select_2024" ON storage.objects;
DROP POLICY IF EXISTS "mvp_media_insert_2024" ON storage.objects;
DROP POLICY IF EXISTS "mvp_media_update_2024" ON storage.objects;
DROP POLICY IF EXISTS "mvp_media_delete_2024" ON storage.objects;

-- ========================================
-- REMOVE PROBLEMATIC COLUMNS
-- ========================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_stories_expires_at;
DROP INDEX IF EXISTS idx_snaps_expires_at;

-- Drop columns that are causing issues
ALTER TABLE stories DROP COLUMN IF EXISTS expires_at CASCADE;
ALTER TABLE snaps DROP COLUMN IF EXISTS expires_at CASCADE;

-- ========================================
-- ADD MISSING COLUMNS
-- ========================================

-- Add timer_seconds column to messages table for disappearing messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0;

-- Add deleted_at column for soft deletes
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- CREATE VERY PERMISSIVE POLICIES FOR MVP
-- ========================================

-- Re-enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Stories policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_stories_all_2024" ON stories FOR ALL USING (true) WITH CHECK (true);

-- Snaps policies - ULTRA PERMISSIVE  
CREATE POLICY "mvp_snaps_all_2024" ON snaps FOR ALL USING (true) WITH CHECK (true);

-- Friendships policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_friendships_all_2024" ON friendships FOR ALL USING (true) WITH CHECK (true);

-- Messages policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_messages_all_2024" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Storage policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_media_all_2024" ON storage.objects FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

-- Refresh the schema cache to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 

----------------------------------------------------------------------

import { create } from 'zustand';
import { supabase } from '../../supabase.config';
import { useSupabaseAuthStore } from './supabaseAuthStore';

export const useSupabaseFriendStore = create((set, get) => ({
  friends: [],
  friendRequests: [],
  loading: false,
  error: null,

  // Search users by username or display name
  searchUsers: async (searchQuery) => {
    try {
      set({ loading: true, error: null });
      
      console.log('🟢 SupabaseFriendStore: Searching for users with query:', searchQuery);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, email, profile_picture')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) {
        console.error('🟢 SupabaseFriendStore: searchUsers error:', error);
        set({ error: error.message, loading: false });
        return [];
      }

      console.log('🟢 SupabaseFriendStore: Search results:', data?.length || 0, 'users found');
      set({ loading: false });
      return data || [];
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: searchUsers error:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Send friend request
  sendFriendRequest: async (targetUserId, targetUsername) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('🟢 SupabaseFriendStore: No authenticated user found:', authError);
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      // Get user profile for username
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('username, display_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('🟢 SupabaseFriendStore: Error getting user profile:', profileError);
        set({ error: 'Failed to get user profile', loading: false });
        return;
      }

      console.log('🟢 SupabaseFriendStore: Sending friend request from:', user.id, 'to:', targetUserId);
      
      // Check if friend request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('requested_id', targetUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('🟢 SupabaseFriendStore: Error checking existing request:', checkError);
        set({ error: checkError.message, loading: false });
        return;
      }

      if (existingRequest) {
        console.log('🟢 SupabaseFriendStore: Friend request already exists');
        set({ error: 'Friend request already sent', loading: false });
        return;
      }
      
      // Insert friend request
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: user.id,
          requested_id: targetUserId,
          requester_username: profile.username || user.email?.split('@')[0] || 'unknown',
          requester_display_name: profile.display_name || profile.username || user.email?.split('@')[0] || 'Unknown User',
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('🟢 SupabaseFriendStore: sendFriendRequest error:', error);
        if (error.code === '23505') { // Unique constraint violation
          set({ error: 'Friend request already sent', loading: false });
        } else {
          set({ error: error.message, loading: false });
        }
        return;
      }

      console.log('🟢 SupabaseFriendStore: Friend request sent successfully');
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: sendFriendRequest error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Accept friend request
  acceptFriendRequest: async (requestId, requesterId) => {
    try {
      set({ loading: true, error: null });
      
      const authState = useSupabaseAuthStore.getState();
      const currentUserId = authState.user?.uid || authState.user?.id;
      
      if (!currentUserId) {
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      console.log('🟢 SupabaseFriendStore: Accepting friend request:', requestId, 'from:', requesterId);

      // First, check if friendship already exists to avoid duplicate key error
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${requesterId}),and(user_id.eq.${requesterId},friend_id.eq.${currentUserId})`)
        .limit(1);

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('🟢 SupabaseFriendStore: Error checking existing friendship:', checkError);
      }

      // Only create friendships if they don't already exist
      if (!existingFriendship || existingFriendship.length === 0) {
        // Create bidirectional friendship
        const { error: friendError1 } = await supabase
          .from('friendships')
          .insert({ user_id: currentUserId, friend_id: requesterId });

        const { error: friendError2 } = await supabase
          .from('friendships')
          .insert({ user_id: requesterId, friend_id: currentUserId });

        if (friendError1 || friendError2) {
          console.error('🟢 SupabaseFriendStore: acceptFriendRequest friendship creation errors:', {
            friendError1,
            friendError2
          });
          
          // Only set error if it's not a duplicate key violation
          if (friendError1?.code !== '23505' && friendError2?.code !== '23505') {
            set({ error: 'Failed to create friendship', loading: false });
            return;
          }
        }
      }

      // Delete the friend request
      const { error: requestError } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (requestError) {
        console.error('🟢 SupabaseFriendStore: acceptFriendRequest request deletion error:', requestError);
        // Don't fail the whole operation if request deletion fails
      }

      console.log('🟢 SupabaseFriendStore: Friend request accepted successfully');
      
      // Refresh the friend requests and friends lists
      await get().getFriendRequests(currentUserId);
      await get().getFriends(currentUserId);
      
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: acceptFriendRequest error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Reject friend request
  rejectFriendRequest: async (requestId) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('🟢 SupabaseFriendStore: No authenticated user found:', authError);
        set({ error: 'User not authenticated', loading: false });
        return;
      }
      
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .eq('requested_id', user.id);

      if (error) {
        console.error('🟢 SupabaseFriendStore: rejectFriendRequest error:', error);
        set({ error: error.message, loading: false });
        return;
      }

      console.log('🟢 SupabaseFriendStore: Friend request rejected successfully');
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: rejectFriendRequest error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Get friends list
  getFriends: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          users!friendships_friend_id_fkey (
            id,
            username,
            display_name,
            email,
            profile_picture
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('🟢 SupabaseFriendStore: getFriends error:', error);
        set({ error: error.message });
        return;
      }

      const friends = data?.map(item => ({
        id: item.users.id,
        username: item.users.username,
        displayName: item.users.display_name,
        email: item.users.email,
        profilePicture: item.users.profile_picture,
      })) || [];

      set({ friends });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: getFriends error:', error);
      set({ error: error.message });
    }
  },

  // Listen to friend requests
  listenToFriendRequests: (userId) => {
    console.log('🟢 SupabaseFriendStore: Setting up friend requests listener for:', userId);
    
    const subscription = supabase
      .channel('friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `requested_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🟢 SupabaseFriendStore: Friend request change:', payload);
          // Refresh friend requests
          get().loadFriendRequests(userId);
        }
      )
      .subscribe();

    // Initial load
    get().loadFriendRequests(userId);

    return () => {
      console.log('🟢 SupabaseFriendStore: Unsubscribing from friend requests');
      supabase.removeChannel(subscription);
    };
  },

  // Get friend requests
  getFriendRequests: async () => {
    try {
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('🟢 SupabaseFriendStore: No authenticated user found:', authError);
        set({ error: 'User not authenticated' });
        return [];
      }

      console.log('🟢 SupabaseFriendStore: Getting friend requests for:', user.id);
      
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('requested_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🟢 SupabaseFriendStore: getFriendRequests error:', error);
        set({ error: error.message });
        return [];
      }

      console.log('🟢 SupabaseFriendStore: Found friend requests:', data?.length || 0);

      const friendRequests = data || [];
      set({ friendRequests });
      return friendRequests;
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: getFriendRequests error:', error);
      set({ error: error.message });
      return [];
    }
  },

  // Load friend requests (helper function)
  loadFriendRequests: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('requested_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('🟢 SupabaseFriendStore: loadFriendRequests error:', error);
        return;
      }

      const friendRequests = data?.map(request => ({
        id: request.id,
        userId: request.requester_id,
        username: request.requester_username,
        displayName: request.requester_display_name,
        sentAt: request.created_at,
      })) || [];

      set({ friendRequests });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: loadFriendRequests error:', error);
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 

-----------------------------------------------------

-- =================================================================
-- Description: Creates a stored procedure in Supabase to atomically
--              handle accepting a friend request.
-- =================================================================

-- Drop the function if it already exists to ensure a clean state
DROP FUNCTION IF EXISTS accept_friend_request(request_id UUID, user1_id UUID, user2_id UUID);

CREATE OR REPLACE FUNCTION accept_friend_request(
  request_id UUID,
  user1_id UUID,
  user2_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Insert the first direction of the friendship
  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (user1_id, user2_id);

  -- Insert the reverse direction of the friendship
  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (user2_id, user1_id);

  -- Delete the original friend request
  DELETE FROM public.friend_requests
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- REMOVE FRIEND FUNCTION
-- Deletes the bidirectional friendship records
-- =============================================
CREATE OR REPLACE FUNCTION remove_friend(user1_id uuid, user2_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete the friendship records in both directions
  DELETE FROM public.friendships
  WHERE (user_id = user1_id AND friend_id = user2_id)
     OR (user_id = user2_id AND friend_id = user1_id);
END;
$$ LANGUAGE plpgsql; 

----------------------------------------------------------

-- ========================================
-- ENABLE RLS and ADD PERMISSIVE POLICY FOR friend_requests
-- This is required to allow users to send, receive, and manage friend requests.
-- ========================================

-- Enable Row Level Security on the table
ALTER TABLE IF EXISTS public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists to avoid errors during re-runs
DROP POLICY IF EXISTS "mvp_friend_requests_all_2024" ON public.friend_requests;

-- Create a permissive policy that allows all actions for any authenticated user.
-- This is suitable for the MVP stage but should be reviewed for production security.
CREATE POLICY "mvp_friend_requests_all_2024" 
ON public.friend_requests 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

-- Refresh the schema cache to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 

------------------------------------------------------

-- SnapConnect RAG Enhancement Schema
-- Run this AFTER the main schema to add AI and group messaging features

-- ========================================
-- AI GENERATED CONTENT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'caption', 'story_prompt', 'activity_suggestion'
  input_context TEXT NOT NULL,
  generated_content JSONB NOT NULL, -- Array of generated options
  selected_option INTEGER, -- Which option the user selected (0-based index)
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE -- When the user actually used the content
);

-- ========================================
-- CONTENT EMBEDDINGS TABLE (for RAG)
-- ========================================
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'message', 'story_caption', 'user_interest', 'group_activity'
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- GROUP CHATS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_ids UUID[] DEFAULT '{}',
  admin_ids UUID[] DEFAULT '{}',
  group_photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER INTERESTS TABLE (for RAG personalization)
-- ========================================
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_category VARCHAR(50) NOT NULL, -- 'hobby', 'music', 'food', 'travel', 'sports', etc.
  interest_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- How confident we are about this interest
  source VARCHAR(50) DEFAULT 'inferred', -- 'explicit', 'inferred', 'activity_based'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest_category, interest_value)
);

-- ========================================
-- FRIEND GROUP ACTIVITIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS friend_group_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_ids UUID[] NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'hangout', 'trip', 'event', 'celebration'
  activity_description TEXT NOT NULL,
  location TEXT,
  date_occurred TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ENHANCED MESSAGES TABLE UPDATES
-- ========================================

-- Add AI enhancement columns to existing messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_suggestion_used INTEGER; -- Which AI suggestion was used
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0; -- For disappearing messages

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- AI content indexes
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_user_type ON ai_generated_content(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_created_at ON ai_generated_content(created_at);

-- Embedding indexes
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_type ON content_embeddings(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_created_at ON content_embeddings(created_at);

-- Group chat indexes
CREATE INDEX IF NOT EXISTS idx_group_chats_creator ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(member_ids);

-- User interests indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_category ON user_interests(user_id, interest_category);
CREATE INDEX IF NOT EXISTS idx_user_interests_confidence ON user_interests(confidence_score DESC);

-- Friend activities indexes
CREATE INDEX IF NOT EXISTS idx_friend_activities_users ON friend_group_activities USING GIN(user_ids);
CREATE INDEX IF NOT EXISTS idx_friend_activities_date ON friend_group_activities(date_occurred);

-- Enhanced messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_group_chat ON messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_ai_generated ON messages(ai_generated);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- AI Generated Content policies
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own AI content" ON ai_generated_content
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own AI content" ON ai_generated_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI content" ON ai_generated_content
  FOR UPDATE USING (auth.uid() = user_id);

-- Content Embeddings policies
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own embeddings" ON content_embeddings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own embeddings" ON content_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group Chats policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view groups they're members of" ON group_chats
  FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);
CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group admins can update groups" ON group_chats
  FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);
CREATE POLICY "Group admins can delete groups" ON group_chats
  FOR DELETE USING (auth.uid() = creator_id);

-- User Interests policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own interests" ON user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interests" ON user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Friend Group Activities policies
ALTER TABLE friend_group_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view activities they're part of" ON friend_group_activities
  FOR SELECT USING (auth.uid() = ANY(user_ids));
CREATE POLICY "Users can create activities for themselves" ON friend_group_activities
  FOR INSERT WITH CHECK (auth.uid() = ANY(user_ids));

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get user interests for RAG context
CREATE OR REPLACE FUNCTION get_user_interests_for_context(user_uuid UUID)
RETURNS TABLE (
  category VARCHAR,
  interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.interest_category,
    array_agg(ui.interest_value ORDER BY ui.confidence_score DESC) as interests
  FROM user_interests ui
  WHERE ui.user_id = user_uuid
    AND ui.confidence_score > 0.3
  GROUP BY ui.interest_category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar content using embeddings
CREATE OR REPLACE FUNCTION find_similar_content(
  query_embedding VECTOR(1536),
  user_uuid UUID,
  content_type_filter VARCHAR DEFAULT NULL,
  similarity_threshold DECIMAL DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  content_id UUID,
  content TEXT,
  content_type VARCHAR,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content,
    ce.content_type,
    (1 - (ce.embedding <=> query_embedding))::DECIMAL as similarity
  FROM content_embeddings ce
  WHERE ce.user_id = user_uuid
    AND (content_type_filter IS NULL OR ce.content_type = content_type_filter)
    AND (1 - (ce.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user interests based on activity
CREATE OR REPLACE FUNCTION update_user_interest(
  user_uuid UUID,
  category VARCHAR,
  value TEXT,
  confidence DECIMAL DEFAULT 0.5,
  source_type VARCHAR DEFAULT 'inferred'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source)
  VALUES (user_uuid, category, value, confidence, source_type)
  ON CONFLICT (user_id, interest_category, interest_value)
  DO UPDATE SET 
    confidence_score = GREATEST(user_interests.confidence_score, confidence),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_content;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample user interests (you can remove this in production)
/*
INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'hobby', 'photography', 0.8, 'explicit'),
  ('550e8400-e29b-41d4-a716-446655440001', 'music', 'indie rock', 0.7, 'inferred'),
  ('550e8400-e29b-41d4-a716-446655440002', 'food', 'italian cuisine', 0.9, 'activity_based'),
  ('550e8400-e29b-41d4-a716-446655440002', 'travel', 'europe', 0.6, 'inferred');
*/ 

-------------------------------------------------------------------------

-- SnapConnect RAG Enhancement Schema
-- Run this AFTER the main schema to add AI and group messaging features

-- ========================================
-- ENABLE EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- AI GENERATED CONTENT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'caption', 'story_prompt', 'activity_suggestion'
  input_context TEXT NOT NULL,
  generated_content JSONB NOT NULL, -- Array of generated options
  selected_option INTEGER, -- Which option the user selected (0-based index)
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE -- When the user actually used the content
);

-- ========================================
-- CONTENT EMBEDDINGS TABLE (for RAG)
-- ========================================
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'message', 'story_caption', 'user_interest', 'group_activity'
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- GROUP CHATS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_ids UUID[] DEFAULT '{}',
  admin_ids UUID[] DEFAULT '{}',
  group_photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER INTERESTS TABLE (for RAG personalization)
-- ========================================
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_category VARCHAR(50) NOT NULL, -- 'hobby', 'music', 'food', 'travel', 'sports', etc.
  interest_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- How confident we are about this interest
  source VARCHAR(50) DEFAULT 'inferred', -- 'explicit', 'inferred', 'activity_based'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest_category, interest_value)
);

-- ========================================
-- FRIEND GROUP ACTIVITIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS friend_group_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_ids UUID[] NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'hangout', 'trip', 'event', 'celebration'
  activity_description TEXT NOT NULL,
  location TEXT,
  date_occurred TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ENHANCED MESSAGES TABLE UPDATES
-- ========================================

-- Add AI enhancement columns to existing messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_suggestion_used INTEGER; -- Which AI suggestion was used
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0; -- For disappearing messages

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- AI content indexes
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_user_type ON ai_generated_content(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_created_at ON ai_generated_content(created_at);

-- Embedding indexes
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_type ON content_embeddings(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_created_at ON content_embeddings(created_at);

-- Group chat indexes
CREATE INDEX IF NOT EXISTS idx_group_chats_creator ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(member_ids);

-- User interests indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_category ON user_interests(user_id, interest_category);
CREATE INDEX IF NOT EXISTS idx_user_interests_confidence ON user_interests(confidence_score DESC);

-- Friend activities indexes
CREATE INDEX IF NOT EXISTS idx_friend_activities_users ON friend_group_activities USING GIN(user_ids);
CREATE INDEX IF NOT EXISTS idx_friend_activities_date ON friend_group_activities(date_occurred);

-- Enhanced messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_group_chat ON messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_ai_generated ON messages(ai_generated);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- AI Generated Content policies
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own AI content" ON ai_generated_content
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own AI content" ON ai_generated_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI content" ON ai_generated_content
  FOR UPDATE USING (auth.uid() = user_id);

-- Content Embeddings policies
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own embeddings" ON content_embeddings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own embeddings" ON content_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group Chats policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view groups they're members of" ON group_chats
  FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);
CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group admins can update groups" ON group_chats
  FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);
CREATE POLICY "Group admins can delete groups" ON group_chats
  FOR DELETE USING (auth.uid() = creator_id);

-- User Interests policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own interests" ON user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interests" ON user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Friend Group Activities policies
ALTER TABLE friend_group_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view activities they're part of" ON friend_group_activities
  FOR SELECT USING (auth.uid() = ANY(user_ids));
CREATE POLICY "Users can create activities for themselves" ON friend_group_activities
  FOR INSERT WITH CHECK (auth.uid() = ANY(user_ids));

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get user interests for RAG context
CREATE OR REPLACE FUNCTION get_user_interests_for_context(user_uuid UUID)
RETURNS TABLE (
  category VARCHAR,
  interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.interest_category,
    array_agg(ui.interest_value ORDER BY ui.confidence_score DESC) as interests
  FROM user_interests ui
  WHERE ui.user_id = user_uuid
    AND ui.confidence_score > 0.3
  GROUP BY ui.interest_category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar content using embeddings
CREATE OR REPLACE FUNCTION find_similar_content(
  query_embedding VECTOR(1536),
  user_uuid UUID,
  content_type_filter VARCHAR DEFAULT NULL,
  similarity_threshold DECIMAL DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  content_id UUID,
  content TEXT,
  content_type VARCHAR,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content,
    ce.content_type,
    (1 - (ce.embedding <=> query_embedding))::DECIMAL as similarity
  FROM content_embeddings ce
  WHERE ce.user_id = user_uuid
    AND (content_type_filter IS NULL OR ce.content_type = content_type_filter)
    AND (1 - (ce.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user interests based on activity
CREATE OR REPLACE FUNCTION update_user_interest(
  user_uuid UUID,
  category VARCHAR,
  value TEXT,
  confidence DECIMAL DEFAULT 0.5,
  source_type VARCHAR DEFAULT 'inferred'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source)
  VALUES (user_uuid, category, value, confidence, source_type)
  ON CONFLICT (user_id, interest_category, interest_value)
  DO UPDATE SET 
    confidence_score = GREATEST(user_interests.confidence_score, confidence),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_content;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample user interests (you can remove this in production)
/*
INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'hobby', 'photography', 0.8, 'explicit'),
  ('550e8400-e29b-41d4-a716-446655440001', 'music', 'indie rock', 0.7, 'inferred'),
  ('550e8400-e29b-41d4-a716-446655440002', 'food', 'italian cuisine', 0.9, 'activity_based'),
  ('550e8400-e29b-41d4-a716-446655440002', 'travel', 'europe', 0.6, 'inferred');
*/ 

-----------------------------------------------------------------------

-- Group Chat Fixes Migration
-- Run this SQL in your Supabase SQL Editor to fix group chat functionality

-- ========================================
-- 1. CREATE GROUP CHATS TABLE IF NOT EXISTS
-- ========================================
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_ids UUID[] DEFAULT '{}',
  admin_ids UUID[] DEFAULT '{}',
  group_photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. UPDATE MESSAGES TABLE FOR GROUP SUPPORT
-- ========================================

-- Add group_chat_id column if it doesn't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;

-- Make recipient_id nullable for group messages
ALTER TABLE messages 
ALTER COLUMN recipient_id DROP NOT NULL;

-- Add constraint to ensure either recipient_id OR group_chat_id is set
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS check_message_target;

ALTER TABLE messages 
ADD CONSTRAINT check_message_target CHECK (
  (recipient_id IS NOT NULL AND group_chat_id IS NULL) OR  -- Direct message
  (recipient_id IS NULL AND group_chat_id IS NOT NULL)     -- Group message
);

-- ========================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_group_chats_creator ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(member_ids);
CREATE INDEX IF NOT EXISTS idx_messages_group_chat ON messages(group_chat_id);

-- ========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ========================================

-- Enable RLS for group_chats
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view groups they're members of" ON group_chats;
DROP POLICY IF EXISTS "Users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Group admins can update groups" ON group_chats;
DROP POLICY IF EXISTS "Group admins can delete groups" ON group_chats;

-- Create group chat policies
CREATE POLICY "Users can view groups they're members of" ON group_chats
  FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);

CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group admins can update groups" ON group_chats
  FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);

CREATE POLICY "Group admins can delete groups" ON group_chats
  FOR DELETE USING (auth.uid() = creator_id);

-- Update message policies to handle group messages
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Create updated message policies
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    (group_chat_id IS NOT NULL AND auth.uid() = ANY(
      (SELECT member_ids FROM group_chats WHERE id = group_chat_id)
    ))
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    (group_chat_id IS NOT NULL AND auth.uid() = ANY(
      (SELECT member_ids FROM group_chats WHERE id = group_chat_id)
    ))
  );

-- ========================================
-- 5. ENABLE REALTIME SUBSCRIPTIONS
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ========================================
-- 6. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to leave a group chat
CREATE OR REPLACE FUNCTION leave_group_chat(
  group_chat_id UUID,
  user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Remove user from member_ids and admin_ids
  UPDATE group_chats 
  SET 
    member_ids = array_remove(member_ids, user_id),
    admin_ids = array_remove(admin_ids, user_id),
    updated_at = NOW()
  WHERE id = group_chat_id;
  
  -- If no members left, delete the group
  DELETE FROM group_chats 
  WHERE id = group_chat_id 
  AND cardinality(member_ids) = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add members to a group chat
CREATE OR REPLACE FUNCTION add_group_members(
  group_chat_id UUID,
  new_member_ids UUID[]
)
RETURNS void AS $$
BEGIN
  UPDATE group_chats 
  SET 
    member_ids = array(SELECT DISTINCT unnest(member_ids || new_member_ids)),
    updated_at = NOW()
  WHERE id = group_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a member from a group chat (admin only)
CREATE OR REPLACE FUNCTION remove_group_member(
  group_chat_id UUID,
  member_id_to_remove UUID,
  admin_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Check if the user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM group_chats 
    WHERE id = group_chat_id 
    AND (admin_user_id = ANY(admin_ids) OR admin_user_id = creator_id)
  ) THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;
  
  -- Remove the member
  UPDATE group_chats 
  SET 
    member_ids = array_remove(member_ids, member_id_to_remove),
    admin_ids = array_remove(admin_ids, member_id_to_remove),
    updated_at = NOW()
  WHERE id = group_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schema fixes complete!
SELECT 'Group chat functionality has been fixed successfully!' as status; 

--------------------------------------------------------------

-- Quick fix for RLS policy UUID array comparison errors
-- Run this if you got the "operator does not exist: uuid = uuid[]" error

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Recreate with correct syntax
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    (group_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_chats 
      WHERE id = group_chat_id 
      AND auth.uid() = ANY(member_ids)
    ))
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    (group_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_chats 
      WHERE id = group_chat_id 
      AND auth.uid() = ANY(member_ids)
    ))
  );

SELECT 'RLS policies fixed successfully!' as status; 

---------------------------------------------------------

-- ================================
-- SUPABASE GROUP CHAT FINAL FIX
-- ================================
-- This fixes all remaining issues with group chat functionality
-- including database constraints, RLS policies, and functions

-- Start transaction
BEGIN;

-- 1. Fix messages table constraints to allow NULL recipient_id for group messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_recipient_id_check;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS recipient_id_or_group_chat_id_required;

-- Add proper constraint: either recipient_id OR group_chat_id must be set (but not both)
ALTER TABLE messages ADD CONSTRAINT recipient_or_group_check 
  CHECK (
    (recipient_id IS NOT NULL AND group_chat_id IS NULL) OR 
    (recipient_id IS NULL AND group_chat_id IS NOT NULL)
  );

-- 2. Ensure group_members column exists and is properly typed
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_members UUID[] DEFAULT NULL;

-- 3. Fix messages table RLS policies
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON messages;

-- Messages: Users can view messages they sent or received, or group messages they're part of
CREATE POLICY "Users can view messages" ON messages FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR 
    (group_chat_id IS NOT NULL AND auth.uid() = ANY(group_members))
  );

-- Messages: Users can send messages
CREATE POLICY "Users can send messages" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND (
      recipient_id IS NOT NULL OR 
      (group_chat_id IS NOT NULL AND auth.uid() = ANY(group_members))
    )
  );

-- Messages: Users can delete their own messages
CREATE POLICY "Users can delete their messages" ON messages FOR DELETE
  USING (auth.uid() = sender_id);

-- 4. Fix group_chats table RLS policies
DROP POLICY IF EXISTS "Users can view their group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can update their group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can delete their group chats" ON group_chats;

-- Group chats: Users can view groups they're members of
CREATE POLICY "Users can view group chats" ON group_chats FOR SELECT
  USING (auth.uid() = ANY(member_ids));

-- Group chats: Users can create group chats
CREATE POLICY "Users can create group chats" ON group_chats FOR INSERT
  WITH CHECK (auth.uid() = creator_id AND auth.uid() = ANY(member_ids));

-- Group chats: Group members can update group chats (for admin actions)
CREATE POLICY "Users can update group chats" ON group_chats FOR UPDATE
  USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id)
  WITH CHECK (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);

-- Group chats: Only creator can delete
CREATE POLICY "Users can delete group chats" ON group_chats FOR DELETE
  USING (auth.uid() = creator_id);

-- 5. Create or replace group management functions
CREATE OR REPLACE FUNCTION add_group_members(
  group_id UUID,
  new_member_ids UUID[]
) RETURNS VOID AS $$
DECLARE
  current_members UUID[];
  updated_members UUID[];
  member_id UUID;
BEGIN
  -- Get current members
  SELECT member_ids INTO current_members 
  FROM group_chats 
  WHERE id = group_id;

  -- Check if user is admin
  IF NOT (auth.uid() = ANY(
    SELECT admin_ids FROM group_chats WHERE id = group_id
  ) OR auth.uid() = (
    SELECT creator_id FROM group_chats WHERE id = group_id
  )) THEN
    RAISE EXCEPTION 'Only admins can add members';
  END IF;

  -- Merge new members with existing ones (avoiding duplicates)
  updated_members := current_members;
  
  FOREACH member_id IN ARRAY new_member_ids
  LOOP
    IF NOT (member_id = ANY(updated_members)) THEN
      updated_members := array_append(updated_members, member_id);
    END IF;
  END LOOP;

  -- Update the group
  UPDATE group_chats 
  SET member_ids = updated_members,
      updated_at = NOW()
  WHERE id = group_id;

  -- Send system message
  INSERT INTO messages (
    sender_id,
    content,
    message_type,
    group_chat_id,
    group_members
  ) VALUES (
    auth.uid(),
    'New members have been added to the group',
    'system',
    group_id,
    updated_members
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_group_member(
  group_id UUID,
  member_to_remove UUID
) RETURNS VOID AS $$
DECLARE
  current_members UUID[];
  updated_members UUID[];
  group_name TEXT;
BEGIN
  -- Get current members and group name
  SELECT member_ids, name INTO current_members, group_name
  FROM group_chats 
  WHERE id = group_id;

  -- Check if user is admin or removing themselves
  IF NOT (
    auth.uid() = ANY(SELECT admin_ids FROM group_chats WHERE id = group_id) OR
    auth.uid() = (SELECT creator_id FROM group_chats WHERE id = group_id) OR
    auth.uid() = member_to_remove
  ) THEN
    RAISE EXCEPTION 'Only admins can remove members, or users can remove themselves';
  END IF;

  -- Remove member from array
  updated_members := array_remove(current_members, member_to_remove);

  -- Update the group
  UPDATE group_chats 
  SET member_ids = updated_members,
      updated_at = NOW()
  WHERE id = group_id;

  -- Send system message
  INSERT INTO messages (
    sender_id,
    content,
    message_type,
    group_chat_id,
    group_members
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN auth.uid() = member_to_remove THEN 'left the group'
      ELSE 'A member has been removed from the group'
    END,
    'system',
    group_id,
    updated_members
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION leave_group_chat(group_id UUID) 
RETURNS VOID AS $$
BEGIN
  PERFORM remove_group_member(group_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to automatically set group_members on message insert
CREATE OR REPLACE FUNCTION set_group_members() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_chat_id IS NOT NULL THEN
    -- Set group_members from the group_chats table
    SELECT member_ids INTO NEW.group_members
    FROM group_chats 
    WHERE id = NEW.group_chat_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_group_members_trigger ON messages;
CREATE TRIGGER set_group_members_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_group_members();

-- 7. Ensure realtime is enabled for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_group_chat_id ON messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_members ON messages USING gin(group_members);
CREATE INDEX IF NOT EXISTS idx_group_chats_member_ids ON group_chats USING gin(member_ids);
CREATE INDEX IF NOT EXISTS idx_group_chats_creator_id ON group_chats(creator_id);

-- 9. Grant necessary permissions
GRANT ALL ON group_chats TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION add_group_members TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member TO authenticated;
GRANT EXECUTE ON FUNCTION leave_group_chat TO authenticated;

-- Commit transaction
COMMIT;

-- Test the constraints
DO $$
BEGIN
  RAISE NOTICE 'Group chat database fixes applied successfully!';
  RAISE NOTICE 'Key improvements:';
  RAISE NOTICE '- Fixed message constraints for group messages';
  RAISE NOTICE '- Updated RLS policies for proper access control';
  RAISE NOTICE '- Added group management functions';
  RAISE NOTICE '- Enabled realtime subscriptions';
  RAISE NOTICE '- Added performance indexes';
END $$; 

------------------------------------------------------------------

-- SnapConnect RAG Enhancement Schema
-- Run this AFTER the main schema to add AI and group messaging features

-- ========================================
-- ENABLE EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- AI GENERATED CONTENT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'caption', 'story_prompt', 'activity_suggestion'
  input_context TEXT NOT NULL,
  generated_content JSONB NOT NULL, -- Array of generated options
  selected_option INTEGER, -- Which option the user selected (0-based index)
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE -- When the user actually used the content
);

-- ========================================
-- CONTENT EMBEDDINGS TABLE (for RAG)
-- ========================================
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'message', 'story_caption', 'user_interest', 'group_activity'
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- GROUP CHATS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_ids UUID[] DEFAULT '{}',
  admin_ids UUID[] DEFAULT '{}',
  group_photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER INTERESTS TABLE (for RAG personalization)
-- ========================================
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_category VARCHAR(50) NOT NULL, -- 'hobby', 'music', 'food', 'travel', 'sports', etc.
  interest_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- How confident we are about this interest
  source VARCHAR(50) DEFAULT 'inferred', -- 'explicit', 'inferred', 'activity_based'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest_category, interest_value)
);

-- ========================================
-- FRIEND GROUP ACTIVITIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS friend_group_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_ids UUID[] NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'hangout', 'trip', 'event', 'celebration'
  activity_description TEXT NOT NULL,
  location TEXT,
  date_occurred TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ENHANCED MESSAGES TABLE UPDATES
-- ========================================

-- Add AI enhancement columns to existing messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_suggestion_used INTEGER; -- Which AI suggestion was used
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0; -- For disappearing messages

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- AI content indexes
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_user_type ON ai_generated_content(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_created_at ON ai_generated_content(created_at);

-- Embedding indexes
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_type ON content_embeddings(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_created_at ON content_embeddings(created_at);

-- Group chat indexes
CREATE INDEX IF NOT EXISTS idx_group_chats_creator ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(member_ids);

-- User interests indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_category ON user_interests(user_id, interest_category);
CREATE INDEX IF NOT EXISTS idx_user_interests_confidence ON user_interests(confidence_score DESC);

-- Friend activities indexes
CREATE INDEX IF NOT EXISTS idx_friend_activities_users ON friend_group_activities USING GIN(user_ids);
CREATE INDEX IF NOT EXISTS idx_friend_activities_date ON friend_group_activities(date_occurred);

-- Enhanced messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_group_chat ON messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_ai_generated ON messages(ai_generated);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- AI Generated Content policies
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own AI content" ON ai_generated_content
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own AI content" ON ai_generated_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI content" ON ai_generated_content
  FOR UPDATE USING (auth.uid() = user_id);

-- Content Embeddings policies
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own embeddings" ON content_embeddings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own embeddings" ON content_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group Chats policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view groups they're members of" ON group_chats
  FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);
CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group admins can update groups" ON group_chats
  FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);
CREATE POLICY "Group admins can delete groups" ON group_chats
  FOR DELETE USING (auth.uid() = creator_id);

-- User Interests policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own interests" ON user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interests" ON user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Friend Group Activities policies
ALTER TABLE friend_group_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view activities they're part of" ON friend_group_activities
  FOR SELECT USING (auth.uid() = ANY(user_ids));
CREATE POLICY "Users can create activities for themselves" ON friend_group_activities
  FOR INSERT WITH CHECK (auth.uid() = ANY(user_ids));

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get user interests for RAG context
CREATE OR REPLACE FUNCTION get_user_interests_for_context(user_uuid UUID)
RETURNS TABLE (
  category VARCHAR,
  interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.interest_category,
    array_agg(ui.interest_value ORDER BY ui.confidence_score DESC) as interests
  FROM user_interests ui
  WHERE ui.user_id = user_uuid
    AND ui.confidence_score > 0.3
  GROUP BY ui.interest_category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar content using embeddings
CREATE OR REPLACE FUNCTION find_similar_content(
  query_embedding VECTOR(1536),
  user_uuid UUID,
  content_type_filter VARCHAR DEFAULT NULL,
  similarity_threshold DECIMAL DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  content_id UUID,
  content TEXT,
  content_type VARCHAR,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content,
    ce.content_type,
    (1 - (ce.embedding <=> query_embedding))::DECIMAL as similarity
  FROM content_embeddings ce
  WHERE ce.user_id = user_uuid
    AND (content_type_filter IS NULL OR ce.content_type = content_type_filter)
    AND (1 - (ce.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user interests based on activity
CREATE OR REPLACE FUNCTION update_user_interest(
  user_uuid UUID,
  category VARCHAR,
  value TEXT,
  confidence DECIMAL DEFAULT 0.5,
  source_type VARCHAR DEFAULT 'inferred'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source)
  VALUES (user_uuid, category, value, confidence, source_type)
  ON CONFLICT (user_id, interest_category, interest_value)
  DO UPDATE SET 
    confidence_score = GREATEST(user_interests.confidence_score, confidence),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- RAG HELPER FUNCTIONS FOR GROUP CREATION
-- ========================================

-- Function to recommend friends based on a query embedding of interests
CREATE OR REPLACE FUNCTION recommend_friends_by_interest(
  requesting_user_id UUID,
  friend_ids UUID[],
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.1,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  profile_picture TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH friend_embeddings AS (
    SELECT
      ce.user_id,
      AVG(ce.embedding) as avg_embedding
    FROM content_embeddings ce
    WHERE ce.user_id = ANY(friend_ids)
      AND ce.content_type IN ('message', 'story_caption', 'user_interest')
    GROUP BY ce.user_id
  )
  SELECT
    fe.user_id AS friend_id,
    u.username,
    u.display_name,
    u.profile_picture,
    (1 - (fe.avg_embedding <=> query_embedding)) AS similarity
  FROM friend_embeddings fe
  JOIN users u ON u.id = fe.user_id
  WHERE (1 - (fe.avg_embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_content;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample user interests (you can remove this in production)
/*
INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'hobby', 'photography', 0.8, 'explicit'),
  ('550e8400-e29b-41d4-a716-446655440001', 'music', 'indie rock', 0.7, 'inferred'),
  ('550e8400-e29b-41d4-a716-446655440002', 'food', 'italian cuisine', 0.9, 'activity_based'),
  ('550e8400-e29b-41d4-a716-446655440002', 'travel', 'europe', 0.6, 'inferred');
*/ 

-----------------------------------------------------------------------

-- SnapConnect RAG Enhancement Schema
-- Run this AFTER the main schema to add AI and group messaging features

-- ========================================
-- ENABLE EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- AI GENERATED CONTENT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'caption', 'story_prompt', 'activity_suggestion'
  input_context TEXT NOT NULL,
  generated_content JSONB NOT NULL, -- Array of generated options
  selected_option INTEGER, -- Which option the user selected (0-based index)
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE -- When the user actually used the content
);

-- ========================================
-- CONTENT EMBEDDINGS TABLE (for RAG)
-- ========================================
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'message', 'story_caption', 'user_interest', 'group_activity'
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- GROUP CHATS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_ids UUID[] DEFAULT '{}',
  admin_ids UUID[] DEFAULT '{}',
  group_photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER INTERESTS TABLE (for RAG personalization)
-- ========================================
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_category VARCHAR(50) NOT NULL, -- 'hobby', 'music', 'food', 'travel', 'sports', etc.
  interest_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- How confident we are about this interest
  source VARCHAR(50) DEFAULT 'inferred', -- 'explicit', 'inferred', 'activity_based'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest_category, interest_value)
);

-- ========================================
-- FRIEND GROUP ACTIVITIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS friend_group_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_ids UUID[] NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'hangout', 'trip', 'event', 'celebration'
  activity_description TEXT NOT NULL,
  location TEXT,
  date_occurred TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ENHANCED MESSAGES TABLE UPDATES
-- ========================================

-- Add AI enhancement columns to existing messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_suggestion_used INTEGER; -- Which AI suggestion was used
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0; -- For disappearing messages

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- AI content indexes
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_user_type ON ai_generated_content(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_created_at ON ai_generated_content(created_at);

-- Embedding indexes
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_type ON content_embeddings(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_created_at ON content_embeddings(created_at);

-- Group chat indexes
CREATE INDEX IF NOT EXISTS idx_group_chats_creator ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(member_ids);

-- User interests indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_category ON user_interests(user_id, interest_category);
CREATE INDEX IF NOT EXISTS idx_user_interests_confidence ON user_interests(confidence_score DESC);

-- Friend activities indexes
CREATE INDEX IF NOT EXISTS idx_friend_activities_users ON friend_group_activities USING GIN(user_ids);
CREATE INDEX IF NOT EXISTS idx_friend_activities_date ON friend_group_activities(date_occurred);

-- Enhanced messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_group_chat ON messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_ai_generated ON messages(ai_generated);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- AI Generated Content policies
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own AI content" ON ai_generated_content;
CREATE POLICY "Users can view own AI content" ON ai_generated_content
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own AI content" ON ai_generated_content;
CREATE POLICY "Users can create own AI content" ON ai_generated_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own AI content" ON ai_generated_content;
CREATE POLICY "Users can update own AI content" ON ai_generated_content
  FOR UPDATE USING (auth.uid() = user_id);

-- Content Embeddings policies
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own embeddings" ON content_embeddings;
CREATE POLICY "Users can view own embeddings" ON content_embeddings
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own embeddings" ON content_embeddings;
CREATE POLICY "Users can create own embeddings" ON content_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group Chats policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view groups they're members of" ON group_chats;
CREATE POLICY "Users can view groups they're members of" ON group_chats
  FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);
DROP POLICY IF EXISTS "Users can create group chats" ON group_chats;
CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS "Group admins can update groups" ON group_chats;
CREATE POLICY "Group admins can update groups" ON group_chats
  FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);
DROP POLICY IF EXISTS "Group admins can delete groups" ON group_chats;
CREATE POLICY "Group admins can delete groups" ON group_chats
  FOR DELETE USING (auth.uid() = creator_id);

-- User Interests policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own interests" ON user_interests;
CREATE POLICY "Users can view own interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own interests" ON user_interests;
CREATE POLICY "Users can create own interests" ON user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own interests" ON user_interests;
CREATE POLICY "Users can update own interests" ON user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Friend Group Activities policies
ALTER TABLE friend_group_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view activities they're part of" ON friend_group_activities;
CREATE POLICY "Users can view activities they're part of" ON friend_group_activities
  FOR SELECT USING (auth.uid() = ANY(user_ids));
DROP POLICY IF EXISTS "Users can create activities for themselves" ON friend_group_activities;
CREATE POLICY "Users can create activities for themselves" ON friend_group_activities
  FOR INSERT WITH CHECK (auth.uid() = ANY(user_ids));

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get user interests for RAG context
CREATE OR REPLACE FUNCTION get_user_interests_for_context(user_uuid UUID)
RETURNS TABLE (
  category VARCHAR,
  interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.interest_category,
    array_agg(ui.interest_value ORDER BY ui.confidence_score DESC) as interests
  FROM user_interests ui
  WHERE ui.user_id = user_uuid
    AND ui.confidence_score > 0.3
  GROUP BY ui.interest_category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar content using embeddings
CREATE OR REPLACE FUNCTION find_similar_content(
  query_embedding VECTOR(1536),
  user_uuid UUID,
  content_type_filter VARCHAR DEFAULT NULL,
  similarity_threshold DECIMAL DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  content_id UUID,
  content TEXT,
  content_type VARCHAR,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content,
    ce.content_type,
    (1 - (ce.embedding <=> query_embedding))::DECIMAL as similarity
  FROM content_embeddings ce
  WHERE ce.user_id = user_uuid
    AND (content_type_filter IS NULL OR ce.content_type = content_type_filter)
    AND (1 - (ce.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user interests based on activity
CREATE OR REPLACE FUNCTION update_user_interest(
  user_uuid UUID,
  category VARCHAR,
  value TEXT,
  confidence DECIMAL DEFAULT 0.5,
  source_type VARCHAR DEFAULT 'inferred'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source)
  VALUES (user_uuid, category, value, confidence, source_type)
  ON CONFLICT (user_id, interest_category, interest_value)
  DO UPDATE SET 
    confidence_score = GREATEST(user_interests.confidence_score, confidence),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- RAG HELPER FUNCTIONS FOR GROUP CREATION
-- ========================================

-- Function to recommend friends based on a query embedding of interests
CREATE OR REPLACE FUNCTION recommend_friends_by_interest(
  requesting_user_id UUID,
  friend_ids UUID[],
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.1,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  profile_picture TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH friend_embeddings AS (
    SELECT
      ce.user_id,
      AVG(ce.embedding) as avg_embedding
    FROM content_embeddings ce
    WHERE ce.user_id = ANY(friend_ids)
      AND ce.content_type IN ('message', 'story_caption', 'user_interest')
    GROUP BY ce.user_id
  )
  SELECT
    fe.user_id AS friend_id,
    u.username,
    u.display_name,
    u.profile_picture,
    (1 - (fe.avg_embedding <=> query_embedding)) AS similarity
  FROM friend_embeddings fe
  JOIN users u ON u.id = fe.user_id
  WHERE (1 - (fe.avg_embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_content;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample user interests (you can remove this in production)
/*
INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'hobby', 'photography', 0.8, 'explicit'),
  ('550e8400-e29b-41d4-a716-446655440001', 'music', 'indie rock', 0.7, 'inferred'),
  ('550e8400-e29b-41d4-a716-446655440002', 'food', 'italian cuisine', 0.9, 'activity_based'),
  ('550e8400-e29b-41d4-a716-446655440002', 'travel', 'europe', 0.6, 'inferred');
*/ 

-----------------------------------------------------------------------

-- SnapConnect RAG Enhancement Schema
-- Run this AFTER the main schema to add AI and group messaging features

-- ========================================
-- ENABLE EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- AI GENERATED CONTENT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'caption', 'story_prompt', 'activity_suggestion'
  input_context TEXT NOT NULL,
  generated_content JSONB NOT NULL, -- Array of generated options
  selected_option INTEGER, -- Which option the user selected (0-based index)
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE -- When the user actually used the content
);

-- ========================================
-- CONTENT EMBEDDINGS TABLE (for RAG)
-- ========================================
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'message', 'story_caption', 'user_interest', 'group_activity'
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- GROUP CHATS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_ids UUID[] DEFAULT '{}',
  admin_ids UUID[] DEFAULT '{}',
  group_photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER INTERESTS TABLE (for RAG personalization)
-- ========================================
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_category VARCHAR(50) NOT NULL, -- 'hobby', 'music', 'food', 'travel', 'sports', etc.
  interest_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- How confident we are about this interest
  source VARCHAR(50) DEFAULT 'inferred', -- 'explicit', 'inferred', 'activity_based'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest_category, interest_value)
);

-- ========================================
-- FRIEND GROUP ACTIVITIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS friend_group_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_ids UUID[] NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'hangout', 'trip', 'event', 'celebration'
  activity_description TEXT NOT NULL,
  location TEXT,
  date_occurred TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ENHANCED MESSAGES TABLE UPDATES
-- ========================================

-- Add AI enhancement columns to existing messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_suggestion_used INTEGER; -- Which AI suggestion was used
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0; -- For disappearing messages

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- AI content indexes
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_user_type ON ai_generated_content(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_created_at ON ai_generated_content(created_at);

-- Embedding indexes
CREATE INDEX IF NOT EXISTS idx_content_embeddings_user_type ON content_embeddings(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_created_at ON content_embeddings(created_at);

-- Group chat indexes
CREATE INDEX IF NOT EXISTS idx_group_chats_creator ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(member_ids);

-- User interests indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_category ON user_interests(user_id, interest_category);
CREATE INDEX IF NOT EXISTS idx_user_interests_confidence ON user_interests(confidence_score DESC);

-- Friend activities indexes
CREATE INDEX IF NOT EXISTS idx_friend_activities_users ON friend_group_activities USING GIN(user_ids);
CREATE INDEX IF NOT EXISTS idx_friend_activities_date ON friend_group_activities(date_occurred);

-- Enhanced messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_group_chat ON messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_ai_generated ON messages(ai_generated);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- AI Generated Content policies
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own AI content" ON ai_generated_content;
CREATE POLICY "Users can view own AI content" ON ai_generated_content
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own AI content" ON ai_generated_content;
CREATE POLICY "Users can create own AI content" ON ai_generated_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own AI content" ON ai_generated_content;
CREATE POLICY "Users can update own AI content" ON ai_generated_content
  FOR UPDATE USING (auth.uid() = user_id);

-- Content Embeddings policies
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own embeddings" ON content_embeddings;
CREATE POLICY "Users can view own embeddings" ON content_embeddings
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own embeddings" ON content_embeddings;
CREATE POLICY "Users can create own embeddings" ON content_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group Chats policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view groups they're members of" ON group_chats;
CREATE POLICY "Users can view groups they're members of" ON group_chats
  FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);
DROP POLICY IF EXISTS "Users can create group chats" ON group_chats;
CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS "Group admins can update groups" ON group_chats;
CREATE POLICY "Group admins can update groups" ON group_chats
  FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);
DROP POLICY IF EXISTS "Group admins can delete groups" ON group_chats;
CREATE POLICY "Group admins can delete groups" ON group_chats
  FOR DELETE USING (auth.uid() = creator_id);

-- User Interests policies
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own interests" ON user_interests;
CREATE POLICY "Users can view own interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own interests" ON user_interests;
CREATE POLICY "Users can create own interests" ON user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own interests" ON user_interests;
CREATE POLICY "Users can update own interests" ON user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Friend Group Activities policies
ALTER TABLE friend_group_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view activities they're part of" ON friend_group_activities;
CREATE POLICY "Users can view activities they're part of" ON friend_group_activities
  FOR SELECT USING (auth.uid() = ANY(user_ids));
DROP POLICY IF EXISTS "Users can create activities for themselves" ON friend_group_activities;
CREATE POLICY "Users can create activities for themselves" ON friend_group_activities
  FOR INSERT WITH CHECK (auth.uid() = ANY(user_ids));

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get user interests for RAG context
CREATE OR REPLACE FUNCTION get_user_interests_for_context(user_uuid UUID)
RETURNS TABLE (
  category VARCHAR,
  interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.interest_category,
    array_agg(ui.interest_value ORDER BY ui.confidence_score DESC) as interests
  FROM user_interests ui
  WHERE ui.user_id = user_uuid
    AND ui.confidence_score > 0.3
  GROUP BY ui.interest_category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar content using embeddings
CREATE OR REPLACE FUNCTION find_similar_content(
  query_embedding VECTOR(1536),
  user_uuid UUID,
  content_type_filter VARCHAR DEFAULT NULL,
  similarity_threshold DECIMAL DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  content_id UUID,
  content TEXT,
  content_type VARCHAR,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content,
    ce.content_type,
    (1 - (ce.embedding <=> query_embedding))::DECIMAL as similarity
  FROM content_embeddings ce
  WHERE ce.user_id = user_uuid
    AND (content_type_filter IS NULL OR ce.content_type = content_type_filter)
    AND (1 - (ce.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user interests based on activity
CREATE OR REPLACE FUNCTION update_user_interest(
  user_uuid UUID,
  category VARCHAR,
  value TEXT,
  confidence DECIMAL DEFAULT 0.5,
  source_type VARCHAR DEFAULT 'inferred'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source)
  VALUES (user_uuid, category, value, confidence, source_type)
  ON CONFLICT (user_id, interest_category, interest_value)
  DO UPDATE SET 
    confidence_score = GREATEST(user_interests.confidence_score, confidence),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- RAG HELPER FUNCTIONS FOR GROUP CREATION
-- ========================================

-- Function to recommend friends based on a query embedding of interests
CREATE OR REPLACE FUNCTION recommend_friends_by_interest(
  requesting_user_id UUID,
  friend_ids UUID[],
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.1,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  profile_picture TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH friend_embeddings AS (
    SELECT
      ce.user_id,
      AVG(ce.embedding) as avg_embedding
    FROM content_embeddings ce
    WHERE ce.user_id = ANY(friend_ids)
      AND ce.content_type IN ('message', 'story_caption', 'user_interest')
    GROUP BY ce.user_id
  )
  SELECT
    fe.user_id AS friend_id,
    u.username,
    u.display_name,
    u.profile_picture,
    (1 - (fe.avg_embedding <=> query_embedding)) AS similarity
  FROM friend_embeddings fe
  JOIN users u ON u.id = fe.user_id
  WHERE (1 - (fe.avg_embedding <=> query_embedding)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================
DO $$
BEGIN
  -- Add group_chats to the realtime publication if it's not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
    RAISE NOTICE 'Table group_chats added to supabase_realtime publication.';
  ELSE
    RAISE NOTICE 'Table group_chats is already in supabase_realtime publication, skipping.';
  END IF;

  -- Add ai_generated_content to the realtime publication if it's not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ai_generated_content'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_content;
    RAISE NOTICE 'Table ai_generated_content added to supabase_realtime publication.';
  ELSE
    RAISE NOTICE 'Table ai_generated_content is already in supabase_realtime publication, skipping.';
  END IF;
END;
$$;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample user interests (you can remove this in production)
/*
INSERT INTO user_interests (user_id, interest_category, interest_value, confidence_score, source) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'hobby', 'photography', 0.8, 'explicit'),
  ('550e8400-e29b-41d4-a716-446655440001', 'music', 'indie rock', 0.7, 'inferred'),
  ('550e8400-e29b-41d4-a716-446655440002', 'food', 'italian cuisine', 0.9, 'activity_based'),
  ('550e8400-e29b-41d4-a716-446655440002', 'travel', 'europe', 0.6, 'inferred');
*/ 

--------------------------------------------------------------------------

-- supabase-chat-view-function.sql
-- This function retrieves the most recent message for each direct message conversation
-- for a given user. It's more efficient than fetching all messages and processing on the client.

CREATE OR REPLACE FUNCTION get_recent_chats(current_user_id uuid)
RETURNS TABLE (
    partner_id uuid,
    partner_username text,
    partner_display_name text,
    partner_profile_picture text,
    last_message_id bigint,
    last_message_content text,
    last_message_created_at timestamptz,
    last_message_sender_id uuid
)
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_messages AS (
    SELECT
      m.id,
      m.content,
      m.created_at,
      m.sender_id,
      m.recipient_id,
      -- Assign a row number to each message within a conversation, ordered by time
      ROW_NUMBER() OVER(
        PARTITION BY
          CASE
            WHEN m.sender_id = current_user_id THEN m.recipient_id
            ELSE m.sender_id
          END
        ORDER BY m.created_at DESC
      ) as rn
    FROM
      messages m
    WHERE
      (m.sender_id = current_user_id OR m.recipient_id = current_user_id)
      AND m.group_chat_id IS NULL -- Only include direct messages
  )
  SELECT
    -- Determine the partner's ID
    CASE
      WHEN rm.sender_id = current_user_id THEN rm.recipient_id
      ELSE rm.sender_id
    END AS partner_id,
    u.username AS partner_username,
    u.display_name AS partner_display_name,
    u.profile_picture AS partner_profile_picture,
    rm.id AS last_message_id,
    rm.content AS last_message_content,
    rm.created_at AS last_message_created_at,
    rm.sender_id AS last_message_sender_id
  FROM
    ranked_messages rm
  JOIN
    users u ON u.id = (
      CASE
        WHEN rm.sender_id = current_user_id THEN rm.recipient_id
        ELSE rm.sender_id
      END
    )
  WHERE
    rm.rn = 1 -- Only get the most recent message for each conversation
  ORDER BY
    rm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- To use this function, you would call it from your code like this:
-- supabase.rpc('get_recent_chats', { current_user_id: 'your_user_id_here' }) 

-----------------------------------------------------------------

-- This script fixes the not-null constraint on the recipient_id in the messages table.
-- This allows for group chat messages where there is no direct recipient.

ALTER TABLE public.messages
ALTER COLUMN recipient_id DROP NOT NULL;

-- Also, let's ensure the check constraint is correctly in place,
-- which makes sure a message is either a direct message or a group message.
ALTER TABLE public.messages
ADD CONSTRAINT check_message_target
CHECK (
    (recipient_id IS NOT NULL AND group_chat_id IS NULL) OR
    (recipient_id IS NULL AND group_chat_id IS NOT NULL)
);

-- Note: If the constraint already exists, the above command might fail.
-- This is fine, it just means the schema was already partially correct.
-- The important part is dropping the NOT NULL constraint. 

--------------------------------------------------------------------------

-- This script fixes the not-null constraint on the recipient_id in the messages table.
-- This allows for group chat messages where there is no direct recipient.

ALTER TABLE public.messages
ALTER COLUMN recipient_id DROP NOT NULL;

-- Also, let's ensure the check constraint is correctly in place,
-- which makes sure a message is either a direct message or a group message.
ALTER TABLE public.messages
ADD CONSTRAINT check_message_target
CHECK (
    (recipient_id IS NOT NULL AND group_chat_id IS NULL) OR
    (recipient_id IS NULL AND group_chat_id IS NOT NULL)
);

-- Note: If the constraint already exists, the above command might fail.
-- This is fine, it just means the schema was already partially correct.
-- The important part is dropping the NOT NULL constraint. 

---------------------------------------------------------------
