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
  _getCurrentUserId: () => {
    const { user } = useSupabaseAuthStore.getState();
    return user?.id || null;
  },

  // Search for users to add as friends.
  searchUsers: async (searchQuery) => {
    set({ loading: true, error: null });
    try {
      const currentUserId = get()._getCurrentUserId();
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
  sendFriendRequest: async (targetUser) => {
      set({ loading: true, error: null });
    const { user: currentUser } = useSupabaseAuthStore.getState();

    try {
      if (!currentUser) throw new Error('Current user not authenticated.');
      if (!targetUser?.id || !targetUser?.username) {
        throw new Error('Target user data is invalid.');
      }

      console.log(`🟢 FriendStore: Attempting to send friend request from ${currentUser.id} to ${targetUser.id}`);

      const requestPayload = {
        requester_id: currentUser.id,
        requested_id: targetUser.id,
        requester_username: currentUser.user_metadata?.username || currentUser.email.split('@')[0],
        requester_display_name: currentUser.user_metadata?.display_name || currentUser.user_metadata?.username || 'A new friend',
      };

      console.log('🟢 FriendStore: Sending payload:', JSON.stringify(requestPayload, null, 2));

      const { data, error } = await supabase
        .from('friend_requests')
        .insert(requestPayload)
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
  acceptFriendRequest: async (request) => {
      set({ loading: true, error: null });
    try {
      const currentUserId = get()._getCurrentUserId();
      if (!currentUserId || !request) {
        throw new Error('User or request is invalid.');
      }

      console.log('🟢 FriendStore: Accepting friend request ID:', request.id);
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: request.id,
        user1_id: currentUserId,
        user2_id: request.requester_id,
      });

      if (error) throw error;

      console.log('🟢 FriendStore: Friend request accepted successfully.');
      // Refresh friends and requests lists
      get().getFriends();
      get().getFriendRequests();
      set({ loading: false });
      
    } catch (error) {
      console.error('🔴 FriendStore: acceptFriendRequest error:', error.message);
      set({ error: 'Failed to accept friend request.', loading: false });
    }
  },

  // Reject (or cancel) a friend request.
  rejectFriendRequest: async (requestId) => {
      set({ loading: true, error: null });
    try {
      console.log('🟢 FriendStore: Rejecting friend request ID:', requestId);
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      console.log('🟢 FriendStore: Friend request rejected successfully.');
      // Refresh requests list
      set(state => ({
        friendRequests: state.friendRequests.filter(req => req.id !== requestId),
        loading: false
      }));
      
    } catch (error) {
      console.error('🔴 FriendStore: rejectFriendRequest error:', error.message);
      set({ error: 'Failed to reject friend request.', loading: false });
    }
  },

  // Get the current user's list of friends.
  getFriends: async () => {
    set({ loading: true, error: null });
    try {
      const currentUserId = get()._getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('🟢 FriendStore: Fetching friends for user:', currentUserId);
      
      // First get the friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', currentUserId);

      if (friendshipsError) throw friendshipsError;

      // Then get the friend details for each friendship
      const friends = [];
      for (const friendship of friendships || []) {
        const { data: friendData, error: friendError } = await supabase
          .from('users')
          .select('id, username, display_name, email, profile_picture')
          .eq('id', friendship.friend_id)
          .single();
          
        if (!friendError && friendData) {
          friends.push(friendData);
        }
      }

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
  getFriendRequests: async () => {
    set({ loading: true, error: null });
    try {
      const currentUserId = get()._getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }
      
      console.log('🟢 FriendStore: Fetching friend requests for user:', currentUserId);
      
      // First get the friend requests
      const { data: requests, error: requestsError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('requested_id', currentUserId)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      
      // Then get the requester details for each request
      const friendRequests = [];
      for (const request of requests || []) {
        const { data: requesterData, error: requesterError } = await supabase
          .from('users')
          .select('id, username, display_name, email, profile_picture')
          .eq('id', request.requester_id)
          .single();
          
        if (!requesterError && requesterData) {
          friendRequests.push({
            ...request,
            requester: requesterData
          });
        } else {
          // If we can't get requester data, still include the request but with basic info
          friendRequests.push({
            ...request,
            requester: {
              id: request.requester_id,
              username: request.requester_username || 'Unknown',
              display_name: request.requester_display_name || 'Unknown User',
              email: null,
              profile_picture: null
            }
          });
        }
      }
      
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