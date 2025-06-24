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
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    if (user?.uid && recipientId) {
      loadMessages();
      setupRealtimeSubscription();
    }
  }, [user, recipientId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log('💬 ChatScreen: Loading messages between', user.uid, 'and', recipientId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.uid},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.uid})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('💬 ChatScreen: Error loading messages:', error);
        Alert.alert('Error', 'Failed to load messages');
        return;
      }

      console.log('💬 ChatScreen: Loaded', data?.length || 0, 'messages');
      setMessages(data || []);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('💬 ChatScreen: Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('💬 ChatScreen: Setting up real-time subscription');
    
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
          console.log('💬 ChatScreen: New message received:', payload.new);
          const newMsg = payload.new;
          
          // Only add if it's not already in the list (to prevent duplicates)
          setMessages(prev => {
            const exists = prev.find(msg => msg.id === newMsg.id);
            if (exists) return prev;
            
            const updated = [...prev, newMsg];
            // Scroll to bottom when new message arrives
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      console.log('💬 ChatScreen: Cleaning up real-time subscription');
      supabase.removeChannel(subscription);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setSending(true);
    
    try {
      console.log('💬 ChatScreen: Sending message:', messageText);
      
      // Optimistically add message to UI
      const optimisticMessage = {
        id: `temp-${Date.now()}`, // Temporary ID
        sender_id: user.uid,
        recipient_id: recipientId,
        content: messageText,
        message_type: 'text',
        created_at: new Date().toISOString(),
        sending: true, // Mark as sending
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Scroll to bottom immediately
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      
      // Send to database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.uid,
          recipient_id: recipientId,
          content: messageText,
          message_type: 'text',
        })
        .select()
        .single();

      if (error) {
        console.error('💬 ChatScreen: Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        Alert.alert('Error', 'Failed to send message');
        setNewMessage(messageText); // Restore message text
        return;
      }

      console.log('💬 ChatScreen: Message sent successfully:', data);
      
      // Replace optimistic message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...data, sending: false }
            : msg
        )
      );
      
    } catch (error) {
      console.error('💬 ChatScreen: Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageText); // Restore message text
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleProfilePress = () => {
    // Navigate to user profile (to be implemented)
    Alert.alert('Profile', `View ${recipientName}'s profile`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'View Profile', onPress: () => {
        // TODO: Navigate to profile screen
        console.log('Navigate to profile for user:', recipientId);
      }}
    ]);
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id === user.uid;
    const showTime = index === 0 || 
      (new Date(item.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000); // 5 minutes

    return (
      <View style={{ marginVertical: 2 }}>
        {showTime && (
          <Text style={{
            textAlign: 'center',
            color: currentTheme.colors.textSecondary,
            fontSize: 12,
            marginVertical: 10,
          }}>
            {formatTime(item.created_at)}
          </Text>
        )}
        
        <View style={{
          flexDirection: 'row',
          justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
          paddingHorizontal: 15,
          marginVertical: 2,
        }}>
          <View style={{
            backgroundColor: isMyMessage ? currentTheme.colors.primary : currentTheme.colors.surface,
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 10,
            maxWidth: '80%',
            borderWidth: 1,
            borderColor: currentTheme.colors.border,
            opacity: item.sending ? 0.7 : 1,
          }}>
            <Text style={{
              color: isMyMessage ? currentTheme.colors.background : currentTheme.colors.text,
              fontSize: 16,
            }}>
              {item.content}
            </Text>
            
            {item.sending && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 4,
              }}>
                <Text style={{
                  color: isMyMessage ? currentTheme.colors.background : currentTheme.colors.textSecondary,
                  fontSize: 12,
                  opacity: 0.7,
                }}>
                  Sending...
                </Text>
              </View>
            )}
          </View>
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
        
        <TouchableOpacity
          onPress={handleProfilePress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
          }}
        >
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
              color: currentTheme.colors.background,
            }}>
              {(recipientName || recipientUsername)?.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View>
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
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            // Navigate to camera for sending snap
            navigation.navigate('Camera', {
              recipientId,
              recipientUsername,
              mode: 'snap'
            });
          }}
          style={{
            backgroundColor: currentTheme.colors.primary,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{
            color: currentTheme.colors.background,
            fontWeight: 'bold',
            fontSize: 12,
          }}>
            📸 Snap
          </Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 16,
            }}>
              Loading messages...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 10 }}
            onContentSizeChange={() => {
              // Auto-scroll to bottom when content changes
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            ListEmptyComponent={() => (
              <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 50,
              }}>
                <Ionicons name="chatbubbles-outline" size={64} color={currentTheme.colors.textSecondary} />
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: currentTheme.colors.text,
                  marginTop: 15,
                  textAlign: 'center',
                }}>
                  Start a conversation
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: currentTheme.colors.textSecondary,
                  marginTop: 8,
                  textAlign: 'center',
                }}>
                  Send a message to {recipientName || recipientUsername}
                </Text>
              </View>
            )}
          />
        )}

        {/* Message Input */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 15,
          borderTopWidth: 1,
          borderTopColor: currentTheme.colors.border,
          backgroundColor: currentTheme.colors.surface,
        }}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={currentTheme.colors.textSecondary}
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
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            style={{
              backgroundColor: newMessage.trim() && !sending ? currentTheme.colors.primary : currentTheme.colors.border,
              borderRadius: 25,
              padding: 12,
            }}
          >
            <Ionicons 
              name={sending ? "hourglass" : "send"} 
              size={20} 
              color={newMessage.trim() && !sending ? currentTheme.colors.background : currentTheme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 