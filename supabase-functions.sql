-- =================================================================
-- Description: Creates a stored procedure in Supabase to atomically
--              handle accepting a friend request.
-- =================================================================

-- Drop the function if it already exists to ensure a clean state
DROP FUNCTION IF EXISTS accept_friend_request(request_id UUID, user1_id UUID, user2_id UUID);

CREATE OR REPLACE FUNCTION accept_friend_request(
  request_id UUID,
  user1_id UUID,
  user2_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Insert the first direction of the friendship
  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (user1_id, user2_id);

  -- Insert the reverse direction of the friendship
  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (user2_id, user1_id);

  -- Delete the original friend request
  DELETE FROM public.friend_requests
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- REMOVE FRIEND FUNCTION
-- Deletes the bidirectional friendship records
-- =============================================
CREATE OR REPLACE FUNCTION remove_friend(user1_id uuid, user2_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete the friendship records in both directions
  DELETE FROM public.friendships
  WHERE (user_id = user1_id AND friend_id = user2_id)
     OR (user_id = user2_id AND friend_id = user1_id);
END;
$$ LANGUAGE plpgsql; 