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
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../../supabase.config';

export default function ChatsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuthStore();
  const { friends, getFriends } = useFriendStore();
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
    }
  }, [user]);

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

      // Group messages by conversation partner
      const conversationMap = new Map();
      
      data?.forEach(message => {
        const isFromMe = message.sender_id === user.uid;
        const partnerId = isFromMe ? message.recipient_id : message.sender_id;
        const partner = isFromMe ? message.recipient : message.sender;
        
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            partnerUsername: partner.username,
            partnerDisplayName: partner.display_name,
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
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.colors.border,
        backgroundColor: currentTheme.colors.surface,
      }}>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: currentTheme.colors.text,
        }}>
          💬 Chats
        </Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Friends')}>
            <Ionicons name="people" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
            <Ionicons name="person-add" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations List */}
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
            Loading conversations...
          </Text>
        </View>
      ) : conversations.length > 0 ? (
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
      )}
    </SafeAreaView>
  );
} 