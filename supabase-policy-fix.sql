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