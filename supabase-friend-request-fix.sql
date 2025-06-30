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

-- =================================================================
-- Description: Fixes the friend request acceptance flow by
--              redefining the `accept_friend_request` function
--              to run with elevated privileges.
-- =================================================================

-- Drop the existing function to ensure a clean update
DROP FUNCTION IF EXISTS public.accept_friend_request(uuid, uuid, uuid);

-- Recreate the function with SECURITY DEFINER
-- This allows the function to bypass RLS policies by running as the user
-- who defined it (the superuser), ensuring it has the necessary
-- permissions to create the bidirectional friendship records.
CREATE OR REPLACE FUNCTION public.accept_friend_request(
  request_id uuid,
  user1_id uuid,
  user2_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the bidirectional friendship records to establish the connection
  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (user1_id, user2_id);

  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (user2_id, user1_id);

  -- Remove the original friend request now that it's been accepted
  DELETE FROM public.friend_requests
  WHERE id = request_id;
END;
$$;

-- It's a good security practice to explicitly set the search_path for
-- SECURITY DEFINER functions. This mitigates the risk of a malicious
-- user manipulating the execution path.
ALTER FUNCTION public.accept_friend_request(uuid, uuid, uuid) SET search_path = public;

-- Grant execution rights to the 'authenticated' role so that any
-- logged-in user can call this function.
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid, uuid, uuid) TO authenticated; 