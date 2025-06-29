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
  
  // Update recommended friends when AI suggestions are available
  useEffect(() => {
    if (groupMemberRecommendations.length > 0) {
      const newSelectedFriendIds = new Set(groupMemberRecommendations.map(f => f.id));
      setSelectedFriendIds(newSelectedFriendIds);
    }
  }, [groupMemberRecommendations]);

  const handleCreateGroup = async () => {
    // Filter out undefined or null IDs before creating the group
    const validMemberIds = [...selectedFriendIds].filter(id => id);
    if (!groupName.trim()) {
      return Alert.alert('Group Name Required', 'Please enter a name for your group.');
    }
    // We can allow creating a group with just the creator
    // if (validMemberIds.length === 0) {
    //   return Alert.alert('Add Members', 'Please select at least one friend.');
    // }

    try {
      const newGroup = await createGroupChat(groupName.trim(), interestInput, validMemberIds);
      if (newGroup) {
        // Navigate to the newly created chat screen
        navigation.navigate('GroupChat', { 
          group: newGroup
        });
      } else {
        Alert.alert('Error', 'Failed to create group. The group data was not returned.');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      Alert.alert('Error', `Failed to create group: ${err.message}`);
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
  
  const handleGetRecommendations = () => {
    const memberIds = [...selectedFriendIds];
    if (memberIds.length === 0) {
      // If no members are selected, recommend based on the current user
      if (user?.id) {
        getGroupDetailsRecommendations([user.id]);
      } else {
        Alert.alert("Authentication Error", "Could not identify the current user.");
      }
    } else {
      getGroupDetailsRecommendations(memberIds);
    }
  };

  const handleGetMemberRecommendations = () => {
    if (!groupName && groupInterests.length === 0) {
      return Alert.alert(
        'Missing Information',
        'Please enter a group name or some interests to get member recommendations.'
      );
    }
    // Pass the proper parameters to the function
    const friendIds = friends.map(f => f.id);
    getGroupMemberRecommendations(groupName, groupInterests, friendIds);
  };
  
  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;
    return friends.filter(friend =>
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, searchQuery]);

  const recommendedFriends = useMemo(() => {
    if (!groupMemberRecommendations || groupMemberRecommendations.length === 0) return [];
    // groupMemberRecommendations should be an array of friend objects with similarity scores
    return groupMemberRecommendations;
  }, [groupMemberRecommendations]);

  const nonRecommendedFriends = useMemo(() => {
    if (!groupMemberRecommendations || groupMemberRecommendations.length === 0) return filteredFriends;
    const recommendedIds = new Set(groupMemberRecommendations.map(f => f.id));
    return filteredFriends.filter(f => !recommendedIds.has(f.id));
  }, [filteredFriends, groupMemberRecommendations]);

  const renderFriendItem = ({ item: friend }) => {
    const isSelected = selectedFriendIds.has(friend.id);
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.selectedFriend]}
        onPress={() => toggleFriendSelection(friend.id)}
      >
        <Image
          source={{ uri: friend.profile_picture || 'https://via.placeholder.com/40' }}
          style={styles.friendAvatar}
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.display_name}</Text>
          <Text style={styles.friendUsername}>@{friend.username}</Text>
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? colors.primary : colors.text}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View style={{flex: 1}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>New Group Chat</Text>
            <TouchableOpacity onPress={handleCreateGroup} disabled={groupLoading}>
              {groupLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.createButton}>Create</Text>}
            </TouchableOpacity>
          </View>
          
          <FlatList
            ListHeaderComponent={
              <>
                <View style={styles.inputSection}>
                  <TextInput
                    style={styles.input}
                    placeholder="Group Name"
                    placeholderTextColor={colors.placeholder}
                    value={groupName}
                    onChangeText={setGroupName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Add interests (e.g., hiking, gaming)"
                    placeholderTextColor={colors.placeholder}
                    value={interestInput}
                    onChangeText={setInterestInput}
                    onSubmitEditing={() => {
                      if (interestInput) {
                        setGroupInterests([...groupInterests, interestInput]);
                        setInterestInput('');
                      }
                    }}
                  />
                  <View style={styles.interestsContainer}>
                    {groupInterests.map((interest, index) => (
                      <View key={index} style={styles.interestTag}>
                        <Text style={styles.interestText}>{interest}</Text>
                        <TouchableOpacity onPress={() => setGroupInterests(groupInterests.filter(i => i !== interest))}>
                          <Ionicons name="close-circle" size={16} color={colors.background} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.aiButtons}>
                  <TouchableOpacity style={styles.aiButton} onPress={handleGetRecommendations} disabled={aiLoading}>
                    {aiLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.aiButtonText}>Suggest Details</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.aiButton} onPress={handleGetMemberRecommendations} disabled={aiLoading}>
                    {aiLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.aiButtonText}>Suggest Members</Text>}
                  </TouchableOpacity>
                </View>

                {aiError && <Text style={styles.errorText}>AI Error: {aiError}</Text>}
                
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={colors.placeholder} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search Friends"
                    placeholderTextColor={colors.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {recommendedFriends.length > 0 && (
                  <>
                    <Text style={styles.listHeader}>Recommended</Text>
                    {recommendedFriends.map((friend, index) => (
                      <View key={`recommended-${friend.id}-${index}`}>
                        {renderFriendItem({ item: friend })}
                      </View>
                    ))}
                    <Text style={styles.listHeader}>All Friends</Text>
                  </>
                )}
              </>
            }
            data={nonRecommendedFriends}
            renderItem={renderFriendItem}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>
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
    title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.text },
    inputSection: { marginBottom: 20 },
    interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    interestTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 5, paddingHorizontal: 10, marginRight: 5, marginBottom: 5 },
    interestText: { color: '#fff' },
    aiButtons: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    errorText: { color: colors.notification, marginTop: 10, textAlign: 'center' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 10, borderRadius: 10 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1 },
    listHeader: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 10, marginBottom: 5 },
});

export default CreateGroupChatScreen; 