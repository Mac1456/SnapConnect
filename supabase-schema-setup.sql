-- SnapConnect Safe Database Schema Setup
-- Run this in your Supabase SQL Editor to create all tables and fix issues
-- This version handles existing objects gracefully

-- ========================================
-- DROP EXISTING POLICIES FIRST
-- ========================================
DROP POLICY IF EXISTS "mvp_media_all_access" ON storage.objects;
DROP POLICY IF EXISTS "mvp_media_upload" ON storage.objects;
DROP POLICY IF EXISTS "mvp_media_download" ON storage.objects;

-- ========================================
-- DROP EXISTING TABLES (IF ANY) - SAFER VERSION
-- ========================================
DROP TABLE IF EXISTS ai_generated_content CASCADE;
DROP TABLE IF EXISTS group_messages CASCADE;
DROP TABLE IF EXISTS group_chats CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS story_views CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ========================================
-- CREATE USERS TABLE
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    profile_picture TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    onboarding_completed BOOLEAN DEFAULT FALSE
);

-- ========================================
-- CREATE STORIES TABLE
-- ========================================
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image',
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    views TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- ========================================
-- CREATE STORY_VIEWS TABLE
-- ========================================
CREATE TABLE story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
);

-- ========================================
-- CREATE FRIENDSHIPS TABLE
-- ========================================
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- ========================================
-- CREATE FRIEND_REQUESTS TABLE
-- ========================================
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_id, recipient_id),
    CHECK (sender_id != recipient_id)
);

-- ========================================
-- CREATE MESSAGES TABLE
-- ========================================
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    timer_seconds INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_suggestion_used TEXT
);

-- ========================================
-- CREATE GROUP_CHATS TABLE
-- ========================================
CREATE TABLE group_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_ids UUID[] DEFAULT ARRAY[]::UUID[],
    member_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    group_photo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CREATE GROUP_MESSAGES TABLE
-- ========================================
CREATE TABLE group_messages (
    id SERIAL PRIMARY KEY,
    group_chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    timer_seconds INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_suggestion_used TEXT,
    group_members UUID[] DEFAULT ARRAY[]::UUID[],
    recipient_id UUID
);

-- ========================================
-- CREATE AI_GENERATED_CONTENT TABLE
-- ========================================
CREATE TABLE ai_generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('caption', 'activity', 'group_name', 'group_description')),
    content TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_id ON friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_chat_id ON group_messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_chats_creator_id ON group_chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_user_id ON ai_generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_type ON ai_generated_content(content_type);

-- ========================================
-- CREATE ULTRA-PERMISSIVE RLS POLICIES FOR MVP
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;

-- Create ultra-permissive policies (allow all operations for MVP)
CREATE POLICY "mvp_users_all_access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_stories_all_access" ON stories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_story_views_all_access" ON story_views FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_friendships_all_access" ON friendships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_friend_requests_all_access" ON friend_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_messages_all_access" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_group_chats_all_access" ON group_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_group_messages_all_access" ON group_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_ai_generated_content_all_access" ON ai_generated_content FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- CREATE STORAGE BUCKET AND POLICIES
-- ========================================

-- Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Create ultra-permissive storage policies for MVP
CREATE POLICY "mvp_media_all_access" ON storage.objects FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- INSERT TEST DATA
-- ========================================

-- Insert test users with proper UUID casting
INSERT INTO users (id, email, username, display_name, profile_picture, bio, onboarding_completed) VALUES
('01832a3f-a9f3-4158-8053-bfed0a3d94d2'::uuid, 'mustafa.chaudheri@gmail.com', 'mustafa.chaudheri', 'Mac1456', null, 'App developer and tech enthusiast', true),
('c65e40c4-ef3c-4d8f-80b2-6d6b40dd755f'::uuid, 'alice.cooper@test.com', 'alice_cooper', 'Alice Cooper', null, 'Love photography and travel', false),
('41bf2926-cc97-4c88-b166-cb77ab304c8f'::uuid, 'bob.wilson@test.com', 'bob_wilson', 'Bob Wilson', null, 'Fitness enthusiast and foodie', false),
('7f8e9d10-1234-5678-9abc-def012345678'::uuid, 'charlie.brown@test.com', 'charlie_brown', 'Charlie Brown', null, 'Music lover and artist', false)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    onboarding_completed = EXCLUDED.onboarding_completed;

-- Create some friendships
INSERT INTO friendships (user_id, friend_id) VALUES
('01832a3f-a9f3-4158-8053-bfed0a3d94d2'::uuid, 'c65e40c4-ef3c-4d8f-80b2-6d6b40dd755f'::uuid),
('c65e40c4-ef3c-4d8f-80b2-6d6b40dd755f'::uuid, '01832a3f-a9f3-4158-8053-bfed0a3d94d2'::uuid),
('01832a3f-a9f3-4158-8053-bfed0a3d94d2'::uuid, '41bf2926-cc97-4c88-b166-cb77ab304c8f'::uuid),
('41bf2926-cc97-4c88-b166-cb77ab304c8f'::uuid, '01832a3f-a9f3-4158-8053-bfed0a3d94d2'::uuid),
('c65e40c4-ef3c-4d8f-80b2-6d6b40dd755f'::uuid, '41bf2926-cc97-4c88-b166-cb77ab304c8f'::uuid),
('41bf2926-cc97-4c88-b166-cb77ab304c8f'::uuid, 'c65e40c4-ef3c-4d8f-80b2-6d6b40dd755f'::uuid)
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- Create a test group chat
INSERT INTO group_chats (id, name, description, creator_id, admin_ids, member_ids) VALUES
('a6cb075a-5bb7-47c9-84d2-cf03b681664f'::uuid, 'Test Group', 'A test group chat', '01832a3f-a9f3-4158-8053-bfed0a3d94d2'::uuid, 
 ARRAY['01832a3f-a9f3-4158-8053-bfed0a3d94d2'::uuid], 
 ARRAY['01832a3f-a9f3-4158-8053-bfed0a3d94d2'::uuid, 'c65e40c4-ef3c-4d8f-80b2-6d6b40dd755f'::uuid, '41bf2926-cc97-4c88-b166-cb77ab304c8f'::uuid])
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    member_ids = EXCLUDED.member_ids;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '✅ SnapConnect database schema setup completed successfully!';
    RAISE NOTICE '📊 Created tables: users, stories, friendships, messages, group_chats, etc.';
    RAISE NOTICE '🔐 Applied ultra-permissive RLS policies for MVP development';
    RAISE NOTICE '👥 Added test users: mustafa.chaudheri, alice_cooper, bob_wilson, charlie_brown';
    RAISE NOTICE '🏠 Created test group chat with sample members';
    RAISE NOTICE '📱 Your SnapConnect app should now work without database errors!';
END $$; 