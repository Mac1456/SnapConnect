import { create } from 'zustand';
import { supabase } from '../../supabase.config';
import { useSupabaseAuthStore } from './supabaseAuthStore';

// =================================================================
//  revamped supabaseFriendStore.js
//
// This store has been completely overhauled to fix critical bugs
// in friend request handling and to simplify the overall logic.
//
// Key Improvements:
// 1. Atomic Friend Requests: Uses a Supabase RPC function 
//    (accept_friend_request) to ensure that accepting a friend
//    request is an atomic operation, preventing partial or
//    failed states.
// 2. Simplified State Management: Consolidates multiple redundant
//    functions for fetching friend requests into a single,
//    reliable source of truth.
// 3. Robust Error Handling: Adds clearer error logging and handles
//    edge cases more gracefully.
// =================================================================

export const useSupabaseFriendStore = create((set, get) => ({
  friends: [],
  friendRequests: [],
  loading: false,
  error: null,

  // A helper function to get the current user's ID.
  // It's placed here so other store functions can access it via get().
  _getCurrentUserId: () => {
    const { user } = useSupabaseAuthStore.getState();
    console.log(`🟡 FriendStore: _getCurrentUserId called. Auth store user state:`, user ? `User ID: ${user.id}` : 'null');
    if (!user) {
      console.warn('🟡 FriendStore: _getCurrentUserId found no user in auth store.');
    }
    return user?.id || null;
  },

  // Search for users to add as friends.
  searchUsers: async (searchQuery, userId) => {
    set({ loading: true, error: null });
    try {
      const currentUserId = userId || get()._getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }
      
      console.log('🟢 FriendStore: Searching for users with query:', searchQuery);
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, email, profile_picture')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .not('id', 'eq', currentUserId) // Exclude the current user from search results
        .limit(20);

      if (error) throw error;

      console.log('🟢 FriendStore: Found', data.length, 'users.');
      set({ loading: false });
      return data || [];
    } catch (error) {
      console.error('🔴 FriendStore: searchUsers error:', error.message);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Send a friend request to another user.
  sendFriendRequest: async (recipientId, userId) => {
    set({ loading: true, error: null });
    try {
      const currentUserId = userId || get()._getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }
      if (currentUserId === recipientId) {
        throw new Error("You can't send a friend request to yourself.");
      }

      console.log(`🟢 FriendStore: Sending friend request from ${currentUserId} to ${recipientId}`);
      
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: currentUserId,
          requested_id: recipientId,
          requester_username: currentUserId,
          requester_display_name: currentUserId,
        })
        .select();

      if (error) {
        console.error('🔴 FriendStore: Full error object from Supabase:', JSON.stringify(error, null, 2));
        if (error.code === '23505') {
          console.warn('🟡 FriendStore: Friend request already exists.');
          throw new Error('Friend request already sent.');
        }
        throw error;
      }

      console.log('🟢 FriendStore: Friend request sent successfully. Response:', data);
      set({ loading: false });
      return data;
    } catch (error) {
      console.error('🔴 FriendStore: sendFriendRequest error:', error.message);
      if (error.code) {
        console.error('🔴 FriendStore: Raw error details:', JSON.stringify(error, null, 2));
      }
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Accept a friend request using the new RPC function.
  acceptFriendRequest: async (requestId, senderId, userId) => {
    set({ loading: true, error: null });
    try {
      const currentUserId = userId || get()._getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`🟢 FriendStore: User ${currentUserId} accepting friend request ${requestId} from ${senderId}`);
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId,
        user1_id: currentUserId,
        user2_id: senderId
      });

      if (error) {
        console.error('🔴 FriendStore: Full error object from Supabase:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('🟢 FriendStore: Friend request accepted successfully.');
      // Refresh both friends and friend requests lists
      get().getFriends(currentUserId);
      get().getFriendRequests(currentUserId);
    } catch (error) {
      console.error('🔴 FriendStore: acceptFriendRequest error:', error);
      set({ error: error.message });
    }
  },

  // Reject (or cancel) a friend request.
  rejectFriendRequest: async (requestId, userId) => {
    set({ loading: true, error: null });
    try {
      const currentUserId = userId || get()._getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`🟢 FriendStore: User ${currentUserId} rejecting friend request ${requestId}`);
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      console.log('🟢 FriendStore: Friend request rejected successfully.');
      // Refresh friend requests list
      get().getFriendRequests(currentUserId);
    } catch (error) {
      console.error('🔴 FriendStore: rejectFriendRequest error:', error);
      set({ error: error.message });
    }
  },

  // Fetch the current user's friends list.
  // Now accepts an optional userId to prevent race conditions on startup.
  getFriends: async (userId) => {
    set({ loading: true, error: null });
    try {
      // Use the provided userId first, otherwise try to get it from auth.
      const currentUserId = userId || get()._getCurrentUserId();

      if (!currentUserId) {
        // This is now a handled state, not an exception.
        const errorMessage = 'User not authenticated';
        console.error('🔴 FriendStore: getFriends error:', errorMessage);
        set({ loading: false, error: errorMessage });
        return; // Exit gracefully
      }

      console.log('🟢 FriendStore: Fetching friends for user:', currentUserId);
      const { data, error } = await supabase
        .from('friendships')
        .select('friend:friend_id(id, username, display_name, email, profile_picture)')
        .eq('user_id', currentUserId);

      if (error) throw error;
      
      const friends = data.map(item => item.friend) || [];
      console.log('🟢 FriendStore: Found', friends.length, 'friends.');
      set({ friends, loading: false });
      return friends;

    } catch (error) {
      console.error('🔴 FriendStore: getFriends error:', error.message);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Get all incoming friend requests for the current user.
  getFriendRequests: async (userId) => {
    set({ loading: true, error: null });
    try {
      const currentUserId = userId || get()._getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }
      
      console.log('🟢 FriendStore: Fetching friend requests for user:', currentUserId);
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*, requester:requester_id(id, username, display_name, email, profile_picture)')
        .eq('requested_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const friendRequests = data || [];
      console.log('🟢 FriendStore: Found', friendRequests.length, 'friend requests.');
      set({ friendRequests, loading: false });
      return friendRequests;
    } catch (error) {
      console.error('🔴 FriendStore: getFriendRequests error:', error.message);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Set up a real-time listener for any changes to friend requests.
  listenToFriendRequests: () => {
    const currentUserId = get()._getCurrentUserId();
    if (!currentUserId) return;

    console.log('🟢 FriendStore: Setting up listener for friend requests.');
    const channel = supabase
      .channel('friend-requests-listener')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `requested_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('🟢 FriendStore: Change detected in friend requests:', payload);
          get().getFriendRequests();
          get().getFriends();
        }
      )
      .subscribe();

    // Return the unsubscribe function for cleanup.
    return () => {
      console.log('🟢 FriendStore: Unsubscribing from friend requests listener.');
      supabase.removeChannel(channel);
    };
  },

  removeFriend: async (friendId) => {
    set({ loading: true, error: null });
    try {
      const currentUserId = get()._getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('🟢 FriendStore: Removing friend:', friendId);
      const { error } = await supabase.rpc('remove_friend', {
        user1_id: currentUserId,
        user2_id: friendId,
      });

      if (error) throw error;

      console.log('🟢 FriendStore: Friend removed successfully.');
      // Refresh friends list
      get().getFriends();
      set({ loading: false });
      
    } catch (error) {
      console.error('🔴 FriendStore: removeFriend error:', error.message);
      set({ error: 'Failed to remove friend.', loading: false });
      throw error; // Re-throw to be caught in the component
    }
  },

  clearError: () => set({ error: null })
})); 