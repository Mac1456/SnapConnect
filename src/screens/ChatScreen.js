import React, { useEffect, useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../../supabase.config';

export default function ChatScreen({ navigation, route }) {
  const { recipientId, recipientUsername, recipientName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);
  
  const { user } = useAuthStore();
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
    loadMessages();
    setupRealtimeSubscription();
  }, [recipientId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.uid},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.uid})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('💬 ChatScreen: Load messages error:', error);
        return;
      }

      setMessages(data || []);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('💬 ChatScreen: Load messages error:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.uid},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.uid}))`,
        },
        (payload) => {
          console.log('💬 ChatScreen: New message received:', payload);
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      
      const messageData = {
        sender_id: user.uid,
        recipient_id: recipientId,
        content: newMessage.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) {
        console.error('💬 ChatScreen: Send message error:', error);
        Alert.alert('Error', 'Failed to send message');
        return;
      }

      setNewMessage('');
      
    } catch (error) {
      console.error('💬 ChatScreen: Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const sendSnap = () => {
    // Navigate to camera with recipient info for sending snap
    navigation.navigate('Camera', { 
      recipientId,
      recipientUsername,
      mode: 'snap'
    });
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === user.uid;
    const messageTime = new Date(item.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
        marginVertical: 4,
        marginHorizontal: 15,
      }}>
        <View style={{
          backgroundColor: isMyMessage ? currentTheme.colors.primary : currentTheme.colors.surface,
          borderRadius: 20,
          paddingHorizontal: 15,
          paddingVertical: 10,
          maxWidth: '80%',
          borderWidth: 1,
          borderColor: currentTheme.colors.border,
        }}>
          <Text style={{
            color: isMyMessage ? currentTheme.colors.background : currentTheme.colors.text,
            fontSize: 16,
          }}>
            {item.content}
          </Text>
          <Text style={{
            color: isMyMessage ? currentTheme.colors.background : currentTheme.colors.textSecondary,
            fontSize: 12,
            marginTop: 4,
            textAlign: 'right',
          }}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: currentTheme.colors.background 
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.colors.border,
        backgroundColor: currentTheme.colors.surface,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
        </TouchableOpacity>
        
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: currentTheme.colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold',
            color: currentTheme.colors.background 
          }}>
            {(recipientUsername || recipientName)?.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: currentTheme.colors.text,
          }}>
            {recipientName || recipientUsername}
          </Text>
          <Text style={{
            fontSize: 14,
            color: currentTheme.colors.textSecondary,
          }}>
            @{recipientUsername}
          </Text>
        </View>

        <TouchableOpacity
          onPress={sendSnap}
          style={{
            backgroundColor: currentTheme.colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Ionicons name="camera" size={20} color={currentTheme.colors.background} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 50,
          }}>
            <Ionicons name="chatbubbles" size={48} color={currentTheme.colors.textSecondary} />
            <Text style={{
              fontSize: 16,
              color: currentTheme.colors.textSecondary,
              marginTop: 10,
              textAlign: 'center',
            }}>
              Start a conversation with {recipientName || recipientUsername}
            </Text>
          </View>
        )}
      />

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 15,
          borderTopWidth: 1,
          borderTopColor: currentTheme.colors.border,
          backgroundColor: currentTheme.colors.surface,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            backgroundColor: currentTheme.colors.background,
            borderRadius: 25,
            paddingHorizontal: 15,
            paddingVertical: 12,
            fontSize: 16,
            color: currentTheme.colors.text,
            borderWidth: 1,
            borderColor: currentTheme.colors.border,
            marginRight: 10,
          }}
          placeholder="Type a message..."
          placeholderTextColor={currentTheme.colors.textSecondary}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!newMessage.trim() || loading}
          style={{
            backgroundColor: newMessage.trim() ? currentTheme.colors.primary : currentTheme.colors.border,
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={newMessage.trim() ? currentTheme.colors.background : currentTheme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 