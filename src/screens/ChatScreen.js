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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../../supabase.config';
import { useTheme } from '@react-navigation/native';

const ChatScreen = ({ navigation, route }) => {
  const { recipientId, recipientUsername, recipientName, isGroup = false, groupName = null } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(10);
  const flatListRef = useRef(null);
  
  console.log('💬 ChatScreen: Initialized with recipient:', recipientId, recipientName);
  
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { isDarkMode } = useThemeStore();
  const styles = createStyles(colors || {}, isDarkMode);

  const currentUserId = user?.uid || user?.id || user?.userId;
  
  console.log('💬 ChatScreen: Current user ID:', currentUserId);

  useEffect(() => {
    if (currentUserId && recipientId) {
      console.log('💬 ChatScreen: Loading messages and setting up subscription');
      loadMessages();
      setupRealtimeSubscription();
    }

    return () => {
      console.log('💬 ChatScreen: Cleaning up subscription');
    };
  }, [currentUserId, recipientId]);

  const loadMessages = async () => {
    try {
      console.log('💬 ChatScreen: Loading messages between', currentUserId, 'and', recipientId);
      setLoading(true);
      
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
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ ChatScreen: Error loading messages:', error);
        return;
      }

      const processedMessages = data?.filter(msg => {
        // Filter out expired disappearing messages
        if (msg.timer_seconds > 0) {
          const expiryTime = new Date(msg.created_at).getTime() + (msg.timer_seconds * 1000);
          if (Date.now() > expiryTime) {
            console.log('💬 ChatScreen: Filtering out expired message:', msg.id);
            return false;
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
      console.log('✅ ChatScreen: Loaded', processedMessages.length, 'messages');

      setTimeout(() => {
        if (flatListRef.current && processedMessages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 100);
    } catch (error) {
      console.error('❌ ChatScreen: Error in loadMessages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('💬 ChatScreen: Setting up real-time subscription');
    
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId}))`
      }, (payload) => {
        console.log('💬 ChatScreen: New message received:', payload.new);
        const newMsg = payload.new;
        
        const processedMessage = {
          id: newMsg.id,
          text: newMsg.content,
          senderId: newMsg.sender_id,
          recipientId: newMsg.recipient_id,
          timestamp: new Date(newMsg.created_at),
          isCurrentUser: newMsg.sender_id === currentUserId,
          senderName: newMsg.sender_id === currentUserId ? 'You' : recipientName,
          timerSeconds: newMsg.timer_seconds || 0,
          isDisappearing: newMsg.timer_seconds > 0,
        };

        setMessages(prev => [...prev, processedMessage]);
        
        // Auto-scroll to new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) {
      console.warn('💬 ChatScreen: Cannot send empty message or already sending');
      return;
    }

    const messageContent = newMessage.trim();
    const messageTimer = isEphemeral ? timerSeconds : 0;
    
    console.log('💬 ChatScreen: Sending message:', {
      content: messageContent,
      recipientId,
      isEphemeral,
      timerSeconds: messageTimer
    });

    setSending(true);
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: currentUserId,
            recipient_id: recipientId,
            content: messageContent,
            message_type: 'text',
            timer_seconds: messageTimer,
            ai_generated: false,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ ChatScreen: Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
        setNewMessage(messageContent); // Restore message
        return;
      }

      console.log('✅ ChatScreen: Message sent successfully:', data.id);
    } catch (error) {
      console.error('❌ ChatScreen: Error in sendMessage:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleProfilePress = () => {
    console.log('💬 ChatScreen: Opening profile for:', recipientId);
    // Navigate to profile or show profile modal
    Alert.alert('Profile', `View ${recipientName}'s profile`);
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.isCurrentUser;
    
    return (
      <View style={styles.messageContainer}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.myMessage : styles.theirMessage
        ]}>
          <Text style={[
            styles.messageText,
            !isCurrentUser && styles.theirMessageText
          ]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timestamp,
              !isCurrentUser && styles.theirTimestamp
            ]}>
              {formatTime(item.timestamp)}
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
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
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
          <Text style={styles.headerTitle}>{recipientName || 'Chat'}</Text>
          <Text style={styles.headerSubtitle}>
            {recipientUsername ? `@${recipientUsername}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {/* Add profile/options functionality */}}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={isDarkMode ? '#FFFFFF' : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={60} color={colors.text + '40'} />
            <Text style={styles.emptyText}>
              No messages yet. Say hello to {recipientName}!
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
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="camera" size={20} color={colors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.text + '60'}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
          />
          
          <TouchableOpacity 
            onPress={sendMessage}
            style={[styles.sendButton, !newMessage.trim() && styles.disabledSendButton]}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={newMessage.trim() ? 'white' : colors.text + '40'} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? '#FFFFFF' : colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: isDarkMode ? '#AAAAAA' : colors.text + '80',
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  messageList: {
    flex: 1,
    backgroundColor: isDarkMode ? '#000000' : colors.background,
  },
  messageListContent: {
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessage: {
    backgroundColor: '#FFD700',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    borderWidth: 2,
    borderColor: '#FF69B4',
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
    color: '#000000',
    lineHeight: 20,
    fontWeight: '500',
  },
  theirMessageText: {
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#000000',
    opacity: 0.7,
  },
  theirTimestamp: {
    color: isDarkMode ? '#AAAAAA' : '#666666',
  },
  ephemeralIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 10,
    color: '#000000',
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
  },
  ephemeralLabel: {
    fontSize: 14,
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
  },
  timerButtonText: {
    fontSize: 12,
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
  attachButton: {
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
    backgroundColor: '#FF69B4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: colors.border,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text + '60',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ChatScreen; 