import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';

import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useGroupChatStore } from '../stores/groupChatStore';
import { useAIStore } from '../stores/aiStore';

const { width } = Dimensions.get('window');

const CreateGroupChatScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Zustand Stores
  const { user } = useAuthStore();
  const { friends, getFriends } = useFriendStore();
  const { createGroupChat, loading: groupLoading } = useGroupChatStore();
  const {
    getGroupDetailsRecommendations,
    getGroupMemberRecommendations,
    groupDetailsSuggestions,
    groupMemberRecommendations,
    loading: aiLoading,
    error: aiError,
  } = useAIStore();

  // Component State
  const [groupName, setGroupName] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [groupInterests, setGroupInterests] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch friends on mount
  useEffect(() => {
    getFriends();
  }, [getFriends]);

  // Update form when AI suggestions are available
  useEffect(() => {
    if (groupDetailsSuggestions?.groupName) setGroupName(groupDetailsSuggestions.groupName);
    if (groupDetailsSuggestions?.groupInterests?.length) setGroupInterests(groupDetailsSuggestions.groupInterests);
  }, [groupDetailsSuggestions]);
  
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for your group.');
      return;
    }
    if (selectedFriendIds.size === 0) {
      Alert.alert('Add Members', 'Please add at least one friend to the group.');
      return;
    }

    const memberIds = Array.from(selectedFriendIds);
    const result = await createGroupChat(groupName.trim(), groupInterests.join(', '), memberIds);

    if (result) {
      console.log('🎉 CreateGroupChatScreen: Group created successfully:', result.id);
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to create group chat. Please try again.');
    }
  };

  const handleAddInterest = () => {
    if (interestInput.trim() && !groupInterests.includes(interestInput.trim())) {
      setGroupInterests([...groupInterests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interestToRemove) => {
    setGroupInterests(groupInterests.filter(interest => interest !== interestToRemove));
  };

  const toggleFriendSelection = (friendId) => {
    const newSet = new Set(selectedFriendIds);
    if (newSet.has(friendId)) {
      newSet.delete(friendId);
    } else {
      newSet.add(friendId);
    }
    setSelectedFriendIds(newSet);
  };
  
  const handleGetDetails = () => {
    const memberIds = Array.from(selectedFriendIds);
    if (memberIds.length < 1) {
      Alert.alert('Select Friends', 'Please select at least one friend to get suggestions.');
      return;
    }
    getGroupDetailsRecommendations([user.id, ...memberIds]);
  };
  
  const handleGetMembers = () => {
    if (!groupName.trim() && groupInterests.length === 0) {
      Alert.alert('Provide Context', 'Please enter a group name or some interests to get member suggestions.');
      return;
    }
    const friendIds = friends.map(f => f.id);
    getGroupMemberRecommendations(groupName, groupInterests, friendIds);
  };

  const filteredFriends = useMemo(() => {
    return friends.filter(friend =>
      friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, searchQuery]);

  const recommendedFriendIds = useMemo(() => new Set(groupMemberRecommendations.map(f => f.id)), [groupMemberRecommendations]);
  const selectedFriends = useMemo(() => friends.filter(f => selectedFriendIds.has(f.id)), [friends, selectedFriendIds]);

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity style={styles.friendItem} onPress={() => toggleFriendSelection(item.id)}>
      <Image source={{ uri: item.profile_picture || 'https://via.placeholder.com/40' }} style={styles.friendAvatar} />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.display_name}</Text>
        <Text style={styles.friendUsername}>@{item.username}</Text>
      </View>
      <Ionicons
        name={selectedFriendIds.has(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selectedFriendIds.has(item.id) ? colors.primary : colors.border}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={30} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Group</Text>
          <TouchableOpacity
            style={[styles.createButton, (groupLoading || !groupName.trim() || selectedFriendIds.size === 0) && styles.disabledButton]}
            onPress={handleCreateGroup}
            disabled={groupLoading || !groupName.trim() || selectedFriendIds.size === 0}
          >
            {groupLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Create</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Group Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Group Name</Text>
            <TextInput
              style={styles.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g., Weekend Warriors"
              placeholderTextColor={colors.border}
            />
          </View>
          
          {/* Group Interests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={interestInput}
                onChangeText={setInterestInput}
                placeholder="Add interests (hiking, memes...)"
                placeholderTextColor={colors.border}
                onSubmitEditing={handleAddInterest}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddInterest}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.tagContainer}>
              {groupInterests.map((interest, index) => (
                <TouchableOpacity key={index} style={styles.tag} onPress={() => handleRemoveInterest(interest)}>
                  <Text style={styles.tagText}>{interest}</Text>
                  <Ionicons name="close-circle" size={16} color={colors.card} style={{ marginLeft: 5 }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AI Buttons */}
          <View style={styles.aiButtonContainer}>
            <TouchableOpacity style={styles.aiButton} onPress={handleGetDetails} disabled={aiLoading}>
              {aiLoading ? <ActivityIndicator /> : <><Ionicons name="sparkles" size={18} color={colors.primary} /><Text style={styles.aiButtonText}>Suggest Name & Interests</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiButton} onPress={handleGetMembers} disabled={aiLoading}>
               {aiLoading ? <ActivityIndicator /> : <><Ionicons name="people" size={18} color={colors.primary} /><Text style={styles.aiButtonText}>Suggest Members</Text></>}
            </TouchableOpacity>
          </View>

          {/* Members Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members ({selectedFriendIds.size})</Text>
             {selectedFriends.length > 0 && (
                <View style={styles.selectedFriendsContainer}>
                    <FlatList
                        horizontal
                        data={selectedFriends}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.selectedFriend}>
                                <Image source={{ uri: item.profile_picture || 'https://via.placeholder.com/40' }} style={styles.selectedFriendAvatar} />
                                <Text style={styles.selectedFriendName} numberOfLines={1}>{item.display_name}</Text>
                                <TouchableOpacity onPress={() => toggleFriendSelection(item.id)} style={styles.removeFriendButton}>
                                    <Ionicons name="close-circle" size={20} color={colors.notification} />
                                </TouchableOpacity>
                            </View>
                        )}
                        showsHorizontalScrollIndicator={false}
                    />
                </View>
            )}
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search friends..."
              placeholderTextColor={colors.border}
            />
          </View>

          {groupMemberRecommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ Recommended</Text>
              <FlatList
                data={groupMemberRecommendations}
                renderItem={renderFriendItem}
                keyExtractor={item => item.id}
              />
            </View>
          )}

          <View style={[styles.section, { flex: 1 }]}>
             <Text style={styles.sectionTitle}>All Friends</Text>
             <FlatList
                data={filteredFriends.filter(f => !recommendedFriendIds.has(f.id))}
                renderItem={renderFriendItem}
                keyExtractor={item => item.id}
              />
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.text },
    createButton: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
    createButtonText: { color: '#fff', fontWeight: 'bold' },
    disabledButton: { backgroundColor: colors.border },
    scrollContainer: { padding: 15 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 },
    input: { backgroundColor: colors.card, color: colors.text, padding: 15, borderRadius: 10, fontSize: 16 },
    interestInputContainer: { flexDirection: 'row', alignItems: 'center' },
    addButton: { padding: 10, marginLeft: 10 },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 5, paddingHorizontal: 10, marginRight: 5, marginBottom: 5 },
    tagText: { color: '#fff' },
    aiButtonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    aiButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 10, borderRadius: 20 },
    aiButtonText: { color: colors.primary, marginLeft: 5, fontWeight: 'bold' },
    friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    friendAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
    friendInfo: { flex: 1 },
    friendName: { color: colors.text, fontSize: 16 },
    friendUsername: { color: colors.text, opacity: 0.6 },
    selectedFriendsContainer: { marginBottom: 15 },
    selectedFriend: { alignItems: 'center', marginRight: 15, width: 60 },
    selectedFriendAvatar: { width: 50, height: 50, borderRadius: 25 },
    selectedFriendName: { color: colors.text, fontSize: 12, marginTop: 5, width: '100%', textAlign: 'center' },
    removeFriendButton: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.background, borderRadius: 10 },
});

export default CreateGroupChatScreen; 