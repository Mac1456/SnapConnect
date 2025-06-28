-- This script fixes the not-null constraint on the recipient_id in the messages table.
-- This allows for group chat messages where there is no direct recipient.

ALTER TABLE public.messages
ALTER COLUMN recipient_id DROP NOT NULL;

-- Also, let's ensure the check constraint is correctly in place,
-- which makes sure a message is either a direct message or a group message.
ALTER TABLE public.messages
ADD CONSTRAINT check_message_target
CHECK (
    (recipient_id IS NOT NULL AND group_chat_id IS NULL) OR
    (recipient_id IS NULL AND group_chat_id IS NOT NULL)
);

-- Note: If the constraint already exists, the above command might fail.
-- This is fine, it just means the schema was already partially correct.
-- The important part is dropping the NOT NULL constraint. 