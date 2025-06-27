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
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ========================================
-- SAMPLE DATA (OPTIONAL)
-- ========================================

-- Insert sample users (you can remove this section)
-- INSERT INTO users (id, username, display_name, email, bio) VALUES
--   ('550e8400-e29b-41d4-a716-446655440001', 'john_doe', 'John Doe', 'john@example.com', 'Love taking photos!'),
--   ('550e8400-e29b-41d4-a716-446655440002', 'jane_smith', 'Jane Smith', 'jane@example.com', 'Snapchat enthusiast'),
--   ('550e8400-e29b-41d4-a716-446655440003', 'mike_wilson', 'Mike Wilson', 'mike@example.com', 'Always sharing stories');

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

-- Enable RLS for group_chats
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;

-- Group Chats policies
CREATE POLICY "Users can view groups they're members of" ON group_chats
  FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);
CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group admins can update groups" ON group_chats
  FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);
CREATE POLICY "Group admins can delete groups" ON group_chats
  FOR DELETE USING (auth.uid() = creator_id);

-- Create indexes for group chats
CREATE INDEX IF NOT EXISTS idx_group_chats_creator ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(member_ids);

-- ========================================
-- MESSAGES TABLE SETUP
-- ========================================

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for group messages
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'system')),
  media_url TEXT,
  group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE, -- For group messages
  group_members UUID[], -- Array of user IDs for group messages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE, -- For disappearing messages
  CONSTRAINT check_message_target CHECK (
    (recipient_id IS NOT NULL AND group_chat_id IS NULL) OR  -- Direct message
    (recipient_id IS NULL AND group_chat_id IS NOT NULL)     -- Group message
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_messages_group_members ON messages USING GIN(group_members);
CREATE INDEX IF NOT EXISTS idx_messages_group_chat ON messages(group_chat_id);

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing message policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Create message policies
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    (group_members IS NOT NULL AND auth.uid() = ANY(group_members))
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    (group_members IS NOT NULL AND auth.uid() = ANY(group_members))
  );

-- Schema setup complete! 