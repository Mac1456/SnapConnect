import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useGroupChatStore } from '../stores/groupChatStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../../supabase.config';
import { useFocusEffect } from '@react-navigation/native';

export default function ChatsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' or 'groups'
  
  const { user } = useAuthStore();
  const { friends, getFriends } = useFriendStore();
  const { groupChats, getGroupChats } = useGroupChatStore();
  const { theme } = useThemeStore();

  const currentTheme = theme === 'dark' ? {
    colors: {
      background: '#000000',
      surface: '#1a1a1a',
      primary: '#FFFC00',
      text: '#ffffff',
      textSecondary: '#888888',
      border: '#333333',
    }
  } : {
    colors: {
      background: '#ffffff',
      surface: '#f5f5f5',
      primary: '#FFFC00',
      text: '#000000',
      textSecondary: '#666666',
      border: '#e0e0e0',
    }
  };

  useEffect(() => {
    if (user && user.uid) {
      loadConversations();
      getFriends(user.uid);
      getGroupChats();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user && user.uid) {
        console.log('💬 ChatsScreen: Screen focused, loading data...');
        loadConversations();
        getFriends(user.uid);
        getGroupChats();
      }
    }, [user])
  );

  // Helper function to check if an ephemeral message has expired
  const isMessageExpired = (message) => {
    if (!message.timer_seconds || message.timer_seconds === 0) {
      return false; // Not an ephemeral message
    }
    
    const messageTime = new Date(message.created_at);
    const expirationTime = new Date(messageTime.getTime() + (message.timer_seconds * 1000));
    const now = new Date();
    
    return now > expirationTime;
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Get recent conversations (last message from each conversation)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, username, display_name, profile_picture),
          recipient:users!messages_recipient_id_fkey(id, username, display_name, profile_picture)
        `)
        .or(`sender_id.eq.${user.uid},recipient_id.eq.${user.uid}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('💬 ChatsScreen: Load conversations error:', error);
        return;
      }

      // Filter out expired ephemeral messages
      const validMessages = data?.filter(message => {
        if (isMessageExpired(message)) {
          console.log('💬 ChatsScreen: 🕐 Filtering out expired ephemeral message:', message.id);
          return false;
        }
        return true;
      }) || [];

      // Group messages by conversation partner
      const conversationMap = new Map();
      
      validMessages.forEach(message => {
        const isFromMe = message.sender_id === user.uid;
        const partnerId = isFromMe ? message.recipient_id : message.sender_id;
        const partner = isFromMe ? message.recipient : message.sender;
        
        // Skip if partner data is null or missing
        if (!partner || !partnerId) {
          console.warn('💬 ChatsScreen: Skipping message with missing partner data:', message.id);
          return;
        }
        
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            partnerUsername: partner.username || 'Unknown User',
            partnerDisplayName: partner.display_name || partner.username || 'Unknown User',
            partnerProfilePicture: partner.profile_picture,
            lastMessage: message.content,
            lastMessageTime: message.created_at,
            isLastMessageFromMe: isFromMe,
            unreadCount: 0, // TODO: Implement unread count
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
      
    } catch (error) {
      console.error('💬 ChatsScreen: Load conversations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const messageTime = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return messageTime.toLocaleDateString();
  };

  const renderHeader = () => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      backgroundColor: currentTheme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: currentTheme.colors.border,
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: currentTheme.colors.text,
      }}>
        Chats
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        <TouchableOpacity onPress={() => navigation.navigate('Friends')}>
          <Ionicons name="people-outline" size={26} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('FindFriends')}>
          <Ionicons name="person-add-outline" size={26} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CreateGroupChat')}>
          <Ionicons name="add-circle-outline" size={30} color={currentTheme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGroupChat = ({ item }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: currentTheme.colors.surface,
        marginHorizontal: 15,
        marginVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: currentTheme.colors.border,
      }}
      onPress={() => navigation.navigate('GroupChat', {
        group: item
      })}
    >
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: currentTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <Ionicons name="people" size={24} color={currentTheme.colors.background} />
      </View>
      
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: currentTheme.colors.text,
          }}>
            {item.name}
          </Text>
          <Text style={{
            fontSize: 12,
            color: currentTheme.colors.textSecondary,
          }}>
            {formatTime(item.updated_at)}
          </Text>
        </View>
        
        <Text style={{
          fontSize: 14,
          color: currentTheme.colors.textSecondary,
          marginTop: 2,
        }} numberOfLines={1}>
          {item.member_ids?.length || 0} members - {item.description}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: currentTheme.colors.surface,
        marginHorizontal: 15,
        marginVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: currentTheme.colors.border,
      }}
      onPress={() => navigation.navigate('Chat', {
        recipientId: item.partnerId,
        recipientUsername: item.partnerUsername,
        recipientName: item.partnerDisplayName,
      })}
    >
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: currentTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        {item.partnerProfilePicture ? (
          <Image 
            source={{ uri: item.partnerProfilePicture }} 
            style={{ width: 50, height: 50, borderRadius: 25 }}
          />
        ) : (
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold',
            color: currentTheme.colors.background 
          }}>
            {(item.partnerUsername || item.partnerDisplayName)?.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: currentTheme.colors.text,
          }}>
            {item.partnerDisplayName || item.partnerUsername}
          </Text>
          <Text style={{
            fontSize: 12,
            color: currentTheme.colors.textSecondary,
          }}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        
        <Text style={{
          fontSize: 14,
          color: currentTheme.colors.textSecondary,
          marginTop: 2,
        }} numberOfLines={1}>
          {item.isLastMessageFromMe ? 'You: ' : ''}{item.lastMessage}
        </Text>
      </View>

      {item.unreadCount > 0 && (
        <View style={{
          backgroundColor: currentTheme.colors.primary,
          borderRadius: 12,
          minWidth: 24,
          height: 24,
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: 8,
        }}>
          <Text style={{
            color: currentTheme.colors.background,
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            {item.unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: currentTheme.colors.background 
    }}>
      {renderHeader()}

      {/* Tab Navigation */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: currentTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.colors.border,
      }}>
        <TouchableOpacity
          onPress={() => setActiveTab('direct')}
          style={{
            flex: 1,
            paddingVertical: 15,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'direct' ? currentTheme.colors.primary : 'transparent',
          }}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: activeTab === 'direct' ? 'bold' : 'normal',
            color: activeTab === 'direct' ? currentTheme.colors.primary : currentTheme.colors.textSecondary,
          }}>
            Direct Messages ({conversations.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('groups')}
          style={{
            flex: 1,
            paddingVertical: 15,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'groups' ? currentTheme.colors.primary : 'transparent',
          }}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: activeTab === 'groups' ? 'bold' : 'normal',
            color: activeTab === 'groups' ? currentTheme.colors.primary : currentTheme.colors.textSecondary,
          }}>
            Group Chats ({groupChats.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {loading ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 16,
            color: currentTheme.colors.textSecondary,
          }}>
            Loading {activeTab === 'direct' ? 'conversations' : 'group chats'}...
          </Text>
        </View>
      ) : activeTab === 'direct' ? (
        conversations.length > 0 ? (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.partnerId}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 10 }}
            showsVerticalScrollIndicator={false}
            onRefresh={loadConversations}
            refreshing={loading}
          />
        ) : (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
          }}>
            <Ionicons name="chatbubbles" size={64} color={currentTheme.colors.textSecondary} />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: currentTheme.colors.text,
              marginTop: 20,
              textAlign: 'center',
            }}>
              No conversations yet
            </Text>
            <Text style={{
              fontSize: 16,
              color: currentTheme.colors.textSecondary,
              marginTop: 10,
              textAlign: 'center',
            }}>
              Start chatting with your friends by finding them in the Discover section
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: currentTheme.colors.primary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 25,
                marginTop: 20,
              }}
              onPress={() => navigation.navigate('Discover')}
            >
              <Text style={{
                color: currentTheme.colors.background,
                fontSize: 16,
                fontWeight: 'bold',
              }}>
                Find Friends
              </Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        // Group Chats Tab
        groupChats.length > 0 ? (
          <FlatList
            data={groupChats}
            renderItem={renderGroupChat}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 10 }}
            showsVerticalScrollIndicator={false}
            onRefresh={getGroupChats}
            refreshing={loading}
          />
        ) : (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
          }}>
            <Ionicons name="people" size={64} color={currentTheme.colors.textSecondary} />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: currentTheme.colors.text,
              marginTop: 20,
              textAlign: 'center',
            }}>
              No group chats yet
            </Text>
            <Text style={{
              fontSize: 16,
              color: currentTheme.colors.textSecondary,
              marginTop: 10,
              textAlign: 'center',
            }}>
              Create a group chat to start conversations with multiple friends
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: currentTheme.colors.primary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 25,
                marginTop: 20,
              }}
              onPress={() => navigation.navigate('GroupChat', { isNewGroup: true })}
            >
              <Text style={{
                color: currentTheme.colors.background,
                fontSize: 16,
                fontWeight: 'bold',
              }}>
                Create Group Chat
              </Text>
            </TouchableOpacity>
          </View>
        )
      )}
    </SafeAreaView>
  );
} 