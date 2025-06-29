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
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { useGroupChatStore } from '../stores/groupChatStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useAIStore } from '../stores/aiStore';
import { useFocusEffect, useTheme, useNavigation } from '@react-navigation/native';

const createStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  messageList: {
    flex: 1,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    marginVertical: 4,
    marginHorizontal: 10,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.primary,
    fontSize: 12,
  },
  messageText: {
    fontSize: 16,
    color: 'white',
  },
  theirMessageText: {
    color: colors.text,
  },
  messageTimestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 5,
    color: 'white',
    opacity: 0.7,
  },
  theirMessageTimestamp: {
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
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
  noChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noChatMessage: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  friendName: {
    fontSize: 18,
    color: colors.text,
    marginLeft: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
   activityIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function GroupChatScreen({ route }) {
  const navigation = useNavigation();
  const { group } = route.params || {};

  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const {
    groupChats,
    getGroupChats,
    currentGroupChat,
    groupMessages,
    loading,
    loadGroupMessages,
    sendGroupMessage,
    setupGroupMessageSubscription,
    createGroupChat,
    addMembers,
    leaveGroup,
    removeMember,
    setCurrentGroupChat,
    clearCurrentGroupChat,
  } = useGroupChatStore();

  const { friends, getFriends } = useFriendStore();

  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(null); // 'settings', 'add'
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  const flatListRef = useRef(null);
  const currentUserId = user?.id;

  useEffect(() => {
    if (group) {
      setCurrentGroupChat(group);
    } else if (groupChats.length > 0 && !currentGroupChat) {
      setCurrentGroupChat(groupChats[0]);
    }
  }, [group, groupChats, currentGroupChat, setCurrentGroupChat]);

  useEffect(() => {
    getFriends();
    getGroupChats();
  }, [getFriends, getGroupChats]);

  useFocusEffect(
    useCallback(() => {
      if (currentGroupChat?.id) {
        loadGroupMessages(currentGroupChat.id);
        const unsubscribe = setupGroupMessageSubscription(currentGroupChat.id);
        return () => {
          if (unsubscribe) unsubscribe();
          clearCurrentGroupChat();
        };
      }
    }, [currentGroupChat?.id])
  );

  useEffect(() => {
    if (flatListRef.current && groupMessages.length > 0) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 300);
    }
  }, [groupMessages]);
  
  const memberDetails = useMemo(() => {
    if (!currentGroupChat?.member_ids || friends.length === 0) return [];
    const memberMap = new Map(friends.map(f => [f.id, f]));
    return currentGroupChat.member_ids.map(id => memberMap.get(id)).filter(Boolean);
  }, [currentGroupChat?.member_ids, friends]);

  const handleSendMessage = async () => {
    if (!currentGroupChat?.id || !newMessage.trim() || isSending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    await sendGroupMessage(currentGroupChat.id, content);
    setIsSending(false);
  };

  const handleAddMembers = async () => {
    if (!currentGroupChat?.id || selectedFriendIds.length === 0) return;
    await addMembers(currentGroupChat.id, selectedFriendIds);
    setModalVisible(null);
    setSelectedFriendIds([]);
  };
  
  const handleLeaveGroup = async () => {
    if (!currentGroupChat) return;

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
              await leaveGroup(currentGroupChat.id);
              Alert.alert('Success', 'You have left the group.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave the group. Please try again.');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleRemoveMemberPress = (memberId) => {
    Alert.alert("Remove Member", "Are you sure you want to remove this member?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMember(currentGroupChat.id, memberId) }
    ]);
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };
  
  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;
    const sender = !isCurrentUser ? memberDetails.find(m => m.id === item.senderId) : null;
    return (
      <View style={[styles.messageBubble, isCurrentUser ? styles.myMessage : styles.theirMessage]}>
        {!isCurrentUser && sender && (
          <Text style={styles.senderName}>{sender.display_name || 'Unknown User'}</Text>
        )}
        <Text style={[styles.messageText, !isCurrentUser && styles.theirMessageText]}>{item.text}</Text>
        <Text style={[styles.messageTimestamp, !isCurrentUser && styles.theirMessageTimestamp]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };
  
  const renderFriendSelector = ({ item }) => (
    <TouchableOpacity style={styles.friendItem} onPress={() => toggleFriendSelection(item.id)}>
      <Ionicons name={selectedFriendIds.includes(item.id) ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
      <Text style={styles.friendName}>{item.display_name}</Text>
    </TouchableOpacity>
  );

  const renderMemberItem = ({ item }) => (
    <View style={styles.friendItem}>
      <Text style={styles.friendName}>{item.display_name}</Text>
      {currentGroupChat?.admin_ids?.includes(currentUserId) && item.id !== currentUserId && (
        <TouchableOpacity onPress={() => handleRemoveMemberPress(item.id)} style={{ marginLeft: 'auto' }}>
          <Ionicons name="remove-circle" size={24} color="red" />
        </TouchableOpacity>
      )}
    </View>
  );
  
  const renderModalContent = () => {
    if (modalVisible === 'settings') {
      return (
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{currentGroupChat.name}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(null)}><Ionicons name="close-circle" size={30} color={colors.text} /></TouchableOpacity>
          <Text style={{ ...styles.modalTitle, fontSize: 18 }}>Members</Text>
          <FlatList data={memberDetails} renderItem={renderMemberItem} keyExtractor={item => item.id} style={{ maxHeight: 200, marginBottom: 20 }} />
          <TouchableOpacity style={styles.actionButton} onPress={() => { setModalVisible('add'); setSelectedFriendIds([]); }}><Text style={styles.actionButtonText}>Add Friends</Text></TouchableOpacity>
          <TouchableOpacity style={{ ...styles.actionButton, backgroundColor: 'red', marginTop: 15 }} onPress={handleLeaveGroup}><Text style={styles.actionButtonText}>Leave Group</Text></TouchableOpacity>
        </View>
      );
    }
    if (modalVisible === 'add') {
      const friendsToAdd = friends.filter(f => !currentGroupChat.member_ids.includes(f.id));
      return (
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Add Members</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(null)}><Ionicons name="close-circle" size={30} color={colors.text} /></TouchableOpacity>
          <FlatList data={friendsToAdd} renderItem={renderFriendSelector} keyExtractor={item => item.id} style={{ maxHeight: '70%' }} />
          <TouchableOpacity style={styles.actionButton} onPress={handleAddMembers}><Text style={styles.actionButtonText}>Add Selected Friends</Text></TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  if (loading && !currentGroupChat) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.activityIndicator} size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentGroupChat?.name || 'Group'}</Text>
          {currentGroupChat ? (
            <TouchableOpacity onPress={() => setModalVisible('settings')}>
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : <View style={{width: 24}} />}
        </View>

        {!currentGroupChat ? (
          <View style={styles.noChatContainer}>
            <Text style={styles.noChatMessage}>Select a group to start chatting, or create a new one.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={groupMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            style={styles.messageList}
            contentContainerStyle={{ paddingVertical: 10 }}
          />
        )}

        {currentGroupChat && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={colors.text}
            />
            <TouchableOpacity onPress={handleSendMessage} disabled={isSending}>
              <Ionicons name="send" size={24} color={isSending ? colors.border : colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal animationType="slide" transparent={true} visible={modalVisible !== null} onRequestClose={() => setModalVisible(null)}>
        <View style={styles.modalContainer}>
          {renderModalContent()}
        </View>
      </Modal>
    </SafeAreaView>
  );
} 