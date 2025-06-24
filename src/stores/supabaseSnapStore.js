import { create } from 'zustand';
import { supabase } from '../../supabase.config';
import { useSupabaseAuthStore } from './supabaseAuthStore';

export const useSupabaseSnapStore = create((set, get) => ({
  snaps: [],
  chats: [],
  stories: [],
  loading: false,
  error: null,

  // Send a snap
  sendSnap: async (recipientId, mediaUri, mediaType, caption = '', timer = 3) => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from auth store
      const user = useSupabaseAuthStore.getState().user;
      
      if (!user || !user.uid) {
        console.error('🟢 SupabaseSnapStore: No authenticated user found');
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Sending snap for user:', user.uid);
      
      // Upload media to Supabase Storage
      const fileName = `snaps/${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob, {
          contentType: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
        });

      if (uploadError) {
        console.error('🟢 SupabaseSnapStore: Upload error:', uploadError);
        set({ error: uploadError.message, loading: false });
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Create snap record
      const { error: snapError } = await supabase
        .from('snaps')
        .insert({
          sender_id: user.uid,
          sender_username: user.username || user.email?.split('@')[0] || 'unknown',
          recipient_id: recipientId,
          media_url: publicUrl,
          media_type: mediaType,
          caption,
          timer,
          opened: false,
          created_at: new Date().toISOString(),
        });

      if (snapError) {
        console.error('🟢 SupabaseSnapStore: Snap creation error:', snapError);
        set({ error: snapError.message, loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Snap sent successfully');
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: sendSnap error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Send story
  sendStory: async (mediaUri, mediaType, caption = '') => {
    try {
      set({ loading: true, error: null });
      
      // Get current user from auth store
      const user = useSupabaseAuthStore.getState().user;
      
      if (!user || !user.uid) {
        console.error('🟢 SupabaseSnapStore: No authenticated user found');
        set({ error: 'User not authenticated', loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Sending story for user:', user.uid);

      // Create unique filename
      const fileName = `stories/${user.uid}/${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      
      // Convert URI to blob
      const response = await fetch(mediaUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob, {
          contentType: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
        });

      if (uploadError) {
        console.error('🟢 SupabaseSnapStore: Upload error:', uploadError);
        set({ error: uploadError.message, loading: false });
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Create story record
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.uid,
          username: user.username || user.email?.split('@')[0] || 'unknown',
          display_name: user.displayName || user.display_name || user.username || user.email?.split('@')[0] || 'Unknown User',
          media_url: publicUrl,
          media_type: mediaType,
          caption,
          views: [],
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        });

      if (storyError) {
        console.error('🟢 SupabaseSnapStore: Story creation error:', storyError);
        set({ error: storyError.message, loading: false });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Story sent successfully');
      set({ loading: false });
      
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: sendStory error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Listen to received snaps
  listenToSnaps: (userId) => {
    console.log('🟢 SupabaseSnapStore: Setting up snaps listener for:', userId);
    
    const subscription = supabase
      .channel('snaps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'snaps',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🟢 SupabaseSnapStore: Snap change:', payload);
          // Refresh snaps
          get().loadSnaps(userId);
        }
      )
      .subscribe();

    // Initial load
    get().loadSnaps(userId);

    return () => {
      console.log('🟢 SupabaseSnapStore: Unsubscribing from snaps');
      supabase.removeChannel(subscription);
    };
  },

  // Load snaps (helper function)
  loadSnaps: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('snaps')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🟢 SupabaseSnapStore: loadSnaps error:', error);
        return;
      }

      const snaps = data?.map(snap => ({
        id: snap.id,
        senderId: snap.sender_id,
        senderUsername: snap.sender_username,
        recipientId: snap.recipient_id,
        mediaUrl: snap.media_url,
        type: snap.media_type,
        caption: snap.caption,
        timer: snap.timer,
        opened: snap.opened,
        timestamp: new Date(snap.created_at).toLocaleString(),
        createdAt: snap.created_at,
      })) || [];

      set({ snaps });
      
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: loadSnaps error:', error);
    }
  },

  // Listen to stories from friends
  listenToStories: (friendIds) => {
    if (friendIds.length === 0) {
      set({ stories: [] });
      return () => {};
    }

    console.log('🟢 SupabaseSnapStore: Setting up stories listener for friends:', friendIds);
    
    const subscription = supabase
      .channel('stories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        (payload) => {
          console.log('🟢 SupabaseSnapStore: Story change:', payload);
          // Refresh stories
          get().loadStories(friendIds);
        }
      )
      .subscribe();

    // Initial load
    get().loadStories(friendIds);

    return () => {
      console.log('🟢 SupabaseSnapStore: Unsubscribing from stories');
      supabase.removeChannel(subscription);
    };
  },

  // Load stories (helper function)
  loadStories: async (friendIds) => {
    try {
      console.log('🟢 SupabaseSnapStore: Loading stories for friends:', friendIds);
      
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .in('user_id', friendIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🟢 SupabaseSnapStore: loadStories error:', error);
        return;
      }

      console.log('🟢 SupabaseSnapStore: Raw stories data:', data);

      const stories = data?.map(story => ({
        id: story.id,
        userId: story.user_id,
        username: story.username,
        displayName: story.display_name,
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        caption: story.caption,
        views: story.views || [],
        expiresAt: story.expires_at,
        createdAt: story.created_at,
      })) || [];

      console.log('🟢 SupabaseSnapStore: Processed stories:', stories.length, 'stories');
      set({ stories });
      
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: loadStories error:', error);
    }
  },

  // Load all stories (including user's own)
  loadAllStories: async (userId) => {
    try {
      console.log('🟢 SupabaseSnapStore: Loading all stories...');
      
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🟢 SupabaseSnapStore: loadAllStories error:', error);
        return;
      }

      console.log('🟢 SupabaseSnapStore: Raw all stories data:', data?.length || 0, 'stories');

      const stories = data?.map(story => ({
        id: story.id,
        userId: story.user_id,
        username: story.username,
        displayName: story.display_name,
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        caption: story.caption,
        views: story.views || [],
        expiresAt: story.expires_at,
        createdAt: story.created_at,
      })) || [];

      console.log('🟢 SupabaseSnapStore: Processed all stories:', stories.length, 'stories');
      set({ stories });
      
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: loadAllStories error:', error);
    }
  },

  // Mark snap as opened
  markSnapOpened: async (snapId) => {
    try {
      const { error } = await supabase
        .from('snaps')
        .update({
          opened: true,
          opened_at: new Date().toISOString(),
        })
        .eq('id', snapId);

      if (error) {
        console.error('🟢 SupabaseSnapStore: markSnapOpened error:', error);
        set({ error: error.message });
        return;
      }

      console.log('🟢 SupabaseSnapStore: Snap marked as opened');
      
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: markSnapOpened error:', error);
      set({ error: error.message });
    }
  },

  // View story
  viewStory: async (storyId, userId) => {
    try {
      // Get current story to update views array
      const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('views')
        .eq('id', storyId)
        .single();

      if (fetchError) {
        console.error('🟢 SupabaseSnapStore: viewStory fetch error:', fetchError);
        return;
      }

      const currentViews = story.views || [];
      if (!currentViews.includes(userId)) {
        const { error } = await supabase
          .from('stories')
          .update({
            views: [...currentViews, userId],
          })
          .eq('id', storyId);

        if (error) {
          console.error('🟢 SupabaseSnapStore: viewStory error:', error);
          set({ error: error.message });
          return;
        }

        console.log('🟢 SupabaseSnapStore: Story view recorded');
      }
      
    } catch (error) {
      console.error('🟢 SupabaseSnapStore: viewStory error:', error);
      set({ error: error.message });
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 