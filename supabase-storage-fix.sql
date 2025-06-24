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

-- Drop existing function if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT, TEXT);

-- Create user profile function to handle username properly
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
DROP POLICY IF EXISTS "Users can update stories" ON stories;

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
-- FRIENDSHIPS TABLE POLICIES
-- ========================================

-- Enable RLS on friendships table
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Drop all existing friendship policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;

-- Create new friendship policies
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- ========================================
-- MESSAGES TABLE SETUP
-- ========================================

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video')),
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing message policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Create message policies
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

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