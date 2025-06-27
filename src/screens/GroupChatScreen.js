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
import { supabase } from '../../supabase.config';

export default function GroupChatScreen({ route }) {
  const navigation = useNavigation();
  const { groupChatId: initialGroupChatId, groupName: initialGroupName, isNewGroup = false } = route.params || {};
  
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const { colors: themeColors } = useTheme();
  
  // Zustand store connections
  const {
    groupChats,
    getGroupChats,
    currentGroupChat,
    messages: groupMessages,
    loading,
    error,
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
  const { generateActivitySuggestions, activitySuggestions, loading: aiLoading } = useAIStore();

  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Component State
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [modalVisible, setModalVisible] = useState(isNewGroup ? 'create' : null); // 'create', 'settings', 'add'
  const [members, setMembers] = useState([]);
  
  // Create/Add Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  const flatListRef = useRef(null);
  const currentUserId = user?.id;
  
  // This effect ensures we always have the latest group data from the store
  useEffect(() => {
    if (initialGroupChatId) {
      const group = groupChats.find(gc => gc.id === initialGroupChatId);
      if (group) {
        setCurrentGroupChat(group);
      }
    }
  }, [initialGroupChatId, groupChats, setCurrentGroupChat]);
  
  // Fetch initial data
  useEffect(() => {
    if (currentUserId) {
      getFriends();
      getGroupChats();
    }
  }, [currentUserId, getFriends, getGroupChats]);

  // Handle real-time subscriptions and message loading
  useFocusEffect(
    useCallback(() => {
      const groupChatId = currentGroupChat?.id;
      if (groupChatId) {
          loadGroupMessages(groupChatId);
        const unsubscribe = setupGroupMessageSubscription(groupChatId);
        
        return () => {
          if (unsubscribe) unsubscribe();
          clearCurrentGroupChat();
        };
      }
    }, [currentGroupChat?.id, loadGroupMessages, setupGroupMessageSubscription, clearCurrentGroupChat])
  );
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (groupMessages && groupMessages.length > 0 && flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [groupMessages]);

  // Set the current group to the one from route params if available
  useEffect(() => {
    if (route.params?.group) {
      console.log('💬 GroupChatScreen: Setting group from route params:', route.params.group.id);
      setCurrentGroupChat(route.params.group);
    }
  }, [route.params?.group, setCurrentGroupChat]);

  // If no group is selected, default to the first in the list.
  useEffect(() => {
    if (!currentGroupChat && groupChats.length > 0) {
      console.log('💬 GroupChatScreen: Auto-selecting first group chat from the list.');
      setCurrentGroupChat(groupChats[0]);
    }
  }, [currentGroupChat, groupChats, setCurrentGroupChat]);

  // Load group messages when the current group chat changes
  useEffect(() => {
    if (currentGroupChat?.id) {
      const { data, error } = loadGroupMessages(currentGroupChat.id);
      if (error) {
        console.error('Error loading group messages:', error);
      }
      return () => {
        if (data && data.subscription) {
          console.log('💬 GroupChatScreen: Cleaning up message subscription.');
          data.subscription.unsubscribe();
        }
        clearCurrentGroupChat();
      };
    }
  }, [currentGroupChat?.id, loadGroupMessages, setupGroupMessageSubscription, clearCurrentGroupChat]);

  const handleSendMessage = async () => {
    if (!currentGroupChat?.id || isSending || !newMessage.trim()) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    
    try {
      await sendGroupMessage(currentGroupChat.id, messageText);
    } catch (err) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message on failure
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      return Alert.alert('Group Name Required', 'Please enter a name for your group.');
    }
    if (selectedFriendIds.length === 0) {
      return Alert.alert('Add Members', 'Please select at least one friend.');
    }

    try {
      const newGroup = await createGroupChat(newGroupName.trim(), newGroupDescription.trim(), selectedFriendIds);
      if (newGroup) {
        setModalVisible(null);
        // Navigate to the newly created chat screen
        navigation.replace('GroupChat', { 
        groupChatId: newGroup.id,
          groupName: newGroup.name 
      });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
  };

  const handleAddMembers = async () => {
    if (selectedFriendIds.length === 0) {
      return Alert.alert('No Friends Selected', 'Please select friends to add.');
    }
    try {
      await addMembers(currentGroupChat.id, selectedFriendIds);
      setModalVisible(null);
      setSelectedFriendIds([]);
    } catch (err) {
       Alert.alert('Error', 'Failed to add members.');
    }
  };
  
  const handleLeaveGroup = () => {
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
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to leave group.');
            }
          },
        },
      ]
    );
  };
  
  const handleRemoveMember = (memberId) => {
     Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(currentGroupChat.id, memberId);
            } catch (err) {
              Alert.alert('Error', 'Failed to remove member.');
    }
          },
        },
      ]
    );
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Fetch full member details when settings/add modals open
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!currentGroupChat?.member_ids) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, display_name, profile_picture')
          .in('id', currentGroupChat.member_ids);
        if (error) throw error;
        setMembers(data || []);
    } catch (err) {
        console.error('Error fetching member details:', err);
        setMembers([]);
    }
  };

    if (modalVisible === 'settings' || modalVisible === 'add') {
      fetchMemberDetails();
    }
  }, [modalVisible, currentGroupChat]);


  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === currentUserId;
    return (
      <View style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        {!isMe && (
          <Image
            source={{ uri: item.sender?.profile_picture || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          { backgroundColor: isMe ? themeColors.primary : themeColors.card }
        ]}>
          {!isMe && <Text style={[styles.senderName, { color: themeColors.primary }]}>{item.sender?.display_name || item.sender?.username}</Text>}
          <Text style={[styles.messageText, { color: isMe ? 'white' : themeColors.text }]}>{item.content}</Text>
          <Text style={[styles.timestamp, { color: isMe ? '#e0e0e0' : themeColors.text, opacity: 0.7 }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };
  
  const renderFriendSelector = ({ item }) => {
    const isSelected = selectedFriendIds.includes(item.id);
    // Don't show friends who are already members when in 'add' mode
    if (modalVisible === 'add' && currentGroupChat?.member_ids.includes(item.id)) {
      return null;
    }
    return (
      <TouchableOpacity
        style={[styles.friendItem, { backgroundColor: isSelected ? themeColors.primary : themeColors.card }]}
        onPress={() => toggleFriendSelection(item.id)}
      >
        <Image source={{ uri: item.profile_picture || 'https://via.placeholder.com/40' }} style={styles.friendAvatar} />
        <Text style={{ color: isSelected ? 'white' : themeColors.text }}>{item.display_name || item.username}</Text>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? 'white' : themeColors.border}
        />
      </TouchableOpacity>
    );
  };

  const renderMemberItem = ({ item }) => {
    const isAdmin = currentGroupChat?.admin_ids.includes(item.id) || currentGroupChat?.creator_id === item.id;
    const isSelf = item.id === currentUserId;
    const canRemove = (currentGroupChat?.admin_ids.includes(currentUserId) || currentGroupChat?.creator_id === currentUserId) && !isSelf;
    
    return (
      <View style={styles.memberItem}>
        <Image source={{ uri: item.profile_picture || 'https://via.placeholder.com/40' }} style={styles.friendAvatar} />
        <View style={styles.memberInfo}>
          <Text style={{ color: themeColors.text }}>{item.display_name || item.username}</Text>
          {isAdmin && <Text style={{ color: themeColors.primary, fontSize: 12 }}>Admin</Text>}
        </View>
        {canRemove && (
           <TouchableOpacity onPress={() => handleRemoveMember(item.id)}>
             <Ionicons name="remove-circle-outline" size={24} color={themeColors.notification} />
           </TouchableOpacity>
        )}
      </View>
    );
  };
  
  const renderModalContent = () => {
    switch (modalVisible) {
      case 'create':
        return (
          <>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Create New Group</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.card, color: themeColors.text }]}
              placeholder="Group Name"
              placeholderTextColor={themeColors.text}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <Text style={[styles.modalSubtitle, { color: themeColors.text }]}>Add Friends</Text>
            <FlatList
              data={friends}
              renderItem={renderFriendSelector}
              keyExtractor={item => item.id.toString()}
              style={{ maxHeight: 200 }}
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.primary }]} onPress={handleCreateGroup}>
              <Text style={styles.buttonText}>Create Group</Text>
            </TouchableOpacity>
          </>
        );
      case 'add':
        return (
          <>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add Members</Text>
          <FlatList
            data={friends}
              renderItem={renderFriendSelector}
              keyExtractor={item => item.id.toString()}
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.primary }]} onPress={handleAddMembers}>
              <Text style={styles.buttonText}>Add Selected Members</Text>
            </TouchableOpacity>
          </>
        );
      case 'settings':
         return (
          <>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>{currentGroupChat?.name} Settings</Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.text }]}>Members ({members.length})</Text>
            <FlatList
              data={members}
              renderItem={renderMemberItem}
            keyExtractor={(item) => item.id}
              style={{ maxHeight: 250 }}
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.primary }]} onPress={() => { setModalVisible('add'); setSelectedFriendIds([]); }}>
              <Text style={styles.buttonText}>Add Members</Text>
            </TouchableOpacity>
             <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.notification }]} onPress={handleLeaveGroup}>
              <Text style={styles.buttonText}>Leave Group</Text>
            </TouchableOpacity>
          </>
        );
      default:
        return null;
    }
  };

  if (isNewGroup && modalVisible !== 'create') {
    // This case handles navigating back from a newly created group.
    // It should just go back to the previous screen (e.g., ChatsScreen).
    navigation.goBack();
    return null;
  }
  
  if (!currentGroupChat && !isNewGroup) {
    if (loading) {
      return <SafeAreaView style={styles.container}><ActivityIndicator /></SafeAreaView>;
  }
    return <SafeAreaView style={styles.container}><Text style={{color: themeColors.text}}>Group not found.</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{currentGroupChat?.name || newGroupName || 'New Group'}</Text>
        <TouchableOpacity onPress={() => setModalVisible('settings')}>
          <Ionicons name="settings-outline" size={24} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={groupMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={{color: themeColors.text}}>No messages yet. Say hi!</Text>
            </View>
          )}
        />

        <View style={[styles.inputContainer, { backgroundColor: themeColors.card }]}>
          <TextInput
            style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text }]}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={setNewMessage}
            editable={!isNewGroup}
          />
          <TouchableOpacity onPress={handleSendMessage} disabled={isSending}>
            {isSending ? <ActivityIndicator color={themeColors.primary} /> : <Ionicons name="send" size={24} color={themeColors.primary} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible !== null}
        onRequestClose={() => setModalVisible(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            {renderModalContent()}
            <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={() => setModalVisible(null)}>
               <Text style={[styles.buttonText, { color: themeColors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  messageList: { padding: 10 },
  messageRow: { flexDirection: 'row', marginVertical: 5, maxWidth: '80%' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  messageBubble: { padding: 10, borderRadius: 15 },
  senderName: { fontWeight: 'bold', marginBottom: 5 },
  messageText: { fontSize: 16 },
  timestamp: { fontSize: 10, alignSelf: 'flex-end', marginTop: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#333' },
  input: { flex: 1, height: 40, borderRadius: 20, paddingHorizontal: 15, marginRight: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalSubtitle: { fontSize: 18, fontWeight: '600', marginVertical: 10 },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  closeButton: { backgroundColor: '#555' },
  friendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, marginVertical: 5, borderRadius: 10 },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  memberItem: { flexDirection: 'row', alignItems: 'center', padding: 10, marginVertical: 5 },
  memberInfo: { flex: 1, marginLeft: 15 },
}); 