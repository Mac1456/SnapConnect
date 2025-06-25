-- SnapConnect MVP Update Script
-- Run this script in your Supabase SQL Editor to add MVP features

-- ========================================
-- MESSAGES TABLE FOR MESSAGING & GROUP CHAT
-- ========================================

-- Create messages table for direct and group messaging
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for group messages
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'system')),
  media_url TEXT,
  group_members UUID[], -- Array of user IDs for group messages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE -- For disappearing messages
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_messages_group_members ON messages USING GIN(group_members);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Create comprehensive message policies
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

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ========================================
-- CLEANUP FUNCTIONS
-- ========================================

-- Function to automatically clean up expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW();
  
  RAISE NOTICE 'Expired messages cleaned up at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically clean up expired snaps (if they don't already expire)
CREATE OR REPLACE FUNCTION cleanup_expired_snaps()
RETURNS void AS $$
BEGIN
  -- Clean up snaps older than their timer + 24 hours for safety
  DELETE FROM snaps 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  RAISE NOTICE 'Old snaps cleaned up at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TEST DATA (OPTIONAL)
-- ========================================

-- Insert some test messages (uncomment if you want test data)
-- INSERT INTO messages (sender_id, recipient_id, content, message_type) VALUES
-- ((SELECT id FROM users LIMIT 1), (SELECT id FROM users OFFSET 1 LIMIT 1), 'Hello from SnapConnect!', 'text'),
-- ((SELECT id FROM users OFFSET 1 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Hey there! How are you?', 'text');

-- ========================================
-- COMPLETION
-- ========================================

SELECT 'SnapConnect MVP features installed successfully! 🎉' as status;
SELECT '✅ Group messaging support added' as feature_1;
SELECT '✅ Disappearing messages support added' as feature_2; 
SELECT '✅ Enhanced real-time messaging' as feature_3;
SELECT '✅ Automatic cleanup functions created' as feature_4;
SELECT 'Your app now supports all core MVP messaging features!' as conclusion; 