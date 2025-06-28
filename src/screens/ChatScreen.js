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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../../supabase.config';
import { useTheme } from '@react-navigation/native';

const createStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: colors.text,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageContainer: {
    marginVertical: 5,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 15,
    maxWidth: '80%',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 15,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    color: 'white',
  },
  theirMessageText: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 10,
    color: 'white',
    opacity: 0.7,
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  theirTimestamp: {
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: colors.card,
    color: colors.text,
    marginRight: 10,
  },
});

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
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
        Alert.alert('Error', 'An unexpected error occurred while sending the message.');
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
      Alert.alert('Error', 'An unexpected error occurred while sending the message.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleProfilePress = () => {
    // Prevent navigation if there's no recipient or it's a group chat.
    // Future enhancement: navigate to a group profile screen.
    if (!recipientId || isGroup) return;

    navigation.navigate('Profile', {
      userId: recipientId,
    });
  };

  const renderMessage = ({ item }) => {
    return (
      <View style={styles.messageContainer}>
        <View style={item.isCurrentUser ? styles.myMessage : styles.theirMessage}>
          <Text style={item.isCurrentUser ? styles.messageText : styles.theirMessageText}>
            {item.text}
          </Text>
          <Text style={item.isCurrentUser ? styles.timestamp : styles.theirTimestamp}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleProfilePress}>
          <Text style={styles.headerTitle}>{recipientName || recipientUsername}</Text>
        </TouchableOpacity>
        <View style={{width: 24}} /> 
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messageList}
          contentContainerStyle={{ paddingTop: 10 }}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#888"
          />
          <TouchableOpacity onPress={sendMessage} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="send" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 