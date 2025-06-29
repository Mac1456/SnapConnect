import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';

import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useGroupChatStore } from '../stores/groupChatStore';
import { useAIStore } from '../stores/aiStore';

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: colors.text + '30',
    shadowOpacity: 0,
    elevation: 0,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.background,
    color: colors.text,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  interestInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    padding: 4,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  interestText: {
    color: 'white',
    fontSize: 14,
    marginRight: 6,
    fontWeight: '500',
  },
  aiButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  aiButtonRefresh: {
    backgroundColor: colors.primary + 'DD', // Slightly transparent for refresh state
    borderWidth: 1,
    borderColor: colors.primary,
  },
  aiButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: {
    color: colors.notification,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectedFriendsContainer: {
    flexDirection: 'row',
  },
  selectedFriendItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
    position: 'relative',
  },
  selectedFriendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selectedFriendName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    width: '100%',
    fontWeight: '500',
  },
  removeFriendButton: {
    position: 'absolute',
    top: -2,
    right: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  recommendedFriendItem: {
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  friendUsername: {
    fontSize: 14,
    color: colors.text + '70',
    marginTop: 2,
  },
  recommendedLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text + '60',
    fontSize: 16,
    paddingVertical: 32,
    fontStyle: 'italic',
  },
});

const CreateGroupChatScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors || {});

  console.log('🏗️ CreateGroupChatScreen: Component initialized');

  // Zustand Stores
  const { user } = useAuthStore();
  const { friends, getFriends } = useFriendStore();
  const { createGroupChat, loading: groupLoading } = useGroupChatStore();
  const {
    getGroupDetailsRecommendations,
    getGroupMemberRecommendations,
    clearGroupRecommendations,
    refreshGroupRecommendations,
    groupDetailsSuggestions,
    groupMemberRecommendations,
    loading: aiLoading,
    error: aiError,
  } = useAIStore();

  // Component State
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [groupInterests, setGroupInterests] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hasGeneratedDetailsSuggestions, setHasGeneratedDetailsSuggestions] = useState(false);
  const [hasGeneratedMemberSuggestions, setHasGeneratedMemberSuggestions] = useState(false);

  // Fetch friends on mount
  useEffect(() => {
    console.log('🏗️ CreateGroupChatScreen: Fetching friends on mount');
    getFriends();
  }, [getFriends]);

  // Update form when AI suggestions are available
  useEffect(() => {
    if (groupDetailsSuggestions?.groupName) {
      console.log('🤖 CreateGroupChatScreen: AI suggested group name:', groupDetailsSuggestions.groupName);
      setGroupName(groupDetailsSuggestions.groupName);
    }
    if (groupDetailsSuggestions?.groupInterests?.length) {
      console.log('🤖 CreateGroupChatScreen: AI suggested interests:', groupDetailsSuggestions.groupInterests);
      setGroupInterests(groupDetailsSuggestions.groupInterests);
    }
  }, [groupDetailsSuggestions]);
  
  // Update recommended friends when AI suggestions are available
  useEffect(() => {
    if (groupMemberRecommendations && groupMemberRecommendations.length > 0) {
      console.log('🤖 CreateGroupChatScreen: AI recommended members:', groupMemberRecommendations.map(f => f.display_name));
      const newSelectedFriendIds = new Set([...selectedFriendIds, ...groupMemberRecommendations.map(f => f.id)]);
      setSelectedFriendIds(newSelectedFriendIds);
    }
  }, [groupMemberRecommendations]);

  const handleCreateGroup = async () => {
    const validMemberIds = [...selectedFriendIds].filter(id => id);
    console.log('🏗️ CreateGroupChatScreen: Creating group with:', {
      name: groupName.trim(),
      description: groupDescription.trim(),
      interests: groupInterests,
      memberIds: validMemberIds,
      memberCount: validMemberIds.length
    });

    if (!groupName.trim()) {
      console.warn('🏗️ CreateGroupChatScreen: Group name is required');
      return Alert.alert('Group Name Required', 'Please enter a name for your group.');
    }

    try {
      const description = groupInterests.length > 0 ? `Interests: ${groupInterests.join(', ')}. ${groupDescription}`.trim() : groupDescription;
      const newGroup = await createGroupChat(groupName.trim(), description, validMemberIds);
      
      if (newGroup) {
        console.log('✅ CreateGroupChatScreen: Group created successfully:', newGroup.id);
        
        // Clear form data
        setGroupName('');
        setGroupInterests([]);
        setSelectedFriendIds(new Set());
        setSearchQuery('');
        setInterestInput('');
        setHasGeneratedDetailsSuggestions(false);
        setHasGeneratedMemberSuggestions(false);
        
        // Clear AI recommendations
        clearGroupRecommendations();
        
        // Navigate to Chats screen first, then to the new group chat
        navigation.navigate('Chats');
        
        // Small delay to ensure navigation completes, then navigate to the group chat
        setTimeout(() => {
          navigation.navigate('GroupChat', { group: newGroup });
        }, 100);
      } else {
        console.error('❌ CreateGroupChatScreen: Group creation failed - no data returned');
        Alert.alert('Error', 'Failed to create group. Please try again.');
      }
    } catch (err) {
      console.error('❌ CreateGroupChatScreen: Group creation error:', err);
      Alert.alert('Error', `Failed to create group: ${err.message}`);
    }
  };

  const handleAddInterest = () => {
    if (interestInput.trim() && !groupInterests.includes(interestInput.trim())) {
      console.log('🏷️ CreateGroupChatScreen: Adding interest:', interestInput.trim());
      setGroupInterests([...groupInterests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interestToRemove) => {
    console.log('🏷️ CreateGroupChatScreen: Removing interest:', interestToRemove);
    setGroupInterests(groupInterests.filter(interest => interest !== interestToRemove));
  };

  const toggleFriendSelection = (friendId) => {
    const newSet = new Set(selectedFriendIds);
    if (newSet.has(friendId)) {
      console.log('👥 CreateGroupChatScreen: Deselecting friend:', friendId);
      newSet.delete(friendId);
    } else {
      console.log('👥 CreateGroupChatScreen: Selecting friend:', friendId);
      newSet.add(friendId);
    }
    setSelectedFriendIds(newSet);
  };
  
  const handleGetRecommendations = () => {
    const memberIds = [...selectedFriendIds];
    const forceRefresh = hasGeneratedDetailsSuggestions; // Force refresh if we've already generated suggestions
    
    console.log('🤖 CreateGroupChatScreen: Getting AI recommendations for members:', memberIds, 'forceRefresh:', forceRefresh);
    
    if (memberIds.length === 0) {
      if (user?.id) {
        getGroupDetailsRecommendations([user.id], forceRefresh);
      } else {
        console.error('❌ CreateGroupChatScreen: User not authenticated for recommendations');
        Alert.alert("Authentication Error", "Could not identify the current user.");
      }
    } else {
      getGroupDetailsRecommendations(memberIds, forceRefresh);
    }
    
    setHasGeneratedDetailsSuggestions(true);
  };

  const handleGetMemberRecommendations = () => {
    console.log('🤖 CreateGroupChatScreen: Getting member recommendations with:', {
      groupName,
      groupInterests,
      friendsCount: friends.length
    });

    if (!groupName && groupInterests.length === 0) {
      return Alert.alert(
        'Missing Information',
        'Please enter a group name or some interests to get member recommendations.'
      );
    }
    
    const friendIds = friends.map(f => f.id);
    getGroupMemberRecommendations(groupName, groupInterests, friendIds);
  };

  const handleGetMemberRecommendationsWithFeedback = async () => {
    const forceRefresh = hasGeneratedMemberSuggestions; // Force refresh if we've already generated suggestions
    
    console.log('🤖 CreateGroupChatScreen: Getting member recommendations with:', {
      groupName,
      groupInterests,
      friendsCount: friends.length,
      forceRefresh
    });

    if (!groupName && groupInterests.length === 0) {
      return Alert.alert(
        'Missing Information',
        'Please enter a group name or some interests to get member recommendations.'
      );
    }
    
    const friendIds = friends.map(f => f.id);
    const result = await getGroupMemberRecommendations(groupName, groupInterests, friendIds, forceRefresh);
    
    setHasGeneratedMemberSuggestions(true);
    
    // Show feedback if using fallback recommendations
    if (aiError && result && result.length > 0) {
      Alert.alert(
        'Recommendations Ready',
        'AI recommendations are temporarily unavailable, but we found some friends who might be interested!',
        [{ text: 'OK' }]
      );
    }
  };
  
  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;
    const filtered = friends.filter(friend =>
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('🔍 CreateGroupChatScreen: Filtered friends:', filtered.length, 'of', friends.length);
    return filtered;
  }, [friends, searchQuery]);

  const recommendedFriends = useMemo(() => {
    if (!groupMemberRecommendations || groupMemberRecommendations.length === 0) return [];
    return groupMemberRecommendations;
  }, [groupMemberRecommendations]);

  const selectedFriends = useMemo(() => {
    const selected = friends.filter(f => selectedFriendIds.has(f.id));
    console.log('👥 CreateGroupChatScreen: Selected friends:', selected.map(f => f.display_name));
    return selected;
  }, [friends, selectedFriendIds]);

  const availableFriends = useMemo(() => {
    const available = filteredFriends.filter(f => !selectedFriendIds.has(f.id));
    console.log('👥 CreateGroupChatScreen: Available friends:', available.length);
    return available;
  }, [filteredFriends, selectedFriendIds]);

  const renderSelectedFriend = (friend) => (
    <View key={friend.id} style={styles.selectedFriendItem}>
      <Image
        source={{ uri: friend.profile_picture || 'https://via.placeholder.com/40' }}
        style={styles.selectedFriendAvatar}
      />
      <Text style={styles.selectedFriendName} numberOfLines={1}>
        {friend.display_name}
      </Text>
      <TouchableOpacity
        style={styles.removeFriendButton}
        onPress={() => toggleFriendSelection(friend.id)}
      >
        <Ionicons name="close-circle" size={20} color={colors.notification} />
      </TouchableOpacity>
    </View>
  );

  const renderFriendItem = ({ item: friend }) => {
    const isRecommended = recommendedFriends.some(rf => rf.id === friend.id);
    return (
      <TouchableOpacity
        style={[styles.friendItem, isRecommended && styles.recommendedFriendItem]}
        onPress={() => toggleFriendSelection(friend.id)}
      >
        <Image
          source={{ uri: friend.profile_picture || 'https://via.placeholder.com/40' }}
          style={styles.friendAvatar}
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.display_name}</Text>
          <Text style={styles.friendUsername}>@{friend.username}</Text>
          {isRecommended && (
            <Text style={styles.recommendedLabel}>AI Recommended</Text>
          )}
        </View>
        <Ionicons
          name="add-circle"
          size={24}
          color={colors.primary}
        />
      </TouchableOpacity>
    );
  };

  const renderInterestTag = (interest, index) => (
    <View key={index} style={styles.interestTag}>
      <Text style={styles.interestText}>{interest}</Text>
      <TouchableOpacity onPress={() => handleRemoveInterest(interest)}>
        <Ionicons name="close-circle" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>New Group Chat</Text>
          <TouchableOpacity 
            style={[styles.createButton, groupLoading && styles.disabledButton]} 
            onPress={handleCreateGroup} 
            disabled={groupLoading || !groupName.trim()}
          >
            {groupLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.createButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Group Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Group Details</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Group Name (Required)"
              placeholderTextColor={colors.text + '80'}
              value={groupName}
              onChangeText={setGroupName}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Group Description (Optional)"
              placeholderTextColor={colors.text + '80'}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.interestInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                placeholder="Add interests (e.g., hiking, gaming)"
                placeholderTextColor={colors.text + '80'}
                value={interestInput}
                onChangeText={setInterestInput}
                onSubmitEditing={handleAddInterest}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddInterest}>
                <Ionicons name="add-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {groupInterests.length > 0 && (
              <View style={styles.interestsContainer}>
                {groupInterests.map(renderInterestTag)}
              </View>
            )}
          </View>

          {/* AI Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Suggestions</Text>
            <View style={styles.aiButtons}>
              <TouchableOpacity 
                style={[
                  styles.aiButton, 
                  hasGeneratedDetailsSuggestions && styles.aiButtonRefresh,
                  aiLoading && styles.disabledButton
                ]} 
                onPress={handleGetRecommendations} 
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons 
                      name={hasGeneratedDetailsSuggestions ? "refresh" : "bulb"} 
                      size={16} 
                      color="white" 
                    />
                    <Text style={styles.aiButtonText}>
                      {hasGeneratedDetailsSuggestions ? "New Details" : "Suggest Details"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.aiButton, 
                  hasGeneratedMemberSuggestions && styles.aiButtonRefresh,
                  aiLoading && styles.disabledButton
                ]} 
                onPress={handleGetMemberRecommendationsWithFeedback} 
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons 
                      name={hasGeneratedMemberSuggestions ? "refresh" : "people"} 
                      size={16} 
                      color="white" 
                    />
                    <Text style={styles.aiButtonText}>
                      {hasGeneratedMemberSuggestions ? "New Members" : "Suggest Members"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {aiError && (
              <Text style={styles.errorText}>AI suggestions temporarily unavailable - using fallback recommendations</Text>
            )}
          </View>

          {/* Selected Friends */}
          {selectedFriends.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Selected Members ({selectedFriends.length})
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.selectedFriendsContainer}
              >
                {selectedFriends.map(renderSelectedFriend)}
              </ScrollView>
            </View>
          )}

          {/* Friends List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Friends</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.text + '80'} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Friends"
                placeholderTextColor={colors.text + '80'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {availableFriends.length > 0 ? (
              <FlatList
                data={availableFriends}
                renderItem={renderFriendItem}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : (
              <Text style={styles.emptyText}>
                {friends.length === 0 
                  ? "No friends found. Add some friends first!" 
                  : "All friends are already selected!"}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateGroupChatScreen; 