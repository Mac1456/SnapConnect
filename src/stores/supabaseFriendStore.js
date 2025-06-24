import { create } from 'zustand';
import { supabase } from '../../supabase.config';

export const useSupabaseFriendStore = create((set, get) => ({
  friends: [],
  friendRequests: [],
  loading: false,
  error: null,

  // Search users by username
  searchUsers: async (searchTerm) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, email')
        .ilike('username', `%${searchTerm}%`)
        .limit(10);
      
      if (error) {
        console.error('🟢 SupabaseFriendStore: searchUsers error:', error);
        set({ error: error.message, loading: false });
        return [];
      }

      set({ loading: false });
      return data || [];
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: searchUsers error:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Send friend request
  sendFriendRequest: async (targetUserId, currentUser) => {
    try {
      set({ loading: true, error: null });
      
      // Insert friend request
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: currentUser.uid,
          requested_id: targetUserId,
          requester_username: currentUser.username,
          requester_display_name: currentUser.displayName,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('🟢 SupabaseFriendStore: sendFriendRequest error:', error);
        set({ error: error.message, loading: false });
        return;
      }

      console.log('🟢 SupabaseFriendStore: Friend request sent successfully');
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: sendFriendRequest error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Accept friend request
  acceptFriendRequest: async (requesterId, currentUserId) => {
    try {
      set({ loading: true, error: null });
      
      // Start a transaction to add friends and remove request
      const { error: friendError1 } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: requesterId,
          created_at: new Date().toISOString(),
        });

      const { error: friendError2 } = await supabase
        .from('friendships')
        .insert({
          user_id: requesterId,
          friend_id: currentUserId,
          created_at: new Date().toISOString(),
        });

      // Remove the friend request
      const { error: requestError } = await supabase
        .from('friend_requests')
        .delete()
        .eq('requester_id', requesterId)
        .eq('requested_id', currentUserId);

      if (friendError1 || friendError2 || requestError) {
        console.error('🟢 SupabaseFriendStore: acceptFriendRequest error:', { friendError1, friendError2, requestError });
        set({ error: 'Failed to accept friend request', loading: false });
        return;
      }

      console.log('🟢 SupabaseFriendStore: Friend request accepted successfully');
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: acceptFriendRequest error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Reject friend request
  rejectFriendRequest: async (requesterId, currentUserId) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('requester_id', requesterId)
        .eq('requested_id', currentUserId);

      if (error) {
        console.error('🟢 SupabaseFriendStore: rejectFriendRequest error:', error);
        set({ error: error.message, loading: false });
        return;
      }

      console.log('🟢 SupabaseFriendStore: Friend request rejected successfully');
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: rejectFriendRequest error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Get friends list
  getFriends: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          users!friendships_friend_id_fkey (
            id,
            username,
            display_name,
            email,
            profile_picture
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('🟢 SupabaseFriendStore: getFriends error:', error);
        set({ error: error.message });
        return;
      }

      const friends = data?.map(item => ({
        id: item.users.id,
        username: item.users.username,
        displayName: item.users.display_name,
        email: item.users.email,
        profilePicture: item.users.profile_picture,
      })) || [];

      set({ friends });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: getFriends error:', error);
      set({ error: error.message });
    }
  },

  // Listen to friend requests
  listenToFriendRequests: (userId) => {
    console.log('🟢 SupabaseFriendStore: Setting up friend requests listener for:', userId);
    
    const subscription = supabase
      .channel('friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `requested_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🟢 SupabaseFriendStore: Friend request change:', payload);
          // Refresh friend requests
          get().loadFriendRequests(userId);
        }
      )
      .subscribe();

    // Initial load
    get().loadFriendRequests(userId);

    return () => {
      console.log('🟢 SupabaseFriendStore: Unsubscribing from friend requests');
      supabase.removeChannel(subscription);
    };
  },

  // Load friend requests (helper function)
  loadFriendRequests: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('requested_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('🟢 SupabaseFriendStore: loadFriendRequests error:', error);
        return;
      }

      const friendRequests = data?.map(request => ({
        userId: request.requester_id,
        username: request.requester_username,
        displayName: request.requester_display_name,
        sentAt: request.created_at,
      })) || [];

      set({ friendRequests });
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: loadFriendRequests error:', error);
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 