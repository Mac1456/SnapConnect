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
      console.log('🟢 SupabaseSnapStore: 📖 Starting sendStory with:', { mediaUri, mediaType, caption });
      set({ loading: true, error: null });
      
      // Get current user from auth store with enhanced logging
      const authState = useSupabaseAuthStore.getState();
      console.log('🟢 SupabaseSnapStore: 📖 Story - Auth state:', JSON.stringify(authState, null, 2));
      
      const user = authState.user;
      console.log('🟢 SupabaseSnapStore: 📖 Story - User object:', JSON.stringify(user, null, 2));
      
      if (!user) {
        console.error('🟢 SupabaseSnapStore: 📖 Story - No authenticated user found');
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      // Get user ID with multiple fallbacks and enhanced logging
      let userId = null;
      
      if (user?.uid) {
        userId = user.uid;
        console.log('🟢 SupabaseSnapStore: 📖 Story - Using user.uid:', userId);
      } else if (user?.id) {
        userId = user.id;
        console.log('🟢 SupabaseSnapStore: 📖 Story - Using user.id:', userId);
      } else if (user?.userId) {
        userId = user.userId;
        console.log('🟢 SupabaseSnapStore: 📖 Story - Using user.userId:', userId);
      } else if (authState.userId) {
        userId = authState.userId;
        console.log('🟢 SupabaseSnapStore: 📖 Story - Using authState.userId:', userId);
      }
      
      console.log('🟢 SupabaseSnapStore: 📖 Story - Final userId:', userId);
      
      if (!userId) {
        console.error('🟢 SupabaseSnapStore: 📖 Story - No user ID found. User object:', JSON.stringify(user, null, 2));
        console.error('🟢 SupabaseSnapStore: 📖 Story - Auth state:', JSON.stringify(authState, null, 2));
        set({ error: 'User ID not found', loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: 📖 Sending story for user:', userId);

      // Upload media to Supabase Storage
      const fileName = `stories/${userId}/${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      
      console.log('🟢 SupabaseSnapStore: 📖 Story - Uploading file:', fileName);
      console.log('🟢 SupabaseSnapStore: 📖 Story - Media URI:', mediaUri);
      
      const formData = new FormData();
      formData.append('file', {
        uri: mediaUri,
        name: fileName.split('/').pop(),
        type: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
      });
      
      console.log('🟢 SupabaseSnapStore: 📖 Story - FormData created for upload.');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, formData, {
          contentType: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
          upsert: false
        });

      if (uploadError) {
        console.error('�� SupabaseSnapStore: 📖 Story - Upload error:', uploadError.message);
        console.error('🟢 SupabaseSnapStore: 📖 Story - Upload error details:', JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      console.log('🟢 SupabaseSnapStore: 📖 Story - Upload successful:', JSON.stringify(uploadData, null, 2));

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      console.log('🟢 SupabaseSnapStore: 📖 Story - Public URL:', publicUrl);

      // Create story record
      const storyRecord = {
          user_id: userId,
          username: user.username || user.email?.split('@')[0] || 'Unknown',
          display_name: user.display_name || user.username || user.email?.split('@')[0] || 'Unknown',
          media_url: publicUrl,
          media_type: mediaType,
          caption: caption,
      };
      
      console.log('🟢 SupabaseSnapStore: 📖 Story - Creating story record:', JSON.stringify(storyRecord, null, 2));
      
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert(storyRecord)
        .select()
        .single();

      if (storyError) {
        console.error('🟢 SupabaseSnapStore: 📖 Story creation error:', storyError.message);
        console.error('🟢 SupabaseSnapStore: 📖 Story creation error details:', JSON.stringify(storyError, null, 2));
        throw storyError;
      }

      console.log('🟢 SupabaseSnapStore: 📖 Story sent successfully:', JSON.stringify(storyData, null, 2));
      
      // Refresh stories
      console.log('🟢 SupabaseSnapStore: 📖 Story - Refreshing stories list...');
      await get().loadAllStories(userId);
      
      set({ loading: false });
      
      return storyData;
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: 📖 sendStory error:', error.message);
      console.error('🟢 SupabaseSnapStore: 📖 sendStory error stack:', error.stack);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Load all stories (for discover/explore feed)
  loadAllStories: async (userId) => {
    try {
      console.log('🟢 SupabaseSnapStore: 📖 Starting loadAllStories for user:', userId);
      set({ loading: true, error: null });
      
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
        console.error('🟢 SupabaseSnapStore: 📖 Error loading all stories:', error.message);
        console.error('🟢 SupabaseSnapStore: 📖 Error details:', JSON.stringify(error, null, 2));
        set({ error: error.message, loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: 📖 Raw stories data from database:', data?.length, 'stories');
      console.log('🟢 SupabaseSnapStore: 📖 Raw stories data:', JSON.stringify(data, null, 2));

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const processedStories = data?.map(story => {
        console.log('🟢 SupabaseSnapStore: 📖 Processing story:', story.id, 'from user:', story.user_id);
        
        const processedStory = {
        id: story.id,
        userId: story.user_id,
        username: story.username || story.user?.username || 'Unknown',
        displayName: story.display_name || story.user?.display_name || story.username || 'Unknown',
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        caption: story.caption,
        createdAt: new Date(story.created_at),
        views: story.views || [],
        };
        
        console.log('🟢 SupabaseSnapStore: 📖 Processed story:', JSON.stringify(processedStory, null, 2));
        return processedStory;
      })
      .filter(story => story.createdAt > twentyFourHoursAgo) || [];

      console.log('🟢 SupabaseSnapStore: 📖 Final processed stories:', processedStories.length, 'stories');
      console.log('🟢 SupabaseSnapStore: 📖 Story user IDs:', processedStories.map(s => s.userId));
      console.log('🟢 SupabaseSnapStore: 📖 Story media URLs:', processedStories.map(s => s.mediaUrl));
      
      set({ stories: processedStories, loading: false });
      return processedStories;
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: 📖 loadAllStories error:', error.message);
      console.error('🟢 SupabaseSnapStore: 📖 loadAllStories error stack:', error.stack);
      set({ error: error.message, loading: false });
      return [];
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

  // Set up real-time subscription for stories
  setupStoriesListener: (userId) => {
    if (!userId) {
      console.log('🟢 SupabaseSnapStore: 📖 No userId provided for stories listener');
      return;
    }
    
    console.log('🟢 SupabaseSnapStore: 📖 Setting up stories listener for:', userId);
    
    // Clean up existing subscription
    get().unsubscribeFromStories?.();
    
    const subscription = supabase
      .channel('stories')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'stories'
        }, 
        (payload) => {
          console.log('🟢 SupabaseSnapStore: 📖 Stories change detected:', payload);
          console.log('🟢 SupabaseSnapStore: 📖 Stories change type:', payload.eventType);
          console.log('🟢 SupabaseSnapStore: 📖 Stories change data:', JSON.stringify(payload, null, 2));
          
          // Reload stories when changes occur
          console.log('🟢 SupabaseSnapStore: 📖 Refreshing stories due to realtime update');
          get().loadAllStories(userId);
        }
      )
      .subscribe();

    // Store unsubscribe function
    set({ 
      unsubscribeFromStories: () => {
        console.log('🟢 SupabaseSnapStore: 📖 Unsubscribing from stories');
        supabase.removeChannel(subscription);
      }
    });
  },

  // Clean up subscriptions
  unsubscribeFromSnaps: null,
  unsubscribeFromStories: null,

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
      console.log('🟢 SupabaseSnapStore: 📖 VIEWSTORY_START for story:', storyId, 'by user:', userId);
      
      if (!storyId || !userId) {
        console.log('🔴 SupabaseSnapStore: 📖 VIEWSTORY_ERROR: Missing storyId or userId.');
        return;
      }
      
      console.log('🟢 SupabaseSnapStore: 📖 VIEWSTORY_FETCHING_STORY');
      const { data: storyData, error: fetchError } = await supabase
        .from('stories')
        .select('views')
        .eq('id', storyId)
        .single();

      if (fetchError || !storyData) {
        console.log('🔴 SupabaseSnapStore: 📖 VIEWSTORY_ERROR: Failed to fetch story. Error:', fetchError?.message);
        console.log('🔴 SupabaseSnapStore: 📖 Story data was null:', !storyData);
        return;
      }

      console.log('🟢 SupabaseSnapStore: 📖 VIEWSTORY_FETCH_SUCCESS. Data:', JSON.stringify(storyData, null, 2));

      const currentViews = storyData.views || [];
      
      if (currentViews.includes(userId)) {
        console.log('🟢 SupabaseSnapStore: 📖 VIEWSTORY_ALREADY_VIEWED');
        return;
      }

      const updatedViews = [...currentViews, userId];
      console.log('🟢 SupabaseSnapStore: 📖 VIEWSTORY_UPDATING_VIEWS:', updatedViews);
      
      const { error: updateError } = await supabase
        .from('stories')
        .update({ views: updatedViews })
        .eq('id', storyId);

      if (updateError) {
        console.log('🔴 SupabaseSnapStore: 📖 VIEWSTORY_ERROR: Failed to update views. Error:', updateError.message);
        return; // Return instead of throwing to prevent crash
      }

      console.log('🟢 SupabaseSnapStore: 📖 VIEWSTORY_UPDATE_SUCCESS');

      // Update local state more safely
      const { stories } = get();
      if (stories && Array.isArray(stories)) {
      const updatedStories = stories.map(story => 
        story.id === storyId 
          ? { ...story, views: updatedViews }
          : story
      );
      set({ stories: updatedStories });
        console.log('🟢 SupabaseSnapStore: 📖 VIEWSTORY_LOCAL_STATE_UPDATED');
      } else {
        console.log('🟡 SupabaseSnapStore: 📖 VIEWSTORY_WARNING: Local stories state was not an array.');
      }
      
    } catch (error) {
      console.log('🔴 SupabaseSnapStore: 📖 VIEWSTORY_UNHANDLED_ERROR:', error.message);
      console.log('🔴 SupabaseSnapStore: 📖 VIEWSTORY_UNHANDLED_ERROR_STACK:', error.stack);
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
  },

  deleteStory: async (storyId, mediaUrl) => {
    try {
      console.log('🟢 SupabaseSnapStore: 🗑️ Deleting story:', storyId);
      set({ loading: true, error: null });

      // 1. Delete story from database
      const { error: dbError } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (dbError) {
        console.error('🟢 SupabaseSnapStore: 🗑️ Error deleting story from database:', dbError.message);
        throw dbError;
      }
      console.log('🟢 SupabaseSnapStore: 🗑️ Story deleted from database successfully.');

      // 2. Delete media from storage
      if (mediaUrl) {
        // Correctly parse the file path from the full URL
        const path = new URL(mediaUrl).pathname;
        const filePath = path.substring(path.indexOf('/stories/'));
        
        const { error: storageError } = await supabase.storage
          .from('media')
          .remove([filePath.slice(1)]); // Remove leading '/'
          
        if (storageError) {
          // Log error but don't throw, as the DB entry is already gone
          console.error('🟢 SupabaseSnapStore: 🗑️ Error deleting story media from storage:', storageError.message);
        } else {
          console.log('🟢 SupabaseSnapStore: 🗑️ Story media deleted from storage successfully.');
        }
      }

      // 3. Update local state
      set((state) => ({
        stories: state.stories.filter((story) => story.id !== storyId),
        loading: false,
      }));
      console.log('🟢 SupabaseSnapStore: 🗑️ Story removed from local state.');

    } catch (error) {
      console.error('🟢 SupabaseSnapStore: 🗑️ deleteStory error:', error.message);
      set({ error: error.message, loading: false });
    }
  },
})); 