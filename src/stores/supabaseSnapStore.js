import { create } from 'zustand';
import { supabase } from '../../supabase.config';
import { useSupabaseAuthStore } from './supabaseAuthStore';

export const useSupabaseSnapStore = create((set, get) => ({
  snaps: [],
  chats: [],
  stories: [],
  messages: [],
  loading: false,
  error: null,

  // Send a snap
  sendSnap: async (recipientId, mediaUri, mediaType, caption = '', timer = 3) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from auth store with enhanced logging
      const authState = useSupabaseAuthStore.getState();
      console.log('🟢 SupabaseSnapStore: Auth state:', authState);
      
      const user = authState.user;
      console.log('🟢 SupabaseSnapStore: User object:', user);
      
      if (!user) {
        console.error('🟢 SupabaseSnapStore: No authenticated user found');
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      // Get user ID with multiple fallbacks and enhanced logging
      let userId = null;
      
      // Try different possible user ID fields
      if (user?.uid) {
        userId = user.uid;
        console.log('🟢 SupabaseSnapStore: Using user.uid:', userId);
      } else if (user?.id) {
        userId = user.id;
        console.log('🟢 SupabaseSnapStore: Using user.id:', userId);
      } else if (user?.userId) {
        userId = user.userId;
        console.log('🟢 SupabaseSnapStore: Using user.userId:', userId);
      } else if (authState.userId) {
        userId = authState.userId;
        console.log('🟢 SupabaseSnapStore: Using authState.userId:', userId);
      }
      
      console.log('🟢 SupabaseSnapStore: Final userId:', userId);
      console.log('🟢 SupabaseSnapStore: User object keys:', Object.keys(user || {}));
      
      if (!userId) {
        console.error('🟢 SupabaseSnapStore: No user ID found. User object:', JSON.stringify(user, null, 2));
        console.error('🟢 SupabaseSnapStore: Auth state:', JSON.stringify(authState, null, 2));
        set({ error: 'User ID not found', loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Sending snap for user:', userId, 'to recipient:', recipientId);

      // Upload media to Supabase Storage
      const fileName = `snaps/${userId}/${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      
      console.log('🟢 SupabaseSnapStore: Uploading file:', fileName);
      
      // Convert file URI to blob for upload
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      
      console.log('🟢 SupabaseSnapStore: Blob created, size:', blob.size);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob, {
          contentType: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
          upsert: false
        });

      if (uploadError) {
        console.error('🟢 SupabaseSnapStore: Upload error:', uploadError);
        throw uploadError;
      }

      console.log('🟢 SupabaseSnapStore: Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      console.log('🟢 SupabaseSnapStore: Public URL:', publicUrl);

      // Create snap record
      const snapRecord = {
        sender_id: userId,
        sender_username: user.username || user.email?.split('@')[0] || 'Unknown',
        recipient_id: recipientId,
        media_url: publicUrl,
        media_type: mediaType,
        caption: caption,
        timer: timer
      };
      
      console.log('🟢 SupabaseSnapStore: Creating snap record:', snapRecord);

      const { data: snapData, error: snapError } = await supabase
        .from('snaps')
        .insert(snapRecord)
        .select()
        .single();

      if (snapError) {
        console.error('🟢 SupabaseSnapStore: Snap creation error:', snapError);
        throw snapError;
      }

      console.log('🟢 SupabaseSnapStore: Snap sent successfully:', snapData);
      set({ loading: false });
      
      return snapData;
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: sendSnap error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Send a story
  sendStory: async (mediaUri, mediaType, caption = '') => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from auth store with enhanced logging
      const authState = useSupabaseAuthStore.getState();
      console.log('🟢 SupabaseSnapStore: Story - Auth state:', authState);
      
      const user = authState.user;
      console.log('🟢 SupabaseSnapStore: Story - User object:', user);
      
      if (!user) {
        console.error('🟢 SupabaseSnapStore: Story - No authenticated user found');
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      // Get user ID with multiple fallbacks and enhanced logging
      let userId = null;
      
      if (user?.uid) {
        userId = user.uid;
        console.log('🟢 SupabaseSnapStore: Story - Using user.uid:', userId);
      } else if (user?.id) {
        userId = user.id;
        console.log('🟢 SupabaseSnapStore: Story - Using user.id:', userId);
      } else if (user?.userId) {
        userId = user.userId;
        console.log('🟢 SupabaseSnapStore: Story - Using user.userId:', userId);
      } else if (authState.userId) {
        userId = authState.userId;
        console.log('🟢 SupabaseSnapStore: Story - Using authState.userId:', userId);
      }
      
      console.log('🟢 SupabaseSnapStore: Story - Final userId:', userId);
      
      if (!userId) {
        console.error('🟢 SupabaseSnapStore: Story - No user ID found. User object:', JSON.stringify(user, null, 2));
        console.error('🟢 SupabaseSnapStore: Story - Auth state:', JSON.stringify(authState, null, 2));
        set({ error: 'User ID not found', loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Sending story for user:', userId);

      // Upload media to Supabase Storage
      const fileName = `stories/${userId}/${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      
      console.log('🟢 SupabaseSnapStore: Story - Uploading file:', fileName);
      
      // Convert file URI to blob for upload
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      
      console.log('🟢 SupabaseSnapStore: Story - Blob created, size:', blob.size);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob, {
          contentType: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
          upsert: false
        });

      if (uploadError) {
        console.error('🟢 SupabaseSnapStore: Story - Upload error:', uploadError);
        throw uploadError;
      }

      console.log('🟢 SupabaseSnapStore: Story - Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      console.log('🟢 SupabaseSnapStore: Story - Public URL:', publicUrl);

      // Create story record
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          username: user.username || user.email?.split('@')[0] || 'Unknown',
          display_name: user.display_name || user.username || user.email?.split('@')[0] || 'Unknown',
          media_url: publicUrl,
          media_type: mediaType,
          caption: caption,
          // Removed expires_at column reference - stories don't expire in our simplified MVP
        })
        .select()
        .single();

      if (storyError) {
        console.error('🟢 SupabaseSnapStore: Story creation error:', storyError);
        throw storyError;
      }

      console.log('🟢 SupabaseSnapStore: Story sent successfully:', storyData);
      
      // Refresh stories
      await get().loadAllStories();
      
      set({ loading: false });
      
      return storyData;
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: sendStory error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Load all stories (for discover/explore feed)
  loadAllStories: async () => {
    try {
      console.log('🟢 SupabaseSnapStore: Loading all stories...');
      
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:user_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🟢 SupabaseSnapStore: Error loading all stories:', error);
        set({ error: error.message });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Raw all stories data:', data?.length, 'stories');

      const processedStories = data?.map(story => ({
        id: story.id,
        userId: story.user_id,
        username: story.username || story.user?.username || 'Unknown',
        displayName: story.display_name || story.user?.display_name || story.username || 'Unknown',
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        caption: story.caption,
        createdAt: new Date(story.created_at),
        // Removed expiresAt reference since column doesn't exist
        views: story.views || [],
      })) || [];

      console.log('🟢 SupabaseSnapStore: Processed all stories:', processedStories.length, 'stories');
      set({ allStories: processedStories });
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: loadAllStories error:', error);
      set({ error: error.message });
    }
  },

  // Load user snaps
  loadUserSnaps: async () => {
    try {
      // Get current user from auth store
      const authState = useSupabaseAuthStore.getState();
      const user = authState.user;
      
      if (!user) {
        console.error('🟢 SupabaseSnapStore: No authenticated user found');
        return [];
      }

      // Get user ID with multiple fallbacks
      const userId = user.uid || user.id || user.userId || authState.userId;
      
      if (!userId) {
        console.error('🟢 SupabaseSnapStore: No user ID found');
        return [];
      }

      console.log('🟢 SupabaseSnapStore: Loading snaps for user:', userId);

      const { data: snapsData, error } = await supabase
        .from('snaps')
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            display_name,
            profile_picture
          ),
          recipient:recipient_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🟢 SupabaseSnapStore: Error loading snaps:', error);
        throw error;
      }

      // Process snaps data
      const processedSnaps = snapsData?.map(snap => ({
        id: snap.id,
        senderId: snap.sender_id,
        recipientId: snap.recipient_id,
        mediaUrl: snap.media_url,
        mediaType: snap.media_type,
        caption: snap.caption,
        timer: snap.timer,
        viewed: snap.viewed,
        createdAt: new Date(snap.created_at),
        sender: {
          id: snap.sender?.id || snap.sender_id,
          username: snap.sender?.username || 'Unknown',
          displayName: snap.sender?.display_name || snap.sender?.username || 'Unknown User',
          profilePicture: snap.sender?.profile_picture
        },
        recipient: {
          id: snap.recipient?.id || snap.recipient_id,
          username: snap.recipient?.username || 'Unknown',
          displayName: snap.recipient?.display_name || snap.recipient?.username || 'Unknown User',
          profilePicture: snap.recipient?.profile_picture
        }
      })) || [];

      set({ snaps: processedSnaps });
      return processedSnaps;
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: loadUserSnaps error:', error);
      set({ error: error.message });
      return [];
    }
  },

  // Set up real-time subscription for snaps
  setupSnapsListener: (userId) => {
    if (!userId) return;
    
    console.log('🟢 SupabaseSnapStore: Setting up snaps listener for:', userId);
    
    // Clean up existing subscription
    get().unsubscribeFromSnaps?.();
    
    const subscription = supabase
      .channel('snaps')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'snaps',
          filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`
        }, 
        (payload) => {
          console.log('🟢 SupabaseSnapStore: Snaps change:', payload);
          // Reload snaps when changes occur
          get().loadUserSnaps();
        }
      )
      .subscribe();

    // Store unsubscribe function
    set({ 
      unsubscribeFromSnaps: () => {
        console.log('🟢 SupabaseSnapStore: Unsubscribing from snaps');
        supabase.removeChannel(subscription);
      }
    });
  },

  // Clean up subscriptions
  unsubscribeFromSnaps: null,

  // Clear error
  clearError: () => set({ error: null }),

  // Mark snap as viewed
  markSnapAsViewed: async (snapId) => {
    try {
      const { error } = await supabase
        .from('snaps')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', snapId);

      if (error) {
        console.error('🟢 SupabaseSnapStore: Error marking snap as viewed:', error);
        throw error;
      }

      // Update local state
      const { snaps } = get();
      const updatedSnaps = snaps.map(snap => 
        snap.id === snapId ? { ...snap, viewed: true } : snap
      );
      set({ snaps: updatedSnaps });
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: markSnapAsViewed error:', error);
    }
  },

  // View story function - missing function that was causing the error
  viewStory: async (storyId, userId) => {
    try {
      console.log('🟢 SupabaseSnapStore: Viewing story:', storyId, 'by user:', userId);
      
      // First get the current story to check existing views
      const { data: storyData, error: fetchError } = await supabase
        .from('stories')
        .select('views')
        .eq('id', storyId)
        .single();

      if (fetchError) {
        console.error('🟢 SupabaseSnapStore: Error fetching story for view:', fetchError);
        return;
      }

      // Check if user has already viewed this story
      const currentViews = storyData?.views || [];
      if (currentViews.includes(userId)) {
        console.log('🟢 SupabaseSnapStore: User has already viewed this story');
        return;
      }

      // Add user to views array
      const updatedViews = [...currentViews, userId];
      
      const { error } = await supabase
        .from('stories')
        .update({ views: updatedViews })
        .eq('id', storyId);

      if (error) {
        console.error('🟢 SupabaseSnapStore: Error updating story views:', error);
        throw error;
      }

      // Update local state
      const { stories } = get();
      const updatedStories = stories.map(story => 
        story.id === storyId 
          ? { ...story, views: updatedViews }
          : story
      );
      set({ stories: updatedStories });
      
      console.log('🟢 SupabaseSnapStore: Story view recorded successfully');
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: viewStory error:', error);
    }
  },

  // Send a message with disappearing timer
  sendMessage: async (recipientId, content, messageType = 'text', mediaUrl = null, disappearTimer = null) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from auth store
      const authState = useSupabaseAuthStore.getState();
      const user = authState.user;
      
      if (!user) {
        console.error('🟢 SupabaseSnapStore: No authenticated user found');
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      const userId = user.uid || user.id || user.userId || authState.userId;
      
      if (!userId) {
        console.error('🟢 SupabaseSnapStore: No user ID found');
        set({ error: 'User ID not found', loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Sending message from:', userId, 'to:', recipientId);

      // Create message record with optional disappearing timer
      const messageData = {
        sender_id: userId,
        recipient_id: recipientId,
        content: content,
        message_type: messageType,
        media_url: mediaUrl,
      };

      // Add disappearing timer if specified
      if (disappearTimer) {
        messageData.deleted_at = new Date(Date.now() + (disappearTimer * 1000)).toISOString();
      }

      const { data: messageResult, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) {
        console.error('🟢 SupabaseSnapStore: Message creation error:', messageError);
        throw messageError;
      }

      console.log('🟢 SupabaseSnapStore: Message sent successfully');
      set({ loading: false });
      
      return messageResult;
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: sendMessage error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Create a group chat
  createGroupChat: async (memberIds, groupName) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from auth store
      const authState = useSupabaseAuthStore.getState();
      const user = authState.user;
      
      if (!user) {
        console.error('🟢 SupabaseSnapStore: No authenticated user found');
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      const userId = user.uid || user.id || user.userId || authState.userId;
      
      // Add current user to members if not already included
      const allMembers = memberIds.includes(userId) ? memberIds : [userId, ...memberIds];

      console.log('🟢 SupabaseSnapStore: Creating group chat with members:', allMembers);

      // For now, we'll use a simple approach - send a system message to indicate group creation
      // In a full implementation, you'd want a separate groups table
      const groupMessage = {
        sender_id: userId,
        recipient_id: null, // null indicates it's a group message
        content: `${user.username || 'User'} created a group: ${groupName}`,
        message_type: 'system',
        group_members: allMembers,
      };

      const { data: groupResult, error: groupError } = await supabase
        .from('messages')
        .insert(groupMessage)
        .select()
        .single();

      if (groupError) {
        console.error('🟢 SupabaseSnapStore: Group creation error:', groupError);
        throw groupError;
      }

      console.log('🟢 SupabaseSnapStore: Group chat created successfully');
      set({ loading: false });
      
      return groupResult;
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: createGroupChat error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Load messages for a conversation
  loadMessages: async (recipientId, isGroup = false) => {
    try {
      // Get current user from auth store
      const authState = useSupabaseAuthStore.getState();
      const user = authState.user;
      
      if (!user) {
        console.error('🟢 SupabaseSnapStore: No authenticated user found');
        return [];
      }

      const userId = user.uid || user.id || user.userId || authState.userId;
      
      console.log('🟢 SupabaseSnapStore: Loading messages between:', userId, 'and:', recipientId);

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            display_name,
            profile_picture
          ),
          recipient:recipient_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .order('created_at', { ascending: true });

      if (isGroup) {
        // For group messages, check if user is in group_members array
        query = query.contains('group_members', [userId]);
      } else {
        // For direct messages
        query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`);
      }

      const { data: messagesData, error } = await query;

      if (error) {
        console.error('🟢 SupabaseSnapStore: Error loading messages:', error);
        throw error;
      }

      // Filter out messages that should have disappeared
      const activeMessages = messagesData?.filter(msg => {
        if (!msg.deleted_at) return true;
        return new Date(msg.deleted_at) > new Date();
      }) || [];

      // Process messages data
      const processedMessages = activeMessages.map(msg => ({
        id: msg.id,
        text: msg.content,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        messageType: msg.message_type,
        mediaUrl: msg.media_url,
        timestamp: new Date(msg.created_at),
        deletesAt: msg.deleted_at ? new Date(msg.deleted_at) : null,
        isCurrentUser: msg.sender_id === userId,
        senderName: msg.sender?.display_name || msg.sender?.username || 'Unknown',
        groupMembers: msg.group_members,
        isGroup: !!msg.group_members,
      }));

      set({ messages: processedMessages });
      return processedMessages;
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: loadMessages error:', error);
      set({ error: error.message });
      return [];
    }
  },

  // Auto-delete expired messages
  cleanupExpiredMessages: async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .lt('deleted_at', new Date().toISOString());

      if (error) {
        console.error('🟢 SupabaseSnapStore: Error cleaning up expired messages:', error);
      } else {
        console.log('🟢 SupabaseSnapStore: Expired messages cleaned up');
      }
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: cleanupExpiredMessages error:', error);
    }
  },

  // Load snaps for current user
  loadSnaps: async (userId) => {
    try {
      console.log('🟢 SupabaseSnapStore: Loading snaps for user:', userId);
      
      const { data, error } = await supabase
        .from('snaps')
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            display_name,
            profile_picture
          ),
          recipient:recipient_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🟢 SupabaseSnapStore: Error loading snaps:', error);
        set({ error: error.message });
        return;
      }

      const processedSnaps = data?.map(snap => ({
        id: snap.id,
        senderId: snap.sender_id,
        recipientId: snap.recipient_id,
        mediaUrl: snap.media_url,
        mediaType: snap.media_type,
        caption: snap.caption,
        timer: snap.timer,
        viewed: snap.viewed,
        createdAt: new Date(snap.created_at),
        sender: {
          id: snap.sender?.id || snap.sender_id,
          username: snap.sender?.username || snap.sender_username || 'Unknown',
          displayName: snap.sender?.display_name || snap.sender?.username || 'Unknown User',
          profilePicture: snap.sender?.profile_picture
        },
        recipient: {
          id: snap.recipient?.id || snap.recipient_id,
          username: snap.recipient?.username || 'Unknown',
          displayName: snap.recipient?.display_name || snap.recipient?.username || 'Unknown User',
          profilePicture: snap.recipient?.profile_picture
        }
      })) || [];

      console.log('🟢 SupabaseSnapStore: Processed snaps:', processedSnaps.length);
      set({ snaps: processedSnaps });
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: loadSnaps error:', error);
      set({ error: error.message });
    }
  }
})); 