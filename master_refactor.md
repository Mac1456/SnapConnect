-- ====================================================================================
-- SnapConnect Master Refactor Script
-- Author: Gemini
-- Date: [Current Date]
-- Description: This is a single, unified script to build the entire SnapConnect
--              database schema from a clean slate. It is synthesized from the
--              complete query history and represents the last known good state
--              of the application before the breaking refactor changes.
-- Instructions: Run this entire script in the Supabase SQL Editor AFTER resetting
--               your project's database.
-- ====================================================================================

-- ========================================
-- Section 1: Enable Necessary Extensions
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ========================================
-- Section 2: Core Table Definitions
-- ========================================

-- Users Table
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

-- Friendships Table
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Friend Requests Table
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

-- Snaps Table
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

-- Stories Table
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

-- Group Chats Table
CREATE TABLE group_chats (
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

-- Messages Table (Primary Messaging Hub)
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
  group_members UUID[],
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'system')),
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  timer_seconds INTEGER DEFAULT 0,
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_suggestion_used INTEGER,
  CONSTRAINT recipient_or_group_check CHECK (
    (recipient_id IS NOT NULL AND group_chat_id IS NULL) OR 
    (recipient_id IS NULL AND group_chat_id IS NOT NULL)
  )
);

-- ========================================
-- Section 3: AI & RAG Feature Tables
-- ========================================

CREATE TABLE ai_generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL,
  input_context TEXT NOT NULL,
  generated_content JSONB NOT NULL,
  selected_option INTEGER,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_category VARCHAR(50) NOT NULL,
  interest_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  source VARCHAR(50) DEFAULT 'inferred',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest_category, interest_value)
);

CREATE TABLE friend_group_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_ids UUID[] NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_description TEXT NOT NULL,
  location TEXT,
  date_occurred TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Section 4: Performance Indexes
-- ========================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friend_requests_requested_id ON friend_requests(requested_id);
CREATE INDEX idx_friend_requests_requester_id ON friend_requests(requester_id);
CREATE INDEX idx_snaps_recipient_id ON snaps(recipient_id);
CREATE INDEX idx_snaps_sender_id ON snaps(sender_id);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
CREATE INDEX idx_messages_group_chat_id ON messages(group_chat_id);
CREATE INDEX idx_messages_group_members ON messages USING gin(group_members);
CREATE INDEX idx_group_chats_member_ids ON group_chats USING gin(member_ids);
CREATE INDEX idx_group_chats_creator_id ON group_chats(creator_id);
CREATE INDEX idx_ai_generated_content_user_type ON ai_generated_content(user_id, content_type);
CREATE INDEX idx_content_embeddings_user_type ON content_embeddings(user_id, content_type);
CREATE INDEX idx_user_interests_user_category ON user_interests(user_id, interest_category);
CREATE INDEX idx_friend_activities_users ON friend_group_activities USING GIN(user_ids);

-- ========================================
-- Section 5: Functions and Triggers
-- ========================================

-- Function to update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a user profile (advanced version)
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_username TEXT,
  user_display_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  INSERT INTO users (id, email, username, display_name) 
  VALUES (user_id, user_email, user_username, COALESCE(user_display_name, user_username));
  
  SELECT json_build_object('success', true, 'user_id', user_id) INTO result;
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    SELECT json_build_object('success', false, 'error', 'Username or email already exists') INTO result;
    RETURN result;
  WHEN OTHERS THEN
    SELECT json_build_object('success', false, 'error', SQLERRM) INTO result;
    RETURN result;
END;
$$;

-- Function to accept a friend request atomically
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID, user1_id UUID, user2_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.friendships (user_id, friend_id) VALUES (user1_id, user2_id);
  INSERT INTO public.friendships (user_id, friend_id) VALUES (user2_id, user1_id);
  DELETE FROM public.friend_requests WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to remove a friend
CREATE OR REPLACE FUNCTION remove_friend(user1_id uuid, user2_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM public.friendships
  WHERE (user_id = user1_id AND friend_id = user2_id)
     OR (user_id = user2_id AND friend_id = user1_id);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set group_members on message insert
CREATE OR REPLACE FUNCTION set_group_members() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_chat_id IS NOT NULL THEN
    SELECT member_ids INTO NEW.group_members
    FROM group_chats 
    WHERE id = NEW.group_chat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for messages table
CREATE TRIGGER set_group_members_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_group_members();

-- Group management functions
CREATE OR REPLACE FUNCTION add_group_members(group_id UUID, new_member_ids UUID[])
RETURNS VOID AS $$
BEGIN
  IF NOT (auth.uid() = ANY(SELECT admin_ids FROM group_chats WHERE id = group_id) OR auth.uid() = (SELECT creator_id FROM group_chats WHERE id = group_id)) THEN
    RAISE EXCEPTION 'Only admins can add members';
  END IF;

  UPDATE group_chats 
  SET member_ids = array(SELECT DISTINCT unnest(member_ids || new_member_ids)), updated_at = NOW()
  WHERE id = group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION leave_group_chat(group_id UUID) 
RETURNS VOID AS $$
DECLARE
  updated_members UUID[];
BEGIN
  UPDATE group_chats
  SET member_ids = array_remove(member_ids, auth.uid()),
      admin_ids = array_remove(admin_ids, auth.uid()),
      updated_at = NOW()
  WHERE id = group_id
  RETURNING member_ids INTO updated_members;

  IF array_length(updated_members, 1) = 0 THEN
    DELETE FROM group_chats WHERE id = group_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Section 6: Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_group_activities ENABLE ROW LEVEL SECURITY;

-- Policies for 'users'
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view public profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for 'friendships'
CREATE POLICY "Users can view own friendships" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can create friendships" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own friendships" ON friendships FOR DELETE USING (auth.uid() = user_id);

-- Policies for 'friend_requests'
CREATE POLICY "Users can manage friend requests" ON friend_requests FOR ALL USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- Policies for 'snaps'
CREATE POLICY "Users can view own snaps" ON snaps FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can create snaps" ON snaps FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipients can update snap status" ON snaps FOR UPDATE USING (auth.uid() = recipient_id);

-- Policies for 'stories'
CREATE POLICY "Users can view active stories" ON stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Users can create own stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own stories" ON stories FOR ALL USING (auth.uid() = user_id);

-- Policies for 'messages'
CREATE POLICY "Users can view messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR (group_chat_id IS NOT NULL AND auth.uid() = ANY(group_members)));
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- Policies for 'group_chats'
CREATE POLICY "Users can view group chats" ON group_chats FOR SELECT USING (auth.uid() = ANY(member_ids));
CREATE POLICY "Users can create group chats" ON group_chats FOR INSERT WITH CHECK (auth.uid() = creator_id AND auth.uid() = ANY(member_ids));
CREATE POLICY "Admins can update group chats" ON group_chats FOR UPDATE USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);
CREATE POLICY "Creator can delete group chats" ON group_chats FOR DELETE USING (auth.uid() = creator_id);

-- Policies for AI & RAG tables
CREATE POLICY "Users can manage their own AI content" ON ai_generated_content FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own embeddings" ON content_embeddings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own interests" ON user_interests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own activities" ON friend_group_activities FOR ALL USING (auth.uid() = ANY(user_ids));

-- ========================================
-- Section 7: Storage Bucket & Policies
-- ========================================

-- Create the 'media' bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
CREATE POLICY "Public media access" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Users can update own media" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- Section 8: Realtime Subscriptions
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE snaps;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_generated_content;

-- ========================================
-- Finalization
-- ========================================
SELECT 'SnapConnect Master Refactor Script completed successfully! Database is rebuilt.' as status; 