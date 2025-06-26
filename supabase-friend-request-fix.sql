-- ========================================
-- ENABLE RLS and ADD PERMISSIVE POLICY FOR friend_requests
-- This is required to allow users to send, receive, and manage friend requests.
-- ========================================

-- Enable Row Level Security on the table
ALTER TABLE IF EXISTS public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists to avoid errors during re-runs
DROP POLICY IF EXISTS "mvp_friend_requests_all_2024" ON public.friend_requests;

-- Create a permissive policy that allows all actions for any authenticated user.
-- This is suitable for the MVP stage but should be reviewed for production security.
CREATE POLICY "mvp_friend_requests_all_2024" 
ON public.friend_requests 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ========================================
-- REFRESH SCHEMA CACHE
-- ========================================

-- Refresh the schema cache to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 