import { create } from 'zustand';
import { supabase } from '../../supabase.config';
import { useSupabaseAuthStore } from './supabaseAuthStore';

export const useGroupChatStore = create((set, get) => ({
  groupChats: [],
  currentGroupChat: null,
  groupMessages: [],
  loading: false,
  error: null,

  // Get all group chats for the current user
  getGroupChats: async () => {
    try {
      console.log('💬 GroupChatStore: Loading group chats...');
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('group_chats')
        .select(`
          *,
          creator:creator_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .contains('member_ids', [userId])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      console.log('💬 GroupChatStore: Loaded', data.length, 'group chats');
      set({ groupChats: data || [], loading: false });

      return data || [];

    } catch (error) {
      console.error('💬 GroupChatStore: Error loading group chats:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Create a new group chat
  createGroupChat: async (name, description = '', memberIds = []) => {
    try {
      console.log('💬 GroupChatStore: Creating group chat:', { name, description, memberIds });
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Include creator in member list
      const allMemberIds = [...new Set([userId, ...memberIds])];

      const { data, error } = await supabase
        .from('group_chats')
        .insert({
          name,
          description,
          creator_id: userId,
          member_ids: allMemberIds,
          admin_ids: [userId] // Creator is initially the only admin
        })
        .select(`
          *,
          creator:creator_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .single();

      if (error) throw error;

      console.log('💬 GroupChatStore: Group chat created:', data);

      // Add to local state
      set(state => ({
        groupChats: [data, ...state.groupChats],
        loading: false
      }));

      // Send a system message welcoming everyone
      await get().sendSystemMessage(data.id, `${user.user_metadata?.display_name || user.user_metadata?.username || 'Someone'} created the group "${name}"`);

      return data;

    } catch (error) {
      console.error('💬 GroupChatStore: Error creating group chat:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Add members to a group chat
  addMembers: async (groupChatId, newMemberIds) => {
    try {
      console.log('💬 GroupChatStore: Adding members to group:', { groupChatId, newMemberIds });
      if (!groupChatId || !newMemberIds || newMemberIds.length === 0) {
        throw new Error('Group chat ID and new member IDs are required.');
      }
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      // Get current group info
      const { data: groupChat, error: fetchError } = await supabase
        .from('group_chats')
        .select('member_ids, admin_ids')
        .eq('id', groupChatId)
        .single();

      if (fetchError) throw fetchError;

      // Check if user is admin
      if (!groupChat.admin_ids.includes(userId)) {
        throw new Error('Only admins can add members.');
      }

      // Merge member lists, ensuring no duplicates
      const updatedMemberIds = [...new Set([...groupChat.member_ids, ...newMemberIds])];

      const { data: updatedGroup, error } = await supabase
        .from('group_chats')
        .update({ 
          member_ids: updatedMemberIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupChatId)
        .select(`
          *,
          creator:creator_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        groupChats: state.groupChats.map(chat =>
          chat.id === groupChatId ? updatedGroup : chat
        ),
        currentGroupChat: state.currentGroupChat?.id === groupChatId ? updatedGroup : state.currentGroupChat,
        loading: false
      }));

      console.log('💬 GroupChatStore: Members added successfully. New member count:', updatedGroup.member_ids?.length);
      return updatedGroup;
    } catch (error) {
      console.error('💬 GroupChatStore: Error adding members:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Remove a member from a group chat
  removeMember: async (groupChatId, memberIdToRemove) => {
    try {
      console.log('💬 GroupChatStore: Removing member from group:', { groupChatId, memberIdToRemove });
       if (!groupChatId || !memberIdToRemove) {
        throw new Error('Group chat ID and member ID are required.');
      }
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (userId === memberIdToRemove) {
        throw new Error('You cannot remove yourself. Use "Leave Group" instead.');
      }
      
      const { data: groupChat, error: fetchError } = await supabase
        .from('group_chats')
        .select('member_ids, admin_ids')
        .eq('id', groupChatId)
        .single();

      if (fetchError) throw fetchError;

      if (!groupChat.admin_ids.includes(userId)) {
        throw new Error('Only admins can remove members.');
      }

      const updatedMemberIds = groupChat.member_ids.filter(id => id !== memberIdToRemove);
      const updatedAdminIds = groupChat.admin_ids.filter(id => id !== memberIdToRemove);
      
      const { data: updatedGroup, error } = await supabase
        .from('group_chats')
        .update({ 
          member_ids: updatedMemberIds,
          admin_ids: updatedAdminIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupChatId)
        .select(`
          *,
          creator:creator_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .single();

      if (error) throw error;

      set(state => ({
        groupChats: state.groupChats.map(chat =>
          chat.id === groupChatId ? updatedGroup : chat
        ),
        currentGroupChat: state.currentGroupChat?.id === groupChatId ? updatedGroup : state.currentGroupChat,
        loading: false
      }));

      console.log('💬 GroupChatStore: Member removed successfully. New member count:', updatedGroup.member_ids?.length);
      return updatedGroup;
    } catch (error) {
      console.error('💬 GroupChatStore: Error removing member:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Send a message to a group chat
  sendGroupMessage: async (groupChatId, content, messageType = 'text', mediaUrl = null, timerSeconds = 0) => {
    try {
      console.log('💬 GroupChatStore: Sending group message:', { groupChatId, content, messageType, timerSeconds });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get group members for the message
      const { data: groupChat } = await supabase
        .from('group_chats')
        .select('member_ids')
        .eq('id', groupChatId)
        .single();

      if (!groupChat) {
        throw new Error('Group chat not found');
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          recipient_id: null, // Explicitly set to null for group messages
          content,
          message_type: messageType,
          media_url: mediaUrl,
          group_chat_id: groupChatId,
          group_members: groupChat.member_ids,
          timer_seconds: timerSeconds || 0
        })
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .single();

      if (error) {
        console.error('💬 GroupChatStore: Supabase error sending message:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('💬 GroupChatStore: 📤 Group message sent:', data);

      // Optimistically add message to local state for immediate feedback
      const optimisticMessage = {
        id: data.id,
        text: data.content,
        senderId: data.sender_id,
        senderName: data.sender?.display_name || data.sender?.username || 'You',
        timestamp: new Date(data.created_at),
        isSystem: data.message_type === 'system',
        timerSeconds: data.timer_seconds || 0
      };

      // Only add if it doesn't already exist (to prevent duplicates)
      const currentState = get();
      const existingMessage = currentState.groupMessages.find(msg => msg.id === data.id);
      
      if (!existingMessage) {
        console.log('💬 GroupChatStore: 📤 Adding sent message to local state optimistically');
        set(state => ({
          groupMessages: [...state.groupMessages, optimisticMessage]
        }));
      }

      // Update group chat timestamp
      await supabase
        .from('group_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', groupChatId);

      return data;

    } catch (error) {
      console.error('💬 GroupChatStore: Error sending group message:', JSON.stringify(error, null, 2));
      set({ error: error.message });
      throw error; // Re-throw so the UI can handle it
    }
  },

  // Send a system message (for group events)
  sendSystemMessage: async (groupChatId, content) => {
    try {
      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      const { data: groupChat } = await supabase
        .from('group_chats')
        .select('member_ids')
        .eq('id', groupChatId)
        .single();

      if (!groupChat) return;

      await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          content,
          message_type: 'system',
          group_chat_id: groupChatId,
          group_members: groupChat.member_ids
        });

    } catch (error) {
      console.error('💬 GroupChatStore: Error sending system message:', error);
    }
  },

  // Load messages for a specific group chat
  loadGroupMessages: async (groupChatId) => {
    try {
      console.log('💬 GroupChatStore: Loading messages for group:', groupChatId);
      set({ loading: true, error: null });

      if (!groupChatId) {
        throw new Error('Group chat ID is required');
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            display_name,
            profile_picture
          )
        `)
        .eq('group_chat_id', groupChatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('💬 GroupChatStore: Supabase error loading messages:', error);
        throw error;
      }

      console.log('💬 GroupChatStore: Raw messages from database:', data);

      // Process messages for display
      const processedMessages = (data || []).map(msg => ({
        id: msg.id,
        text: msg.content,
        senderId: msg.sender_id,
        senderName: msg.sender?.display_name || msg.sender?.username || 'Unknown',
        timestamp: new Date(msg.created_at),
        isSystem: msg.message_type === 'system',
        timerSeconds: msg.timer_seconds || 0
      }));

      console.log('💬 GroupChatStore: Processed messages:', processedMessages);
      console.log('💬 GroupChatStore: Loaded', processedMessages.length, 'group messages');
      
      set({ groupMessages: processedMessages, loading: false });
      return processedMessages;

    } catch (error) {
      console.error('💬 GroupChatStore: Error loading group messages:', error);
      set({ error: error.message, loading: false, groupMessages: [] });
      return [];
    }
  },

  // Set up real-time subscription for group messages
  setupGroupMessageSubscription: (groupChatId) => {
    console.log('💬 GroupChatStore: 📡 Setting up real-time subscription for group:', groupChatId);
    
    if (!groupChatId) {
      console.error('💬 GroupChatStore: 📡 Cannot setup subscription - no group chat ID provided');
      return null;
    }

    if (!supabase) {
      console.error('💬 GroupChatStore: 📡 Supabase client not available');
      return null;
    }

    let subscription = null;
    let retryCount = 0;
    const maxRetries = 3;

    const createSubscription = () => {
      try {
        console.log('💬 GroupChatStore: 📡 Creating Supabase channel...');
        
        const channelName = `group-messages-${groupChatId}-${Date.now()}`;
        const channel = supabase.channel(channelName);
        
        if (!channel) {
          console.error('💬 GroupChatStore: 📡 Failed to create channel');
          return null;
        }

        subscription = channel
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `group_chat_id=eq.${groupChatId}`
            },
            async (payload) => {
              console.log('💬 GroupChatStore: 📨 Real-time message received:', {
                event: payload.eventType,
                table: payload.table,
                messageId: payload.new?.id,
                senderId: payload.new?.sender_id,
                content: payload.new?.content?.substring(0, 30) + '...'
              });
              
              if (payload.new) {
                try {
                  // Check if message already exists to prevent duplicates
                  const currentState = get();
                  const existingMessage = currentState.groupMessages.find(msg => msg.id === payload.new.id);
                  
                  if (existingMessage) {
                    console.log('💬 GroupChatStore: 📨 Message already exists, skipping:', payload.new.id);
                    return;
                  }

                  console.log('💬 GroupChatStore: 📨 Fetching sender information...');
                  
                  // Fetch the sender information
                  const { data: sender, error: senderError } = await supabase
                    .from('users')
                    .select('id, username, display_name, profile_picture')
                    .eq('id', payload.new.sender_id)
                    .single();

                  if (senderError) {
                    console.error('💬 GroupChatStore: 📨 Error fetching sender:', senderError);
                  }

                  const newMessage = {
                    id: payload.new.id,
                    text: payload.new.content,
                    senderId: payload.new.sender_id,
                    senderName: sender?.display_name || sender?.username || 'Unknown',
                    timestamp: new Date(payload.new.created_at),
                    isSystem: payload.new.message_type === 'system',
                    timerSeconds: payload.new.timer_seconds || 0
                  };

                  console.log('💬 GroupChatStore: 📨 Adding new message to state:', {
                    id: newMessage.id,
                    text: newMessage.text.substring(0, 30) + '...',
                    sender: newMessage.senderName,
                    timestamp: newMessage.timestamp.toLocaleTimeString(),
                    timerSeconds: newMessage.timerSeconds
                  });
                  
                  set(state => ({
                    groupMessages: [...state.groupMessages, newMessage]
                  }));
                  
                  console.log('💬 GroupChatStore: 📨 Total messages after adding:', get().groupMessages.length);
                  
                } catch (messageError) {
                  console.error('💬 GroupChatStore: 📨 Error processing real-time message:', messageError);
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('💬 GroupChatStore: 📡 Subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ GroupChatStore: 📡 Successfully subscribed to group messages');
              retryCount = 0; // Reset retry count on successful subscription
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ GroupChatStore: 📡 Channel error in subscription');
              
              // Retry subscription with exponential backoff
              if (retryCount < maxRetries) {
                retryCount++;
                const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
                console.log(`💬 GroupChatStore: 📡 Retrying subscription in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
                
                setTimeout(() => {
                  if (subscription) {
                    subscription.unsubscribe();
                  }
                  subscription = createSubscription();
                }, delay);
              } else {
                console.error('❌ GroupChatStore: 📡 Max retries reached, giving up on subscription');
              }
            } else if (status === 'TIMED_OUT') {
              console.error('❌ GroupChatStore: 📡 Subscription timed out');
            } else if (status === 'CLOSED') {
              console.log('💬 GroupChatStore: 📡 Subscription closed');
            }
          });

        console.log('💬 GroupChatStore: 📡 Subscription created successfully:', {
          subscriptionExists: !!subscription,
          subscriptionType: typeof subscription,
          hasUnsubscribe: subscription && typeof subscription.unsubscribe === 'function',
          channelName
        });
        
        return subscription;
      } catch (error) {
        console.error('❌ GroupChatStore: 📡 Error creating subscription:', error);
        return null;
      }
    };

    // Create initial subscription
    subscription = createSubscription();
    
    // Return cleanup function
    return () => {
      console.log('💬 GroupChatStore: 📡 Cleanup function called for subscription');
      
      if (subscription) {
        try {
          console.log('💬 GroupChatStore: 📡 Unsubscribing from group messages');
          subscription.unsubscribe();
          console.log('💬 GroupChatStore: 📡 Successfully unsubscribed from group messages');
        } catch (unsubscribeError) {
          console.error('❌ GroupChatStore: 📡 Error during unsubscribe:', unsubscribeError);
        }
      } else {
        console.log('💬 GroupChatStore: 📡 No subscription to unsubscribe from');
      }
    };
  },

  // Delete a group chat (admin only)
  deleteGroup: async (groupChatId) => {
    try {
      console.log('💬 GroupChatStore: Deleting group:', groupChatId);
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get current group info to check admin status
      const { data: groupChat, error: fetchError } = await supabase
        .from('group_chats')
        .select('admin_ids, name, creator_id')
        .eq('id', groupChatId)
        .single();

      if (fetchError) throw fetchError;

      // Check if user is admin or creator
      if (!groupChat.admin_ids.includes(userId) && groupChat.creator_id !== userId) {
        throw new Error('Only group admins can delete the group.');
      }

      // Delete all group messages first
      const { error: messagesError } = await supabase
        .from('group_messages')
        .delete()
        .eq('group_chat_id', groupChatId);

      if (messagesError) {
        console.warn('💬 GroupChatStore: Error deleting group messages:', messagesError);
        // Continue with group deletion even if message deletion fails
      }

      // Delete the group chat
      const { error: deleteError } = await supabase
        .from('group_chats')
        .delete()
        .eq('id', groupChatId);

      if (deleteError) throw deleteError;

      // Remove from local state
      set(state => ({
        groupChats: state.groupChats.filter(chat => chat.id !== groupChatId),
        currentGroupChat: state.currentGroupChat?.id === groupChatId ? null : state.currentGroupChat,
        groupMessages: state.currentGroupChat?.id === groupChatId ? [] : state.groupMessages,
        loading: false
      }));

      console.log('💬 GroupChatStore: Group deleted successfully');
      return true;

    } catch (error) {
      console.error('💬 GroupChatStore: Error deleting group:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Leave a group chat
  leaveGroup: async (groupChatId) => {
    try {
      console.log('💬 GroupChatStore: Leaving group:', groupChatId);
      set({ loading: true, error: null });

      const { user } = useSupabaseAuthStore.getState();
      const userId = user?.uid || user?.id;

      // Get current group info
      const { data: groupChat, error: fetchError } = await supabase
        .from('group_chats')
        .select('member_ids, admin_ids, name')
        .eq('id', groupChatId)
        .single();

      if (fetchError) throw fetchError;

      // Remove user from member and admin lists
      const updatedMemberIds = groupChat.member_ids.filter(id => id !== userId);
      const updatedAdminIds = groupChat.admin_ids.filter(id => id !== userId);

      const { error } = await supabase
        .from('group_chats')
        .update({
          member_ids: updatedMemberIds,
          admin_ids: updatedAdminIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupChatId);

      if (error) throw error;

      // Remove from local state
      set(state => ({
        groupChats: state.groupChats.filter(chat => chat.id !== groupChatId),
        loading: false
      }));

      // Send system message
      await get().sendSystemMessage(groupChatId, `${user.user_metadata?.display_name || 'Someone'} left the group`);

      console.log('💬 GroupChatStore: Left group successfully');

    } catch (error) {
      console.error('💬 GroupChatStore: Error leaving group:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update group chat details
  updateGroupChat: async (groupChatId, updates) => {
    try {
      console.log('💬 GroupChatStore: Updating group chat:', { groupChatId, updates });
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('group_chats')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupChatId);

      if (error) throw error;

      // Update local state
      set(state => ({
        groupChats: state.groupChats.map(chat =>
          chat.id === groupChatId
            ? { ...chat, ...updates }
            : chat
        ),
        loading: false
      }));

      console.log('💬 GroupChatStore: Group chat updated successfully');

    } catch (error) {
      console.error('💬 GroupChatStore: Error updating group chat:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Set current group chat
  setCurrentGroupChat: (groupChat) => {
    set({ currentGroupChat: groupChat });
  },

  // Clear current group chat
  clearCurrentGroupChat: () => {
    set({ currentGroupChat: null, groupMessages: [] });
  },

  // Alias for compatibility
  loadGroupChats: function() {
    return this.getGroupChats();
  }
})); 