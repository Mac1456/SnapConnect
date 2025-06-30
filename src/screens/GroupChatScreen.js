import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { useGroupChatStore } from '../stores/groupChatStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useAIStore } from '../stores/aiStore';
import { useFocusEffect, useTheme, useNavigation } from '@react-navigation/native';
import { supabase } from '../../supabase.config';

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDarkMode ? '#000000' : colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#333333' : colors.border,
    backgroundColor: isDarkMode ? '#1C1C1E' : colors.card,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? '#FFFFFF' : colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: isDarkMode ? '#AAAAAA' : colors.text + '80',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
    backgroundColor: isDarkMode ? '#000000' : colors.background,
  },
  messageListContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessage: {
    backgroundColor: '#FFD700', // Yellow background for sent messages
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    borderWidth: 2,
    borderColor: '#FF69B4', // Pink outline
  },
  theirMessage: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F0F0F0',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? '#3C3C3E' : '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    color: '#000000', // Black text for sent messages
    lineHeight: 20,
    fontWeight: '500',
  },
  theirMessageText: {
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  senderName: {
    fontSize: 12,
    color: isDarkMode ? '#AAAAAA' : '#666666',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageTimestamp: {
    fontSize: 11,
    color: '#000000', // Black timestamp for sent messages
    opacity: 0.7,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  theirMessageTimestamp: {
    color: isDarkMode ? '#AAAAAA' : '#666666',
  },
  ephemeralIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timerText: {
    fontSize: 10,
    color: '#000000', // Black timer text for sent messages
    marginLeft: 2,
    fontWeight: '600',
  },
  theirTimerText: {
    color: isDarkMode ? '#AAAAAA' : '#666666',
  },
  ephemeralControls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#444444' : colors.border,
    backgroundColor: isDarkMode ? '#2C2C2E' : colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  ephemeralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ephemeralLabel: {
    fontSize: 14,
    color: colors.text,
    marginHorizontal: 8,
  },
  timerSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  timerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? '#1C1C1E' : colors.background,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#333333' : colors.border,
  },
  aiButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: isDarkMode ? '#2C2C2E' : colors.card,
    color: isDarkMode ? '#FFFFFF' : colors.text,
    fontSize: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#3C3C3E' : colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF69B4', // Pink send button to match the theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: colors.border,
  },
  noChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noChatMessage: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginVertical: 24,
    lineHeight: 24,
  },
  createGroupButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createGroupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: colors.text + '60',
    textAlign: 'center',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  membersList: {
    maxHeight: 300,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  memberUsername: {
    fontSize: 14,
    color: colors.text + '60',
    marginTop: 2,
  },
  adminLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  removeMemberButton: {
    padding: 4,
  },
  friendsList: {
    maxHeight: 300,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedFriendItem: {
    backgroundColor: colors.primary + '10',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  moodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  moodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: colors.notification,
    marginTop: 8,
  },
  dangerButtonText: {
    color: 'white',
  },

  disabledButton: {
    backgroundColor: colors.text + '20',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text + '60',
    fontSize: 16,
    paddingVertical: 32,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
});

const GroupChatScreen = ({ route }) => {
  const navigation = useNavigation();
  const { group } = route.params || {};
  
  if (__DEV__) {
    console.log('💬 GroupChatScreen: 🚀 Component initialized:', {
      routeGroupId: group?.id,
      routeGroupName: group?.name
    });
  }
  
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { isDarkMode } = useThemeStore();
  const styles = useMemo(() => createStyles(colors || {}, isDarkMode), [colors, isDarkMode]);
  
  const {
    groupChats,
    getGroupChats,
    currentGroupChat,
    groupMessages,
    loading,
    error,
    loadGroupMessages,
    sendGroupMessage,
    setupGroupMessageSubscription,
    addMembers,
    leaveGroup,
    deleteGroup,
    removeMember,
    setCurrentGroupChat,
    clearCurrentGroupChat,
  } = useGroupChatStore();
  
  const { friends, getFriends } = useFriendStore();
  const { generateActivitySuggestions, activitySuggestions, loading: aiLoading } = useAIStore();

  // Component State
  const [message, setMessage] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(10);
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  const flatListRef = useRef(null);
  const currentUserId = user?.id;

  if (__DEV__) {
    console.log('💬 GroupChatScreen: 🚀 Initial state check:', {
      currentUserId,
      currentGroupChatId: currentGroupChat?.id,
      messagesCount: groupMessages?.length || 0
    });
  }

  // Track when group chats are loaded (reduced logging)
  useEffect(() => {
    if (__DEV__) {
      console.log('💬 GroupChatScreen: 📋 Group chats changed:', {
        groupChatsCount: groupChats?.length || 0
      });
    }
  }, [groupChats?.length]);

  // Track when current group chat changes (reduced logging)
  useEffect(() => {
    if (__DEV__ && currentGroupChat) {
      console.log('💬 GroupChatScreen: 🔄 Current group chat changed:', {
        id: currentGroupChat.id,
        name: currentGroupChat.name
      });
    }
  }, [currentGroupChat?.id]);

  // Track when group messages change (reduced logging)
  useEffect(() => {
    if (__DEV__) {
      console.log('💬 GroupChatScreen: 📨 Group messages changed:', {
        messagesCount: groupMessages?.length || 0,
        currentGroupChatId: currentGroupChat?.id
      });
    }
  }, [groupMessages?.length, currentGroupChat?.id]);

  // Set current group chat when component mounts or group changes
  useEffect(() => {
    console.log('💬 GroupChatScreen: 🎯 useEffect triggered for group selection:', {
      hasRouteGroup: !!group,
      routeGroupId: group?.id,
      routeGroupName: group?.name,
      groupChatsCount: groupChats?.length || 0,
      groupChatsIds: groupChats?.map(g => g.id) || []
    });
    
    if (group) {
      console.log('💬 GroupChatScreen: 🎯 Setting current group chat from route:', {
        id: group.id,
        name: group.name,
        memberCount: group.member_ids?.length || 0
      });
      setCurrentGroupChat(group);
    } else if (groupChats?.length > 0) {
      console.log('💬 GroupChatScreen: 🎯 Auto-selecting first group chat:', {
        id: groupChats[0].id,
        name: groupChats[0].name,
        memberCount: groupChats[0].member_ids?.length || 0
      });
      setCurrentGroupChat(groupChats[0]);
    } else {
      console.log('💬 GroupChatScreen: 🎯 No group to select (no route group, no group chats available)');
    }
    
    // Don't automatically clear current group chat on component cleanup
    // This was causing the flickering issue by clearing messages unnecessarily
    return () => {
      console.log('💬 GroupChatScreen: 🎯 Cleanup: Component unmounting, but preserving current group chat state');
      // Don't clear anything here - let the focus/blur handle navigation cleanup
    };
  }, [group, groupChats, setCurrentGroupChat]);

  // Load messages when current group chat changes
  useEffect(() => {
    console.log('💬 GroupChatScreen: 📥 Message loading useEffect triggered:', {
      currentGroupChatId: currentGroupChat?.id,
      currentGroupChatName: currentGroupChat?.name,
      hasLoadGroupMessages: typeof loadGroupMessages === 'function',
      hasSetupSubscription: typeof setupGroupMessageSubscription === 'function'
    });
    
    if (currentGroupChat?.id) {
      console.log('💬 GroupChatScreen: 📥 Starting message loading process for group:', currentGroupChat.id);
      
      // Load messages with retry mechanism
      const loadWithRetry = async (retryCount = 0) => {
        try {
          console.log(`💬 GroupChatScreen: 📥 Loading messages attempt ${retryCount + 1}...`);
          const startTime = Date.now();
          
          const messages = await loadGroupMessages(currentGroupChat.id);
          
          const loadTime = Date.now() - startTime;
          console.log('💬 GroupChatScreen: 📥 Messages loaded successfully:', {
            loadTime: loadTime + 'ms',
            messagesCount: messages?.length || 0,
            retryCount,
            messages: messages?.map(msg => ({
              id: msg.id,
              text: msg.text?.substring(0, 30) + '...',
              senderName: msg.senderName
            })) || []
          });
          
        } catch (error) {
          console.error('❌ GroupChatScreen: 📥 Error loading messages:', {
            error: error.message,
            stack: error.stack,
            retryCount,
            groupId: currentGroupChat.id
          });
          
          // Retry up to 3 times with increasing delay
          if (retryCount < 3) {
            const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s
            console.log(`💬 GroupChatScreen: 📥 Retrying message load in ${delay}ms (attempt ${retryCount + 2}/4)`);
            setTimeout(() => loadWithRetry(retryCount + 1), delay);
          } else {
            console.error('❌ GroupChatScreen: 📥 Max retries reached, giving up on message loading');
          }
        }
      };
      
      loadWithRetry();
      
      // Set up subscription
      let unsubscribe = null;
      
      try {
        console.log('💬 GroupChatScreen: 📥 Setting up message subscription...');
        const subscriptionStartTime = Date.now();
        
        unsubscribe = setupGroupMessageSubscription(currentGroupChat.id);
        
        const subscriptionTime = Date.now() - subscriptionStartTime;
        console.log('💬 GroupChatScreen: 📥 Message subscription setup completed:', {
          setupTime: subscriptionTime + 'ms',
          unsubscribeExists: !!unsubscribe,
          unsubscribeType: typeof unsubscribe,
          groupId: currentGroupChat.id
        });
        
      } catch (subscriptionError) {
        console.error('❌ GroupChatScreen: 📥 Error setting up message subscription:', {
          error: subscriptionError.message,
          stack: subscriptionError.stack,
          groupId: currentGroupChat.id
        });
      }
        
      return () => {
        console.log('💬 GroupChatScreen: 📥 Cleanup: Starting subscription cleanup for group:', currentGroupChat.id);
        
        if (unsubscribe && typeof unsubscribe === 'function') {
          try {
            console.log('💬 GroupChatScreen: 📥 Unsubscribing from group messages...');
            const cleanupStartTime = Date.now();
            
            unsubscribe();
            
            const cleanupTime = Date.now() - cleanupStartTime;
            console.log('💬 GroupChatScreen: 📥 Successfully unsubscribed from group messages:', {
              cleanupTime: cleanupTime + 'ms'
            });
          } catch (unsubscribeError) {
            console.error('❌ GroupChatScreen: 📥 Error unsubscribing from group messages:', {
              error: unsubscribeError.message,
              stack: unsubscribeError.stack
            });
          }
        } else {
          console.log('💬 GroupChatScreen: 📥 No message subscription to clean up:', {
            unsubscribeExists: !!unsubscribe,
            unsubscribeType: typeof unsubscribe
          });
        }
      };
    } else {
      console.log('💬 GroupChatScreen: 📥 No current group chat, skipping message loading');
    }
  }, [currentGroupChat?.id, loadGroupMessages, setupGroupMessageSubscription]);
  
  // Set up real-time subscription for group chat updates (member changes)
  useEffect(() => {
    if (!currentGroupChat?.id) {
      console.log('💬 GroupChatScreen: 📡 Skipping group updates subscription - no current group chat');
      return;
    }

    if (!supabase) {
      console.error('❌ GroupChatScreen: 📡 Supabase client not available, skipping group updates subscription');
      return;
    }

    console.log('💬 GroupChatScreen: 📡 Setting up group chat updates subscription for group:', currentGroupChat.id);
    
    let subscription = null;
    let cleanup = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    const createSubscription = () => {
      try {
        const channelName = `group-chat-updates-${currentGroupChat.id}-${Date.now()}`;
        const channel = supabase.channel(channelName);
        
        if (!channel) {
          console.error('❌ GroupChatScreen: 📡 Failed to create Supabase channel');
          return null;
        }

        return channel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'group_chats',
              filter: `id=eq.${currentGroupChat.id}`
            },
            async (payload) => {
              console.log('💬 GroupChatScreen: 📡 Group chat updated:', {
                event: payload.eventType,
                table: payload.table,
                new: payload.new ? Object.keys(payload.new) : null,
                old: payload.old ? Object.keys(payload.old) : null
              });
              
              if (payload.new) {
                // Refresh the group chats to get the updated member list
                console.log('💬 GroupChatScreen: 📡 Refreshing group data after update');
                try {
                  await Promise.all([getGroupChats(), getFriends()]);
                  console.log('💬 GroupChatScreen: 📡 Successfully refreshed data after group update');
                } catch (refreshError) {
                  console.error('💬 GroupChatScreen: 📡 Error refreshing data after group update:', refreshError);
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('💬 GroupChatScreen: 📡 Group updates subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ GroupChatScreen: 📡 Successfully subscribed to group updates');
              retryCount = 0; // Reset retry count on success
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ GroupChatScreen: 📡 Channel error in group updates subscription');
              
              // Retry with backoff, but fewer retries for group updates
              if (retryCount < maxRetries) {
                retryCount++;
                const delay = 2000 * retryCount; // 2s, 4s
                console.log(`💬 GroupChatScreen: 📡 Retrying group updates subscription in ${delay}ms`);
                
                setTimeout(() => {
                  if (subscription) {
                    subscription.unsubscribe();
                  }
                  subscription = createSubscription();
                }, delay);
          } else {
                console.log('💬 GroupChatScreen: 📡 Max retries reached for group updates subscription');
              }
            } else if (status === 'TIMED_OUT') {
              console.error('❌ GroupChatScreen: 📡 Group updates subscription timed out');
            } else if (status === 'CLOSED') {
              console.log('💬 GroupChatScreen: 📡 Group updates subscription closed');
            }
          });
      } catch (error) {
        console.error('❌ GroupChatScreen: 📡 Error creating group updates subscription:', error);
        return null;
      }
    };

    // Create initial subscription
    subscription = createSubscription();

    console.log('💬 GroupChatScreen: 📡 Group updates subscription created:', {
      subscriptionExists: !!subscription,
      subscriptionType: typeof subscription,
      hasUnsubscribe: subscription && typeof subscription.unsubscribe === 'function'
    });

    cleanup = () => {
      console.log('💬 GroupChatScreen: 📡 Cleaning up group updates subscription');
      
      if (subscription && typeof subscription.unsubscribe === 'function') {
        try {
          console.log('💬 GroupChatScreen: 📡 Unsubscribing from group updates');
          subscription.unsubscribe();
          console.log('💬 GroupChatScreen: 📡 Successfully unsubscribed from group updates');
        } catch (unsubscribeError) {
          console.error('❌ GroupChatScreen: 📡 Error unsubscribing from group updates:', unsubscribeError);
        }
      } else {
        console.log('💬 GroupChatScreen: 📡 No subscription to clean up');
      }
    };

    return cleanup;
  }, [currentGroupChat?.id, getGroupChats, getFriends]);

  // Fetch group chats and friends on mount
  useFocusEffect(
    useCallback(() => {
      console.log('💬 GroupChatScreen: 🎯 Screen focused, initiating data fetch');
      console.log('💬 GroupChatScreen: 🎯 Current state:', {
        hasCurrentGroupChat: !!currentGroupChat?.id,
        currentGroupChatId: currentGroupChat?.id,
        groupChatsCount: groupChats?.length || 0,
        friendsCount: friends?.length || 0,
        messagesCount: groupMessages?.length || 0
      });
      
      // Only fetch data if we don't have it already to prevent unnecessary loading states
      const fetchPromises = [];
      
      if (!groupChats || groupChats.length === 0) {
        console.log('💬 GroupChatScreen: 🎯 No group chats cached, fetching...');
        fetchPromises.push(
          getGroupChats().catch(error => {
            console.error('❌ GroupChatScreen: 🎯 Error fetching group chats:', error);
            return [];
          })
        );
      } else {
        console.log('💬 GroupChatScreen: 🎯 Group chats already loaded, skipping fetch');
      }
      
      if (!friends || friends.length === 0) {
        console.log('💬 GroupChatScreen: 🎯 No friends cached, fetching...');
        fetchPromises.push(
          getFriends().catch(error => {
            console.error('❌ GroupChatScreen: 🎯 Error fetching friends:', error);
            return [];
          })
        );
      } else {
        console.log('💬 GroupChatScreen: 🎯 Friends already loaded, skipping fetch');
      }
      
      if (fetchPromises.length > 0) {
        Promise.all(fetchPromises).then((results) => {
          console.log('💬 GroupChatScreen: 🎯 Data fetch completed:', {
            fetchedItems: results.length,
            groupChatsCount: groupChats?.length || 0,
            friendsCount: friends?.length || 0
          });
        });
      } else {
        console.log('💬 GroupChatScreen: 🎯 All data already available, no fetching needed');
      }
      
      // Also reload messages if we have a current group chat
      if (currentGroupChat?.id) {
        console.log('💬 GroupChatScreen: 🎯 Reloading messages for current group on focus');
        loadGroupMessages(currentGroupChat.id).catch(error => {
          console.error('❌ GroupChatScreen: 🎯 Error reloading messages on focus:', error);
        });
      } else {
        console.log('💬 GroupChatScreen: 🎯 No current group chat, skipping message reload');
      }

      // Cleanup function when screen loses focus (user navigates away)
      return () => {
        console.log('💬 GroupChatScreen: 🔄 Screen losing focus, but preserving current group chat for navigation');
        // Don't clear the current group chat here - this was causing navigation issues
        // where users couldn't open group chats because the current group was being cleared
      };
    }, [getGroupChats, getFriends, currentGroupChat?.id, loadGroupMessages, groupChats?.length, friends?.length])
  );

  // Get member details from the current group chat - optimized to reduce re-renders
  const memberDetails = useMemo(() => {
    if (!currentGroupChat?.member_ids || !friends) {
      return [];
    }
    
    const members = friends.filter(friend => 
      currentGroupChat.member_ids.includes(friend.id)
    );
    
    // Add creator if not already in friends list
    if (currentGroupChat.creator && !members.find(m => m.id === currentGroupChat.creator.id)) {
      members.push(currentGroupChat.creator);
    }
    
    return members;
  }, [currentGroupChat?.id, currentGroupChat?.member_ids, currentGroupChat?.creator?.id, friends]);

  // Available friends to add (not already members) - optimized
  const availableFriends = useMemo(() => {
    if (!currentGroupChat?.member_ids || !friends) {
      return friends || [];
    }
    
    return friends.filter(friend => 
      !currentGroupChat.member_ids.includes(friend.id)
    );
  }, [friends, currentGroupChat?.member_ids]);

  const handleSendMessage = async () => {
    console.log('💬 GroupChatScreen: 📤 Send message initiated');
    console.log('💬 GroupChatScreen: 📤 Message state:', {
      messageLength: message.length,
      messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      hasCurrentGroupChat: !!currentGroupChat?.id,
      groupChatId: currentGroupChat?.id,
      isEphemeral,
      timerSeconds,
      currentUserId
    });
    
    if (!message.trim() || !currentGroupChat?.id) {
      console.warn('💬 GroupChatScreen: 📤 Cannot send message - validation failed:', {
        hasMessage: !!message.trim(),
        hasGroupChat: !!currentGroupChat?.id
      });
      return;
    }
    
    const messageData = {
      groupId: currentGroupChat.id,
      message: message.trim(),
      isEphemeral,
      timerSeconds: isEphemeral ? timerSeconds : 0,
      currentUserId
    };

    console.log('💬 GroupChatScreen: 📤 Attempting to send message with data:', messageData);

    try {
      console.log('💬 GroupChatScreen: 📤 Calling sendGroupMessage...');
      
      const sentMessage = await sendGroupMessage(
        currentGroupChat.id, 
        message.trim(), 
        'text',
        null,
        isEphemeral ? timerSeconds : 0
      );
      
      console.log('✅ GroupChatScreen: 📤 Message sent successfully:', {
        messageId: sentMessage?.id,
        content: sentMessage?.content?.substring(0, 30) + '...',
        timestamp: sentMessage?.created_at
      });
      
      setMessage('');
      console.log('💬 GroupChatScreen: 📤 Message input cleared');
      
      // Scroll to end without forced refresh - the real-time subscription will handle the new message
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
          console.log('💬 GroupChatScreen: 📤 Scrolled to end of message list');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ GroupChatScreen: 📤 Error sending message:', {
        error: error.message,
        stack: error.stack,
        messageData
      });
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleAddMembers = async () => {
    console.log('💬 GroupChatScreen: 👥 Add members initiated');
    console.log('💬 GroupChatScreen: 👥 Selected friends:', selectedFriends.map(f => ({
      id: f.id,
      name: f.display_name
    })));
    
    if (selectedFriends.length === 0) {
      console.warn('💬 GroupChatScreen: 👥 No friends selected to add');
      return Alert.alert('No Selection', 'Please select friends to add.');
    }

    console.log('💬 GroupChatScreen: 👥 Adding members to group:', {
      groupId: currentGroupChat.id,
      groupName: currentGroupChat.name,
      membersToAdd: selectedFriends.map(f => f.display_name),
      currentMemberCount: currentGroupChat.member_ids?.length || 0
    });

    try {
      console.log('💬 GroupChatScreen: 👥 Calling addMembers function...');
      
      const updatedGroup = await addMembers(currentGroupChat.id, selectedFriends.map(f => f.id));
      
      console.log('✅ GroupChatScreen: 👥 addMembers call successful:', {
        updatedGroupId: updatedGroup?.id,
        newMemberCount: updatedGroup?.member_ids?.length || 0
      });
      
      setSelectedFriends([]);
      setShowAddMembersModal(false);
      console.log('💬 GroupChatScreen: 👥 UI state cleared after adding members');
      
      // Refresh friends list and group chats to get updated data
      console.log('💬 GroupChatScreen: 👥 Refreshing data after adding members...');
      
      try {
        await Promise.all([
          getFriends(),
          getGroupChats()
        ]);
        console.log('✅ GroupChatScreen: 👥 Data refresh successful after adding members');
        
        // Force update current group chat with latest data
        if (updatedGroup) {
          console.log('💬 GroupChatScreen: 👥 Updating current group chat with latest data:', {
            oldMemberCount: currentGroupChat.member_ids?.length || 0,
            newMemberCount: updatedGroup.member_ids?.length || 0
          });
          setCurrentGroupChat({ ...updatedGroup, updated_at: new Date().toISOString() });
        }
      } catch (refreshError) {
        console.error('❌ GroupChatScreen: 👥 Error refreshing data after adding members:', refreshError);
      }
      
      console.log('✅ GroupChatScreen: 👥 Members added successfully');
      Alert.alert('Success', 'Members added successfully!');
      
    } catch (error) {
      console.error('❌ GroupChatScreen: 👥 Error adding members:', {
        error: error.message,
        stack: error.stack,
        selectedFriends: selectedFriends.map(f => f.id),
        groupId: currentGroupChat.id
      });
      Alert.alert('Error', 'Failed to add members. Please try again.');
    }
  };

  const handleLeaveGroup = async () => {
    console.log('💬 GroupChatScreen: 🚪 User attempting to leave group:', {
      groupId: currentGroupChat?.id,
      groupName: currentGroupChat?.name,
      userId: currentUserId
    });
    
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('💬 GroupChatScreen: 🚪 Calling leaveGroup function...');
              await leaveGroup(currentGroupChat.id);
              console.log('✅ GroupChatScreen: 🚪 Successfully left group');
              navigation.goBack();
            } catch (error) {
              console.error('❌ GroupChatScreen: 🚪 Error leaving group:', {
                error: error.message,
                stack: error.stack,
                groupId: currentGroupChat.id
              });
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = async () => {
    console.log('💬 GroupChatScreen: 🗑️ User attempting to delete group:', {
      groupId: currentGroupChat?.id,
      groupName: currentGroupChat?.name,
      userId: currentUserId
    });
    
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${currentGroupChat?.name}"? This action cannot be undone and will remove all messages and members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('💬 GroupChatScreen: 🗑️ Calling deleteGroup function...');
              await deleteGroup(currentGroupChat.id);
              console.log('✅ GroupChatScreen: 🗑️ Successfully deleted group');
              navigation.goBack();
            } catch (error) {
              console.error('❌ GroupChatScreen: 🗑️ Error deleting group:', {
                error: error.message,
                stack: error.stack,
                groupId: currentGroupChat.id
              });
              Alert.alert('Error', 'Failed to delete group. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId) => {
    const member = memberDetails.find(m => m.id === memberId);
    console.log('💬 GroupChatScreen: 👤 Attempting to remove member:', {
      memberId,
      memberName: member?.display_name,
      groupId: currentGroupChat?.id,
      currentMemberCount: memberDetails.length
    });
    
    Alert.alert(
      'Remove Member',
      `Remove ${member?.display_name} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('💬 GroupChatScreen: 👤 Calling removeMember function...');
              
              const updatedGroup = await removeMember(currentGroupChat.id, memberId);
              
              console.log('✅ GroupChatScreen: 👤 removeMember call successful:', {
                updatedGroupId: updatedGroup?.id,
                newMemberCount: updatedGroup?.member_ids?.length || 0
              });
              
              // Refresh friends list and group chats to get updated data
              console.log('💬 GroupChatScreen: 👤 Refreshing data after removing member...');
              
              try {
                await Promise.all([
                  getFriends(),
                  getGroupChats()
                ]);
                console.log('✅ GroupChatScreen: 👤 Data refresh successful after removing member');
                
                // Force update current group chat with latest data
                if (updatedGroup) {
                  console.log('💬 GroupChatScreen: 👤 Updating current group chat with latest data:', {
                    oldMemberCount: currentGroupChat.member_ids?.length || 0,
                    newMemberCount: updatedGroup.member_ids?.length || 0
                  });
                  setCurrentGroupChat({ ...updatedGroup, updated_at: new Date().toISOString() });
                }
              } catch (refreshError) {
                console.error('❌ GroupChatScreen: 👤 Error refreshing data after removing member:', refreshError);
              }
              
              console.log('✅ GroupChatScreen: 👤 Member removed successfully');
              Alert.alert('Success', 'Member removed successfully!');
              
            } catch (error) {
              console.error('❌ GroupChatScreen: 👤 Error removing member:', {
                error: error.message,
                stack: error.stack,
                memberId,
                groupId: currentGroupChat.id
              });
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleFriendSelection = (friend) => {
    const isSelected = selectedFriends.find(f => f.id === friend.id);
    if (isSelected) {
      console.log('💬 GroupChatScreen: Deselecting friend:', friend.display_name);
      setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id));
    } else {
      console.log('💬 GroupChatScreen: Selecting friend:', friend.display_name);
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  const handleGetAISuggestions = useCallback(async () => {
    if (__DEV__) {
      console.log('🤖 GroupChatScreen: Opening AI suggestions modal');
    }
    setShowAISuggestions(true);
  }, []);

  const selectAISuggestion = useCallback((suggestion) => {
    if (__DEV__) {
      console.log('🤖 GroupChatScreen: Selected AI suggestion:', suggestion);
    }
    setMessage(suggestion);
    setShowAISuggestions(false);
  }, []);

  const renderMessage = useCallback(({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;
    const sender = !isCurrentUser ? memberDetails.find(m => m.id === item.senderId) : null;

    return (
      <View style={[
        styles.messageBubble, 
        isCurrentUser ? styles.myMessage : styles.theirMessage
      ]}>
        {!isCurrentUser && sender && (
          <Text style={styles.senderName}>
            {sender.display_name || 'Unknown User'}
          </Text>
        )}
        <Text style={[
          styles.messageText, 
          !isCurrentUser && styles.theirMessageText
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.messageTimestamp, 
          !isCurrentUser && styles.theirMessageTimestamp
        ]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {item.timerSeconds > 0 && (
          <View style={styles.ephemeralIndicator}>
            <Ionicons 
              name="timer" 
              size={12} 
              color={isCurrentUser ? '#000000' : (isDarkMode ? '#FFFFFF' : colors.text)} 
            />
            <Text style={[
              styles.timerText,
              !isCurrentUser && styles.theirTimerText
            ]}>
              {item.timerSeconds}s
            </Text>
          </View>
        )}
      </View>
    );
  }, [currentUserId, memberDetails, isDarkMode, colors.text]);
  
  const renderFriendSelector = useCallback(({ item }) => {
    const isSelected = selectedFriends.find(f => f.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.selectedFriendItem]}
        onPress={() => toggleFriendSelection(item)}
      >
        <Image
          source={{ uri: item.profile_picture || 'https://via.placeholder.com/40' }}
          style={styles.friendAvatar}
        />
        <Text style={styles.friendName}>{item.display_name}</Text>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? colors.primary : colors.text}
        />
      </TouchableOpacity>
    );
  }, [selectedFriends, toggleFriendSelection, styles, colors]);

  const renderMemberItem = ({ item }) => {
    const isAdmin = currentGroupChat?.admin_ids?.includes(item.id);
    const canRemove = currentGroupChat?.admin_ids?.includes(currentUserId) && item.id !== currentUserId;
    
    return (
      <View style={styles.memberItem}>
        <Image
          source={{ uri: item.profile_picture || 'https://via.placeholder.com/40' }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.display_name}</Text>
          <Text style={styles.memberUsername}>@{item.username}</Text>
          {isAdmin && <Text style={styles.adminLabel}>Admin</Text>}
        </View>
        {canRemove && (
          <TouchableOpacity 
            onPress={() => handleRemoveMember(item.id)}
            style={styles.removeMemberButton}
          >
            <Ionicons name="remove-circle" size={24} color={colors.notification} />
          </TouchableOpacity>
        )}
        </View>
    );
  };

  const renderAISuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => selectAISuggestion(item)}
    >
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading group chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentGroupChat) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.noChatContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color={colors.text + '40'} />
          <Text style={styles.noChatMessage}>
            {(groupChats?.length || 0) === 0 
              ? "No group chats found.\nCreate your first group chat!" 
              : "Select a group chat to start messaging"}
          </Text>
          <TouchableOpacity 
            style={styles.createGroupButton}
            onPress={() => navigation.navigate('CreateGroupChat')}
          >
            <Text style={styles.createGroupButtonText}>Create Group Chat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (__DEV__) {
    console.log('💬 GroupChatScreen: 🎨 Rendering main group chat UI:', {
      currentGroupChatId: currentGroupChat?.id,
      messagesCount: groupMessages?.length || 0
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{currentGroupChat?.name || 'Group Chat'}</Text>
          <Text style={styles.headerSubtitle}>
            {(memberDetails?.length || 0)} member{(memberDetails?.length || 0) !== 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowMembersModal(true)}
        >
          <Ionicons name="people" size={24} color={isDarkMode ? '#FFFFFF' : colors.text} />
        </TouchableOpacity>


          
        <TouchableOpacity 
          onPress={handleLeaveGroup}
          style={styles.headerButton}
        >
          <Ionicons name="exit-outline" size={24} color={colors.notification} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={groupMessages || []}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        extraData={groupMessages?.length || 0} // Simplified extraData - only re-render when message count changes
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => {
          // Only auto-scroll if user is near the bottom to prevent interrupting reading
          if (flatListRef.current) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
          }
        }}
        onLayout={() => {
          // Scroll to end when component first renders with messages
          if ((groupMessages?.length || 0) > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyMessagesContainer}>
            <Ionicons name="chatbubble-outline" size={60} color={colors.text + '40'} />
            <Text style={styles.emptyMessagesText}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Ephemeral Message Controls */}
        <View style={styles.ephemeralControls}>
          <View style={styles.ephemeralToggle}>
            <Ionicons 
              name="timer" 
              size={16} 
              color={isEphemeral ? '#FF69B4' : (isDarkMode ? '#AAAAAA' : colors.text)} 
            />
            <Switch
              value={isEphemeral}
              onValueChange={setIsEphemeral}
              trackColor={{ false: isDarkMode ? '#333333' : '#E0E0E0', true: '#FF69B4' }}
              thumbColor={isEphemeral ? '#FFFFFF' : (isDarkMode ? '#AAAAAA' : '#F4F3F4')}
            />
          </View>
          
          {isEphemeral && (
            <View style={styles.timerSelector}>
              {[5, 10, 30, 60].map((seconds) => (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    styles.timerButton,
                    {
                      backgroundColor: timerSeconds === seconds ? '#FF69B4' : (isDarkMode ? '#2C2C2E' : '#F0F0F0'),
                      borderColor: isDarkMode ? '#3C3C3E' : '#E0E0E0',
                    }
                  ]}
                  onPress={() => setTimerSeconds(seconds)}
                >
                  <Text style={[
                    styles.timerButtonText,
                    {
                      color: timerSeconds === seconds ? '#FFFFFF' : (isDarkMode ? '#FFFFFF' : colors.text)
                    }
                  ]}>
                    {seconds}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            onPress={handleGetAISuggestions}
            style={styles.aiButton}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="compass-outline" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.text + '60'}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            onPress={handleSendMessage}
            style={[styles.sendButton, !message.trim() && styles.disabledSendButton]}
            disabled={!message.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={message.trim() ? 'white' : colors.text + '40'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Members Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMembersModal}
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Members</Text>
              <TouchableOpacity 
                onPress={() => setShowMembersModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={memberDetails || []}
              renderItem={renderMemberItem}
              keyExtractor={(item) => item.id.toString()}
              extraData={memberDetails?.length || 0}
              style={styles.membersList}
            />

            {currentGroupChat?.admin_ids?.includes(currentUserId) && (
              <>
            <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setShowMembersModal(false);
                    setShowAddMembersModal(true);
                  }}
                >
                  <Text style={styles.actionButtonText}>Add Members</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => {
                    setShowMembersModal(false);
                    handleDeleteGroup();
                  }}
                >
                  <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Delete Group</Text>
            </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Members Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddMembersModal}
        onRequestClose={() => setShowAddMembersModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Members</Text>
              <TouchableOpacity 
                onPress={() => setShowAddMembersModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <FlatList
              data={availableFriends}
              renderItem={renderFriendSelector}
              keyExtractor={(item) => item.id.toString()}
              style={styles.friendsList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  All your friends are already in this group!
                </Text>
              }
              />

              <TouchableOpacity 
              style={[styles.actionButton, selectedFriends.length === 0 && styles.disabledButton]}
                onPress={handleAddMembers}
                disabled={selectedFriends.length === 0}
              >
              <Text style={styles.actionButtonText}>
                Add {selectedFriends.length} Member{selectedFriends.length !== 1 ? 's' : ''}
              </Text>
              </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* AI Suggestions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAISuggestions}
        onRequestClose={() => setShowAISuggestions(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 AI Activity Suggestions</Text>
              <TouchableOpacity 
                onPress={() => setShowAISuggestions(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.suggestionsList}>
              {/* Activity Type Selection */}
              <Text style={styles.detailSectionTitle}>Choose Activity Type:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {[
                  { key: 'hangout', label: 'Hangout', icon: '🏠' },
                  { key: 'adventure', label: 'Adventure', icon: '🗺️' },
                  { key: 'creative', label: 'Creative', icon: '🎨' },
                  { key: 'food', label: 'Food', icon: '🍕' },
                  { key: 'entertainment', label: 'Entertainment', icon: '🎬' }
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    onPress={async () => {
                      const memberIds = currentGroupChat?.member_ids || [];
                      const groupContext = `Group: ${currentGroupChat?.name || 'Chat'} with ${memberDetails?.length || 0} members`;
                      try {
                        await generateActivitySuggestions(groupContext, 'fun', type.key, memberIds);
                      } catch (error) {
                        console.error('🤖 GroupChatScreen: Error generating AI activity suggestions:', error);
                      }
                    }}
                    style={[
                      styles.moodButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      }
                    ]}
                  >
                    <Text style={[styles.moodButtonText, { color: colors.text }]}>
                      {type.icon} {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Mood Selection */}
              <Text style={styles.detailSectionTitle}>Choose Mood:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {['fun', 'casual', 'exciting', 'nostalgic', 'celebration'].map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    onPress={async () => {
                      const memberIds = currentGroupChat?.member_ids || [];
                      const groupContext = `Group: ${currentGroupChat?.name || 'Chat'} with ${memberDetails?.length || 0} members`;
                      try {
                        await generateActivitySuggestions(groupContext, mood, 'hangout', memberIds);
                      } catch (error) {
                        console.error('🤖 GroupChatScreen: Error generating AI activity suggestions:', error);
                      }
                    }}
                    style={[
                      styles.moodButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      }
                    ]}
                  >
                    <Text style={[styles.moodButtonText, { color: colors.text }]}>
                      {mood.charAt(0).toUpperCase() + mood.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* AI Generated Suggestions */}
              {aiLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.emptyText, { marginTop: 10 }]}>
                    Generating activity suggestions...
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.detailSectionTitle}>AI Activity Suggestions:</Text>
                  {activitySuggestions && activitySuggestions.length > 0 ? (
                    activitySuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => selectAISuggestion(suggestion)}
                        style={[
                          styles.suggestionItem,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          }
                        ]}
                      >
                        <Text style={[styles.suggestionText, { color: colors.text }]}>
                          {suggestion}
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      Select an activity type or mood above to get AI suggestions!
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default GroupChatScreen; 