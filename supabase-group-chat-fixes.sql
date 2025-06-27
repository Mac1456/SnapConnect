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
    (group_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_chats 
      WHERE id = group_chat_id 
      AND auth.uid() = ANY(member_ids)
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
    (group_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_chats 
      WHERE id = group_chat_id 
      AND auth.uid() = ANY(member_ids)
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