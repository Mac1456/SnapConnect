import { create } from 'zustand';
import { supabase } from '../../supabase.config';

export const useSupabaseFriendStore = create((set, get) => ({
  friends: [],
  friendRequests: [],
  loading: false,
  error: null,

  // Search users by username or display name
  searchUsers: async (searchQuery) => {
    try {
      set({ loading: true, error: null });
      
      console.log('🟢 SupabaseFriendStore: Searching for users with query:', searchQuery);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, email, profile_picture')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) {
        console.error('🟢 SupabaseFriendStore: searchUsers error:', error);
        set({ error: error.message, loading: false });
        return [];
      }

      console.log('🟢 SupabaseFriendStore: Search results:', data?.length || 0, 'users found');
      set({ loading: false });
      return data || [];
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: searchUsers error:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Send friend request
  sendFriendRequest: async (targetUserId, targetUsername) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('🟢 SupabaseFriendStore: No authenticated user found:', authError);
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      // Get user profile for username
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('username, display_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('🟢 SupabaseFriendStore: Error getting user profile:', profileError);
        set({ error: 'Failed to get user profile', loading: false });
        return;
      }

      console.log('🟢 SupabaseFriendStore: Sending friend request from:', user.id, 'to:', targetUserId);
      
      // Check if friend request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('requested_id', targetUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('🟢 SupabaseFriendStore: Error checking existing request:', checkError);
        set({ error: checkError.message, loading: false });
        return;
      }

      if (existingRequest) {
        console.log('🟢 SupabaseFriendStore: Friend request already exists');
        set({ error: 'Friend request already sent', loading: false });
        return;
      }
      
      // Insert friend request
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: user.id,
          requested_id: targetUserId,
          requester_username: profile.username || user.email?.split('@')[0] || 'unknown',
          requester_display_name: profile.display_name || profile.username || user.email?.split('@')[0] || 'Unknown User',
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('🟢 SupabaseFriendStore: sendFriendRequest error:', error);
        if (error.code === '23505') { // Unique constraint violation
          set({ error: 'Friend request already sent', loading: false });
        } else {
          set({ error: error.message, loading: false });
        }
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
  acceptFriendRequest: async (requestId) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('🟢 SupabaseFriendStore: No authenticated user found:', authError);
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      // Get the friend request details
      const { data: request, error: requestError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('id', requestId)
        .eq('requested_id', user.id)
        .single();

      if (requestError) {
        console.error('🟢 SupabaseFriendStore: Error getting friend request:', requestError);
        set({ error: 'Friend request not found', loading: false });
        return;
      }

      const requesterId = request.requester_id;
      
      // Start a transaction to add friends and remove request
      const { error: friendError1 } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: requesterId,
          created_at: new Date().toISOString(),
        });

      const { error: friendError2 } = await supabase
        .from('friendships')
        .insert({
          user_id: requesterId,
          friend_id: user.id,
          created_at: new Date().toISOString(),
        });

      // Remove the friend request
      const { error: deleteError } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (friendError1 || friendError2 || deleteError) {
        console.error('🟢 SupabaseFriendStore: acceptFriendRequest error:', { friendError1, friendError2, deleteError });
        set({ error: 'Failed to accept friend request', loading: false });
        return;
      }

      console.log('🟢 SupabaseFriendStore: Friend request accepted successfully');
      set({ loading: false });
      
      // Refresh friends list
      get().getFriends(user.id);
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: acceptFriendRequest error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Reject friend request
  rejectFriendRequest: async (requestId) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('🟢 SupabaseFriendStore: No authenticated user found:', authError);
        set({ error: 'User not authenticated', loading: false });
        return;
      }
      
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .eq('requested_id', user.id);

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

  // Get friend requests
  getFriendRequests: async () => {
    try {
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('🟢 SupabaseFriendStore: No authenticated user found:', authError);
        set({ error: 'User not authenticated' });
        return [];
      }

      console.log('🟢 SupabaseFriendStore: Getting friend requests for:', user.id);
      
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('requested_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🟢 SupabaseFriendStore: getFriendRequests error:', error);
        set({ error: error.message });
        return [];
      }

      console.log('🟢 SupabaseFriendStore: Found friend requests:', data?.length || 0);

      const friendRequests = data || [];
      set({ friendRequests });
      return friendRequests;
      
    } catch (error) {
      console.error('🟢 SupabaseFriendStore: getFriendRequests error:', error);
      set({ error: error.message });
      return [];
    }
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
        id: request.id,
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