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
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../../supabase.config';

export default function ChatScreen({ navigation, route }) {
  const { recipientId, recipientUsername, recipientName, isGroup = false, groupName = null } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDisappearTimer, setShowDisappearTimer] = useState(false);
  const [disappearTimer, setDisappearTimer] = useState(null); // null means no timer
  const flatListRef = useRef(null);
  
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();

  const currentUserId = user?.uid || user?.id || user?.userId;

  // Disappearing message timer options (in seconds)
  const timerOptions = [
    { label: 'No Timer', value: null },
    { label: '5 seconds', value: 5 },
    { label: '10 seconds', value: 10 },
    { label: '30 seconds', value: 30 },
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '1 hour', value: 3600 },
  ];

  useEffect(() => {
    if (currentUserId && recipientId) {
      loadMessages();
      setupRealtimeSubscription();
    }

    return () => {
      // Clean up subscription on unmount
    };
  }, [currentUserId, recipientId]);

  const loadMessages = async () => {
    try {
      console.log('💬 ChatScreen: Loading messages between', currentUserId, 'and', recipientId);
      
      const { data, error } = await supabase
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
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`)
        .is('deleted_at', null) // Only get messages that haven't been deleted
        .order('created_at', { ascending: true });

      if (error) {
        console.error('💬 ChatScreen: Error loading messages:', error);
        return;
      }

      const processedMessages = data?.filter(msg => {
        // Filter out expired disappearing messages
        if (msg.timer_seconds > 0) {
          const expiryTime = new Date(msg.created_at).getTime() + (msg.timer_seconds * 1000);
          if (Date.now() > expiryTime) {
            return false; // Message has expired
          }
        }
        return true;
      }).map(msg => ({
        id: msg.id,
        text: msg.content,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        timestamp: new Date(msg.created_at),
        isCurrentUser: msg.sender_id === currentUserId,
        senderName: msg.sender?.display_name || msg.sender?.username || 'Unknown',
        timerSeconds: msg.timer_seconds || 0,
        isDisappearing: msg.timer_seconds > 0,
      })) || [];

      setMessages(processedMessages);
      console.log('💬 ChatScreen: Loaded', processedMessages.length, 'messages');

      // Scroll to bottom after loading
      setTimeout(() => {
        if (flatListRef.current && processedMessages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 100);
    } catch (error) {
      console.error('💬 ChatScreen: Error in loadMessages:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('💬 ChatScreen: Setting up real-time subscription');
    
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `or(and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId}))`
        }, 
        (payload) => {
          console.log('💬 ChatScreen: New message received:', payload);
          const newMsg = payload.new;
          
          const processedMessage = {
            id: newMsg.id,
            text: newMsg.content,
            senderId: newMsg.sender_id,
            recipientId: newMsg.recipient_id,
            timestamp: new Date(newMsg.created_at),
            isCurrentUser: newMsg.sender_id === currentUserId,
            senderName: newMsg.sender_id === currentUserId ? 'You' : recipientName,
          };

          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.id === processedMessage.id);
            if (exists) return prev;
            
            const updated = [...prev, processedMessage];
            
            // Auto-scroll to bottom for new messages
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }, 100);
            
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistic update - add message immediately to UI
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      text: messageText,
      senderId: currentUserId,
      recipientId: recipientId,
      timestamp: new Date(),
      isCurrentUser: true,
      senderName: 'You',
      isOptimistic: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 50);

    try {
      setLoading(true);

      // Prepare message data with optional disappearing timer
      const messageData = {
        sender_id: currentUserId,
        recipient_id: isGroup ? null : recipientId,
        content: messageText,
        message_type: 'text',
      };

      // Add disappearing timer if specified
      if (disappearTimer) {
        messageData.timer_seconds = disappearTimer;
      }

      // Add group members if this is a group chat
      if (isGroup && route.params.groupMembers) {
        messageData.group_members = route.params.groupMembers;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('💬 ChatScreen: Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        Alert.alert('Error', 'Failed to send message');
        return;
      }

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id 
          ? {
              id: data.id,
              text: data.content,
              senderId: data.sender_id,
              recipientId: data.recipient_id,
              timestamp: new Date(data.created_at),
              isCurrentUser: true,
              senderName: 'You',
            }
          : msg
      ));

    } catch (error) {
      console.error('💬 ChatScreen: Error in sendMessage:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
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

  const renderMessage = ({ item }) => {
    if (!item) return null;

    const isSender = item.senderId === currentUserId;
    const messageDate = new Date(item.timestamp);

    // Handle 'snap' type messages
    if (item.message_type === 'snap') {
      const snapText = isSender ? 'You sent a snap' : 'You received a snap';
      const snapIcon = isSender ? 'arrow-up-circle' : 'arrow-down-circle';
      const isOpened = item.opened; // Assuming your message has an 'opened' field

      return (
        <View style={[
          styles.messageContainer,
          isSender ? styles.senderContainer : styles.recipientContainer,
          isOpened ? { opacity: 0.6 } : {}
        ]}>
          <Ionicons name={snapIcon} size={20} color={isSender ? currentTheme.colors.text : currentTheme.colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.messageText, { color: isSender ? currentTheme.colors.text : currentTheme.colors.text }]}>
            {snapText} {isOpened ? '· Opened' : '· Tap to view'}
          </Text>
        </View>
      );
    }

    // Handle regular text messages
    return (
      <View style={[styles.messageContainer, isSender ? styles.senderContainer : styles.recipientContainer]}>
        <View style={{
          backgroundColor: isSender 
            ? currentTheme.colors.chatBubbleSent 
            : currentTheme.colors.chatBubbleReceived,
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 10,
          maxWidth: '75%',
          marginHorizontal: 8,
          borderWidth: 2,
          borderColor: isSender 
            ? currentTheme.colors.snapPink 
            : currentTheme.colors.borderStrong,
          shadowColor: currentTheme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
        }}>
          <Text style={{
            color: isSender 
              ? currentTheme.colors.chatBubbleTextSent 
              : currentTheme.colors.chatBubbleTextReceived,
            fontSize: 16,
            fontWeight: '500',
          }}>
            {item.text}
          </Text>
          <Text style={{
            color: isSender 
              ? currentTheme.colors.chatBubbleTextSent + '80'
              : currentTheme.colors.chatBubbleTextReceived + '80',
            fontSize: 12,
            marginTop: 4,
            textAlign: isSender ? 'right' : 'left',
          }}>
            {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {item.isOptimistic && ' ⏳'}
            {item.isDisappearing && ' 🕒'}
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: currentTheme.colors.surface,
          borderBottomWidth: 2,
          borderBottomColor: currentTheme.colors.snapYellow,
          shadowColor: currentTheme.colors.shadowStrong,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <TouchableOpacity
            onPress={() => {
              console.log('💬 ChatScreen: Back button pressed');
              navigation.goBack();
            }}
            style={{
              padding: 8,
              borderRadius: 20,
              backgroundColor: currentTheme.colors.snapPink,
              borderWidth: 2,
              borderColor: currentTheme.colors.snapYellow,
              marginRight: 12,
            }}
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.textInverse} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleProfilePress}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: currentTheme.colors.snapYellow,
              borderWidth: 2,
              borderColor: currentTheme.colors.snapPink,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: currentTheme.colors.textInverse,
            }}>
              {(recipientName || recipientUsername)?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: currentTheme.colors.text,
            }}>
              {isGroup ? (groupName || 'Group Chat') : (recipientName || recipientUsername)}
            </Text>
            <Text style={{
              fontSize: 14,
              color: currentTheme.colors.textSecondary,
            }}>
              {isGroup ? 'Group chat' : 'Active now'}
              {disappearTimer && ` • Disappearing: ${disappearTimer < 60 ? `${disappearTimer}s` : `${Math.floor(disappearTimer / 60)}m`}`}
            </Text>
          </View>

          {/* Disappearing Message Timer Button */}
          <TouchableOpacity
            onPress={() => {
              console.log('💬 ChatScreen: Timer button pressed');
              setShowDisappearTimer(!showDisappearTimer);
            }}
            style={{
              padding: 8,
              borderRadius: 15,
              backgroundColor: disappearTimer ? currentTheme.colors.snapYellow : currentTheme.colors.surface,
              borderWidth: 2,
              borderColor: currentTheme.colors.borderStrong,
              marginLeft: 8,
            }}
          >
            <Ionicons 
              name="timer-outline" 
              size={20} 
              color={disappearTimer ? currentTheme.colors.textInverse : currentTheme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          style={{ 
            flex: 1, 
            backgroundColor: currentTheme.colors.background,
            paddingHorizontal: 16,
          }}
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 40,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: currentTheme.colors.text,
                marginBottom: 8,
              }}>
                Start the conversation!
              </Text>
              <Text style={{
                fontSize: 14,
                color: currentTheme.colors.textSecondary,
                textAlign: 'center',
              }}>
                Send a message to {recipientName || recipientUsername}
              </Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: currentTheme.colors.surface,
          borderTopWidth: 2,
          borderTopColor: currentTheme.colors.snapYellow,
          shadowColor: currentTheme.colors.shadowStrong,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}>
          {/* Camera Snap Button */}
          <TouchableOpacity
            onPress={() => {
              console.log('💬 ChatScreen: Camera snap button pressed');
              navigation.navigate('Camera', { 
                directSendTo: recipientId,
                recipientName: recipientName || recipientUsername 
              });
            }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: currentTheme.colors.snapPink,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
              borderWidth: 2,
              borderColor: currentTheme.colors.snapYellow,
              shadowColor: currentTheme.colors.snapPink,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Ionicons name="camera" size={24} color={currentTheme.colors.textInverse} />
          </TouchableOpacity>

          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: currentTheme.colors.background,
            borderRadius: 25,
            borderWidth: 2,
            borderColor: currentTheme.colors.borderStrong,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginRight: 12,
            shadowColor: currentTheme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}>
            <TextInput
              value={newMessage}
              onChangeText={(text) => {
                console.log('💬 ChatScreen: Message text changed:', text);
                setNewMessage(text);
              }}
              placeholder={`Message ${recipientName || recipientUsername}...`}
              placeholderTextColor={currentTheme.colors.textTertiary}
              style={{
                flex: 1,
                fontSize: 16,
                color: currentTheme.colors.text,
                maxHeight: 100,
              }}
              multiline
              onSubmitEditing={() => {
                if (!loading && newMessage.trim()) {
                  console.log('💬 ChatScreen: Message submitted via keyboard');
                  sendMessage();
                }
              }}
              returnKeyType="send"
              blurOnSubmit={false}
            />
          </View>

          <TouchableOpacity
            onPress={() => {
              console.log('💬 ChatScreen: Send button pressed');
              sendMessage();
            }}
            disabled={!newMessage.trim() || loading}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: currentTheme.colors.snapYellow,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: (!newMessage.trim() || loading) ? 0.5 : 1,
              borderWidth: 2,
              borderColor: currentTheme.colors.snapPink,
              shadowColor: currentTheme.colors.snapYellow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Ionicons 
              name={loading ? "hourglass" : "send"} 
              size={24} 
              color={currentTheme.colors.textInverse} 
            />
          </TouchableOpacity>
        </View>

        {/* Disappearing Timer Options Modal */}
        {showDisappearTimer && (
          <View style={{
            position: 'absolute',
            bottom: 100,
            right: 16,
            backgroundColor: currentTheme.colors.surface,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: currentTheme.colors.snapYellow,
            padding: 12,
            shadowColor: currentTheme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            minWidth: 150,
          }}>
            <Text style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: currentTheme.colors.text,
              marginBottom: 8,
              textAlign: 'center',
            }}>
              Disappearing Messages
            </Text>
            {timerOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  console.log('💬 ChatScreen: Timer option selected:', option.label);
                  setDisappearTimer(option.value);
                  setShowDisappearTimer(false);
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: disappearTimer === option.value ? currentTheme.colors.snapYellow : 'transparent',
                  marginVertical: 2,
                }}
              >
                <Text style={{
                  color: disappearTimer === option.value ? currentTheme.colors.textInverse : currentTheme.colors.text,
                  fontSize: 12,
                  textAlign: 'center',
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 5,
    maxWidth: '80%',
  },
  senderContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  recipientContainer: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  senderText: {
    // color is set inline based on theme
  },
  recipientText: {
    // color is set inline based on theme
  },
}); 