-- Add ephemeral messaging support to messages table
-- This adds a timer_seconds column for ephemeral messages

-- Add timer_seconds column if it doesn't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0;

-- Add index for efficient querying of ephemeral messages
CREATE INDEX IF NOT EXISTS idx_messages_timer ON messages(timer_seconds) WHERE timer_seconds > 0;

-- Update existing messages to have timer_seconds = 0 if NULL
UPDATE messages SET timer_seconds = 0 WHERE timer_seconds IS NULL; 