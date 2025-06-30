import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../../supabase.config';
import { useTheme } from '@react-navigation/native';

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
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
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
    backgroundColor: '#E6C200',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  disabledSendButton: {
    backgroundColor: colors.textTertiary,
    borderColor: colors.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text + '60',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  optionsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F8F8',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 16,
    color: isDarkMode ? '#FFFFFF' : (colors?.text || '#000000'),
    fontWeight: '400',
  },
  deleteOption: {
    backgroundColor: (colors?.notification || '#FF3B30') + '10',
  },
  deleteOptionText: {
    color: colors?.notification || '#FF3B30',
    fontWeight: '500',
  },
  cancelOption: {
    backgroundColor: isDarkMode ? '#2C2C2E' : colors.border + '20',
    marginTop: 8,
  },
});

const ChatScreen = ({ navigation, route }) => {
  const { recipientId, recipientUsername, recipientName, isGroup = false, groupName = null } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(10);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const flatListRef = useRef(null);
  
  console.log('💬 ChatScreen: Initialized with recipient:', recipientId, recipientName);
  
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { isDarkMode } = useThemeStore();
  
  // Ensure colors is available before creating styles
  const styles = useMemo(() => {
    // Provide fallback colors if colors is undefined
    const fallbackColors = colors || {
      background: isDarkMode ? '#000000' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      primary: '#007AFF',
      card: isDarkMode ? '#1C1C1E' : '#F2F2F7',
      notification: '#FF3B30',
      border: isDarkMode ? '#38383A' : '#C6C6C8',
    };
    return createStyles(fallbackColors, isDarkMode);
  }, [colors, isDarkMode]);

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

  const deleteMessageHistory = async () => {
    setShowOptionsModal(false);
    
    Alert.alert(
      'Delete Message History',
      `Are you sure you want to delete all messages with ${recipientName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('💬 ChatScreen: Deleting message history between', currentUserId, 'and', recipientId);
              
              const { error } = await supabase
                .from('messages')
                .update({ deleted_at: new Date().toISOString() })
                .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`);

              if (error) {
                console.error('❌ ChatScreen: Error deleting messages:', error);
                Alert.alert('Error', 'Failed to delete message history. Please try again.');
                return;
              }

              setMessages([]);
              console.log('✅ ChatScreen: Message history deleted successfully');
              Alert.alert('Success', 'Message history has been deleted.');
            } catch (error) {
              console.error('❌ ChatScreen: Error in deleteMessageHistory:', error);
              Alert.alert('Error', 'Failed to delete message history. Please try again.');
            }
          },
        },
      ]
    );
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
          onPress={() => setShowOptionsModal(true)}
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

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.optionsModal}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginVertical: 4,
                backgroundColor: '#FF3B3010',
              }}
              onPress={deleteMessageHistory}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={{
                color: '#FF3B30',
                fontWeight: 'bold',
                fontSize: 16,
                marginLeft: 16,
                textAlign: 'left',
                flex: 1,
              }}>
                Delete Message History
              </Text>
            </TouchableOpacity>
            
              <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginVertical: 4,
                backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F8F8',
                marginTop: 8,
              }}
              onPress={() => setShowOptionsModal(false)}
            >
              <Ionicons name="close-outline" size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              <Text style={{
                color: isDarkMode ? '#FFFFFF' : '#000000',
                fontSize: 16,
                marginLeft: 16,
                fontWeight: '400',
                flex: 1,
              }}>Cancel</Text>
              </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default ChatScreen; 