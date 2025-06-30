import { create } from 'zustand';
import { supabase } from '../../supabase.config';
import { useSupabaseAuthStore } from './supabaseAuthStore';

export const useGroupChatStore = create((set, get) => ({
  groupChats: [],
  currentGroupChat: null,
  groupMessages: [],
  loading: false,
  error: null,
  activeSubscription: null, // Track active subscription to prevent duplicates

  // Get all group chats for the current user
  getGroupChats: async () => {
    try {
      const currentState = get();
      const hasExistingChats = currentState.groupChats && currentState.groupChats.length > 0;
      
      console.log('💬 GroupChatStore: Loading group chats...', {
        hasExistingChats,
        existingCount: currentState.groupChats?.length || 0
      });
      
      // Only show loading state if we don't have any group chats yet
      set({ loading: !hasExistingChats, error: null });

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

      // Optimistically add message to local state for immediate feedback - REMOVED to prevent duplicates
      // The real-time subscription will handle adding the message
      console.log('💬 GroupChatStore: 📤 Message sent, real-time subscription will handle display');

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
      console.log('💬 GroupChatStore: 🔍 loadGroupMessages called with:', {
        groupChatId,
        groupChatIdType: typeof groupChatId,
        groupChatIdExists: !!groupChatId
      });
      
      set({ loading: true, error: null });

      if (!groupChatId) {
        console.error('💬 GroupChatStore: ❌ Group chat ID is required but not provided');
        throw new Error('Group chat ID is required');
      }

      console.log('💬 GroupChatStore: 🔍 Querying messages from Supabase...');
      const startTime = Date.now();
      
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

      const queryTime = Date.now() - startTime;
      console.log('💬 GroupChatStore: 🔍 Supabase query completed in', queryTime, 'ms');

      if (error) {
        console.error('💬 GroupChatStore: ❌ Supabase error loading messages:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('💬 GroupChatStore: 🔍 Raw query result:', {
        dataExists: !!data,
        dataType: typeof data,
        dataLength: data?.length || 0,
        firstMessage: data?.[0] ? {
          id: data[0].id,
          content: data[0].content?.substring(0, 50) + '...',
          created_at: data[0].created_at,
          sender_id: data[0].sender_id,
          hasSender: !!data[0].sender
        } : null
      });

      // Process messages for display
      const processedMessages = (data || []).map((msg, index) => {
        console.log(`💬 GroupChatStore: 🔍 Processing message ${index + 1}/${data.length}:`, {
          id: msg.id,
          content: msg.content?.substring(0, 30) + '...',
          sender_id: msg.sender_id,
          sender_display_name: msg.sender?.display_name,
          sender_username: msg.sender?.username,
          created_at: msg.created_at,
          message_type: msg.message_type
        });
        
        return {
          id: msg.id,
          text: msg.content,
          senderId: msg.sender_id,
          senderName: msg.sender?.display_name || msg.sender?.username || 'Unknown',
          timestamp: new Date(msg.created_at),
          isSystem: msg.message_type === 'system',
          timerSeconds: msg.timer_seconds || 0
        };
      });

      console.log('💬 GroupChatStore: 🔍 Message processing complete:', {
        originalCount: data?.length || 0,
        processedCount: processedMessages.length,
        processedMessages: processedMessages.map(msg => ({
          id: msg.id,
          text: msg.text?.substring(0, 30) + '...',
          senderName: msg.senderName,
          timestamp: msg.timestamp.toISOString(),
          isSystem: msg.isSystem
        }))
      });

      // Check current state before updating
      const currentState = get();
      console.log('💬 GroupChatStore: 🔍 Current state before update:', {
        currentGroupChatId: currentState.currentGroupChat?.id,
        currentMessagesCount: currentState.groupMessages?.length || 0,
        loading: currentState.loading,
        error: currentState.error
      });
      
      // CRITICAL: Only set messages if they belong to the requested group to prevent cross-contamination
      if (currentState.currentGroupChat?.id === groupChatId) {
        console.log('💬 GroupChatStore: 🔍 Setting messages in state for correct group:', {
          requestedGroup: groupChatId,
          currentGroup: currentState.currentGroupChat?.id,
          messagesCount: processedMessages.length
        });
        
        set({ 
          groupMessages: processedMessages, 
          loading: false,
          error: null
        });
        
        // Verify state was updated
        const updatedState = get();
        console.log('💬 GroupChatStore: 🔍 State updated successfully:', {
          newMessagesCount: updatedState.groupMessages?.length || 0,
          loading: updatedState.loading,
          error: updatedState.error,
          firstMessage: updatedState.groupMessages?.[0] ? {
            id: updatedState.groupMessages[0].id,
            text: updatedState.groupMessages[0].text?.substring(0, 30) + '...',
            senderName: updatedState.groupMessages[0].senderName
          } : null
        });
        
        console.log('💬 GroupChatStore: ✅ Successfully loaded', processedMessages.length, 'group messages for group', groupChatId);
      } else {
        console.log('💬 GroupChatStore: ⚠️ Messages loaded for different group, ignoring to prevent cross-contamination:', {
          requestedGroup: groupChatId,
          currentGroup: currentState.currentGroupChat?.id,
          messagesCount: processedMessages.length
        });
        
        set({ loading: false });
      }
      return processedMessages;

    } catch (error) {
      console.error('💬 GroupChatStore: ❌ Error in loadGroupMessages:', {
        error: error.message,
        stack: error.stack,
        groupChatId
      });
      
      set({ 
        error: error.message, 
        loading: false, 
        groupMessages: [] 
      });
      
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

    // Clean up any existing subscription first
    const currentState = get();
    if (currentState.activeSubscription) {
      console.log('💬 GroupChatStore: 📡 Cleaning up existing subscription before creating new one');
      try {
        currentState.activeSubscription.unsubscribe();
      } catch (error) {
        console.error('💬 GroupChatStore: 📡 Error cleaning up existing subscription:', error);
      }
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
                  
                  // CRITICAL: Check if this message belongs to the current group to prevent cross-contamination
                  if (currentState.currentGroupChat?.id !== payload.new.group_chat_id) {
                    console.log('💬 GroupChatStore: 📨 Message belongs to different group, ignoring to prevent cross-contamination:', {
                      messageGroupId: payload.new.group_chat_id,
                      currentGroupId: currentState.currentGroupChat?.id,
                      messageId: payload.new.id
                    });
                    return;
                  }
                  
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
                  
                  // Use a more stable state update that doesn't cause flickering
                  set(state => {
                    // Double-check for duplicates before adding
                    const exists = state.groupMessages.some(msg => msg.id === newMessage.id);
                    if (exists) {
                      console.log('💬 GroupChatStore: 📨 Duplicate message detected in state update, skipping');
                      return state; // Return unchanged state
                    }
                    
                    return {
                      ...state,
                      groupMessages: [...state.groupMessages, newMessage]
                    };
                  });
                  
                  console.log('💬 GroupChatStore: 📨 Message added successfully');
                  
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
    
    // Track the active subscription in store state
    if (subscription) {
      set({ activeSubscription: subscription });
    }
    
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
      }
      
      // Clear the active subscription from store state
      set({ activeSubscription: null });
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
    const currentState = get();
    const previousGroup = currentState.currentGroupChat;
    
    console.log('💬 GroupChatStore: Setting current group chat:', {
      previousGroupId: previousGroup?.id,
      previousGroupName: previousGroup?.name,
      newGroupId: groupChat?.id,
      newGroupName: groupChat?.name,
      memberCount: groupChat?.member_ids?.length || 0,
      isChangingGroup: previousGroup?.id !== groupChat?.id
    });
    
    // If changing to a different group, clear messages to prevent cross-contamination
    if (previousGroup?.id && previousGroup.id !== groupChat?.id) {
      console.log('💬 GroupChatStore: Changing to different group, clearing messages to prevent cross-contamination');
      set({ 
        currentGroupChat: groupChat,
        groupMessages: [], // Clear messages when switching groups
        loading: false,
        error: null
      });
    } else {
      set({ currentGroupChat: groupChat });
    }
  },

  // Clear current group chat
  clearCurrentGroupChat: (clearMessages = true) => {
    const currentState = get();
    
    console.log('💬 GroupChatStore: Clearing current group chat:', {
      clearMessages,
      hasActiveSubscription: !!currentState.activeSubscription,
      currentGroupChatId: currentState.currentGroupChat?.id
    });
    
    // Clean up any active subscription
    if (currentState.activeSubscription) {
      try {
        console.log('💬 GroupChatStore: Cleaning up subscription when clearing current group chat');
        currentState.activeSubscription.unsubscribe();
      } catch (error) {
        console.error('💬 GroupChatStore: Error cleaning up subscription:', error);
      }
    }
    
    // Only clear messages if explicitly requested (for navigation away)
    // Don't clear messages during component re-renders to prevent flickering
    const stateUpdate = { 
      currentGroupChat: null, 
      activeSubscription: null
    };
    
    if (clearMessages) {
      stateUpdate.groupMessages = [];
      console.log('💬 GroupChatStore: Messages cleared along with current group chat');
    } else {
      console.log('💬 GroupChatStore: Messages preserved during group chat clearing');
    }
    
    set(stateUpdate);
  },

  // Clean up all subscriptions
  cleanup: () => {
    const currentState = get();
    
    if (currentState.activeSubscription) {
      try {
        console.log('💬 GroupChatStore: Cleaning up all subscriptions');
        currentState.activeSubscription.unsubscribe();
      } catch (error) {
        console.error('💬 GroupChatStore: Error during cleanup:', error);
      }
    }
    
    set({ 
      activeSubscription: null,
      groupMessages: [],
      currentGroupChat: null
    });
  },

  // Alias for compatibility
  loadGroupChats: function() {
    return this.getGroupChats();
  }
})); 