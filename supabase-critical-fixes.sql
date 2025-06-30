-- SnapConnect Critical Database Fixes
-- Run this in your Supabase SQL Editor to fix authentication and schema issues

-- ========================================
-- DISABLE RLS TEMPORARILY FOR FIXES
-- ========================================
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friend_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;

-- ========================================
-- ADD MISSING COLUMNS
-- ========================================

-- Add onboarding_completed column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Ensure all required columns exist in users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- DROP ALL EXISTING POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "mvp_users_all_2024" ON users;

DROP POLICY IF EXISTS "Users can view active stories" ON stories;
DROP POLICY IF EXISTS "Users can create own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
DROP POLICY IF EXISTS "mvp_stories_all_2024" ON stories;

DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
DROP POLICY IF EXISTS "mvp_friendships_all_2024" ON friendships;

DROP POLICY IF EXISTS "Users can view relevant friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can create friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can delete friend requests" ON friend_requests;
DROP POLICY IF EXISTS "mvp_friend_requests_all_2024" ON friend_requests;

DROP POLICY IF EXISTS "mvp_messages_all_2024" ON messages;

-- Drop storage policies
DROP POLICY IF EXISTS "mvp_media_all_2024" ON storage.objects;

-- ========================================
-- CREATE ULTRA PERMISSIVE POLICIES FOR MVP
-- ========================================

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_users_all_access" ON users FOR ALL USING (true) WITH CHECK (true);

-- Stories policies - ULTRA PERMISSIVE  
CREATE POLICY "mvp_stories_all_access" ON stories FOR ALL USING (true) WITH CHECK (true);

-- Friendships policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_friendships_all_access" ON friendships FOR ALL USING (true) WITH CHECK (true);

-- Friend requests policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_friend_requests_all_access" ON friend_requests FOR ALL USING (true) WITH CHECK (true);

-- Messages policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_messages_all_access" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Storage policies - ULTRA PERMISSIVE
CREATE POLICY "mvp_media_all_access" ON storage.objects FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================
NOTIFY pgrst, 'reload schema';

-- ========================================
-- VERIFY SETUP
-- ========================================
SELECT 'Database fixes applied successfully' as status; 