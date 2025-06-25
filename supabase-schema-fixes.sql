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