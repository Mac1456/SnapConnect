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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';

import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useGroupChatStore } from '../stores/groupChatStore';
import { useAIStore } from '../stores/aiStore';
import { useThemeStore } from '../stores/themeStore';

const createStyles = (colors, isDarkMode) => StyleSheet.create({
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
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: colors.snapYellow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: colors.snapYellow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: colors.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: isDarkMode ? colors.snapYellow : colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: isDarkMode ? colors.surfaceElevated : colors.background,
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
    backgroundColor: colors.snapYellow,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: colors.snapYellow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  interestText: {
    color: '#000000',
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
    backgroundColor: colors.snapYellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    shadowColor: colors.snapYellow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  aiButtonRefresh: {
    backgroundColor: colors.snapYellow,
    borderWidth: 2,
    borderColor: isDarkMode ? colors.snapYellow : colors.snapYellow + '80',
    transform: [{ scale: 0.98 }],
  },
  aiButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
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
    borderColor: colors.snapYellow,
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
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? colors.surfaceElevated : colors.background,
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
    backgroundColor: isDarkMode ? colors.snapYellow + '20' : colors.snapYellow + '15',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.snapYellow + '40' : colors.snapYellow + '30',
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
    color: colors.textSecondary,
    marginTop: 2,
  },
  recommendedLabel: {
    fontSize: 12,
    color: isDarkMode ? colors.snapYellow : colors.snapYellow,
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
    color: colors.textSecondary,
    fontSize: 16,
    marginVertical: 20,
    fontStyle: 'italic',
  },
});

const CreateGroupChatScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode, currentTheme } = useThemeStore();
  const styles = useMemo(() => {
    if (!currentTheme?.colors) return {};
    return createStyles(currentTheme.colors, isDarkMode);
  }, [currentTheme, isDarkMode]);

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
    lastRecommendationSource,
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
      console.log('🤖 CreateGroupChatScreen: === PROCESSING AI RECOMMENDATIONS ===');
      console.log('🤖 CreateGroupChatScreen: AI recommended members:', groupMemberRecommendations.map(f => ({ id: f.id, name: f.display_name, similarity: f.similarity })));
      console.log('🤖 CreateGroupChatScreen: Current selected friend IDs:', Array.from(selectedFriendIds));
      
      // Only auto-select if we don't have any friends selected yet, or if this is a force refresh
      const shouldAutoSelect = selectedFriendIds.size === 0 || hasGeneratedMemberSuggestions;
      
      if (shouldAutoSelect) {
        const recommendedIds = groupMemberRecommendations.map(f => f.id).filter(id => id); // Filter out any undefined IDs
        const newSelectedFriendIds = new Set([...selectedFriendIds, ...recommendedIds]);
        
        console.log('🤖 CreateGroupChatScreen: Auto-selecting recommended friends:', recommendedIds);
        console.log('🤖 CreateGroupChatScreen: New selected friend IDs:', Array.from(newSelectedFriendIds));
        
        setSelectedFriendIds(newSelectedFriendIds);
      } else {
        console.log('🤖 CreateGroupChatScreen: Not auto-selecting - friends already selected');
      }
      
      console.log('🤖 CreateGroupChatScreen: === AI RECOMMENDATIONS PROCESSED ===');
    }
  }, [groupMemberRecommendations, hasGeneratedMemberSuggestions]);

  // Reset form when screen loses focus (user navigates away)
  useFocusEffect(
    React.useCallback(() => {
      // This runs when the screen comes into focus
      console.log('🏗️ CreateGroupChatScreen: Screen focused');
      
      return () => {
        // This runs when the screen loses focus (cleanup)
        console.log('🏗️ CreateGroupChatScreen: Screen losing focus - clearing form data');
        setGroupName('');
        setGroupDescription('');
        setInterestInput('');
        setGroupInterests([]);
        setSelectedFriendIds(new Set());
        setSearchQuery('');
        setHasGeneratedDetailsSuggestions(false);
        setHasGeneratedMemberSuggestions(false);
        
        // Clear AI recommendations
        clearGroupRecommendations();
      };
    }, [clearGroupRecommendations])
  );

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
        
        // Navigate back to the main tabs
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
        
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
      friendsCount: friends?.length || 0
    });

    if (!groupName && groupInterests.length === 0) {
      return Alert.alert(
        'Missing Information',
        'Please enter a group name or some interests to get member recommendations.'
      );
    }
    
    if (!friends || friends.length === 0) {
      return Alert.alert(
        'No Friends Available',
        'You need to add some friends first to get member recommendations.'
      );
    }
    
    const friendIds = friends.map(f => f.id);
    getGroupMemberRecommendations(groupName, groupInterests, friendIds);
  };

  const handleGetMemberRecommendationsWithFeedback = async () => {
    const forceRefresh = hasGeneratedMemberSuggestions; // Force refresh if we've already generated suggestions
    
    console.log('🤖 CreateGroupChatScreen: === MEMBER RECOMMENDATIONS REQUEST START ===');
    console.log('🤖 CreateGroupChatScreen: Request parameters:', {
      groupName: groupName || 'undefined',
      groupInterests: groupInterests || [],
      friendsCount: friends?.length || 0,
      friendIds: friends?.map(f => f.id) || [],
      selectedFriendIds: Array.from(selectedFriendIds),
      forceRefresh,
      hasGeneratedMemberSuggestions
    });

    if (!groupName && groupInterests.length === 0) {
      console.log('🤖 CreateGroupChatScreen: ❌ Missing required information');
      return Alert.alert(
        'Missing Information',
        'Please enter a group name or some interests to get member recommendations.'
      );
    }
    
    if (!friends || friends.length === 0) {
      console.log('🤖 CreateGroupChatScreen: ❌ No friends available');
      return Alert.alert(
        'No Friends Available',
        'You need to add some friends first to get member recommendations.'
      );
    }
    
    try {
      if (!friends || friends.length === 0) {
        throw new Error('No friends available');
      }
      
      const friendIds = friends.map(f => f.id);
      
      // Include current user in the friend list for AI analysis (they will be part of the group)
      const { user } = useAuthStore.getState();
      const currentUserId = user?.id || user?.uid;
      if (currentUserId && !friendIds.includes(currentUserId)) {
        friendIds.push(currentUserId);
        console.log('🤖 CreateGroupChatScreen: 👤 Added current user to analysis:', currentUserId);
      }
      
      console.log('🤖 CreateGroupChatScreen: 📡 Calling getGroupMemberRecommendations...');
      
      const result = await getGroupMemberRecommendations(groupName, groupInterests, friendIds, forceRefresh);
      
      console.log('🤖 CreateGroupChatScreen: 📥 Recommendations result:', {
        resultCount: result?.length || 0,
        resultNames: result?.map(f => f.display_name || f.username) || [],
        aiError: aiError || 'none'
      });
      
      setHasGeneratedMemberSuggestions(true);
      
      // Auto-select recommended friends if this is the first time generating suggestions
      if (result && result.length > 0 && !forceRefresh) {
        const newSelectedIds = new Set(selectedFriendIds);
        let autoSelectedCount = 0;
        
        result.forEach(recommendedFriend => {
          // Only auto-select if not already selected and we haven't selected too many
          if (!newSelectedIds.has(recommendedFriend.id) && autoSelectedCount < 2) {
            newSelectedIds.add(recommendedFriend.id);
            autoSelectedCount++;
            console.log('🤖 CreateGroupChatScreen: 🎯 Auto-selected recommended friend:', recommendedFriend.display_name || recommendedFriend.username);
          }
        });
        
        if (autoSelectedCount > 0) {
          setSelectedFriendIds(newSelectedIds);
          console.log('🤖 CreateGroupChatScreen: ✅ Auto-selected', autoSelectedCount, 'recommended friends');
        }
      }
      
      // Show feedback based on result
      if (result && result.length > 0) {
        if (lastRecommendationSource === 'fallback') {
          console.log('🤖 CreateGroupChatScreen: ⚠️ Using fallback recommendations');
          Alert.alert(
            forceRefresh ? 'New Recommendations Ready' : 'Recommendations Ready',
            'AI recommendations are temporarily unavailable, but we found some friends who might be interested based on their activity!',
            [{ text: 'OK' }]
          );
        } else {
          console.log('🤖 CreateGroupChatScreen: ✅ AI recommendations successful');
          Alert.alert(
            forceRefresh ? 'New AI Recommendations Ready' : 'AI Recommendations Ready',
            `Found ${result.length} friend${result.length === 1 ? '' : 's'} who might be interested in this group based on AI analysis of their messages and activity!`,
            [{ text: 'OK' }]
          );
        }
      } else {
        console.log('🤖 CreateGroupChatScreen: ❌ No recommendations found');
        Alert.alert(
          'No Recommendations',
          'We couldn\'t find any specific recommendations for this group. Try adding different interests or changing the group name. All your friends are still available to add manually!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('🤖 CreateGroupChatScreen: ❌ Error getting recommendations:', error);
      Alert.alert(
        'Error',
        'Failed to get member recommendations. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      console.log('🤖 CreateGroupChatScreen: === MEMBER RECOMMENDATIONS REQUEST END ===');
    }
  };
  
  const filteredFriends = useMemo(() => {
    if (!friends || !searchQuery) return friends || [];
    const filtered = friends.filter(friend =>
      friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('🔍 CreateGroupChatScreen: Filtered friends:', filtered.length, 'of', friends.length);
    return filtered;
  }, [friends, searchQuery]);

  const recommendedFriends = useMemo(() => {
    if (!groupMemberRecommendations || groupMemberRecommendations.length === 0) return [];
    return groupMemberRecommendations;
  }, [groupMemberRecommendations]);

  const selectedFriends = useMemo(() => {
    if (!friends) return [];
    const selected = friends.filter(f => selectedFriendIds.has(f.id));
    console.log('👥 CreateGroupChatScreen: Selected friends:', selected.map(f => f.display_name));
    return selected;
  }, [friends, selectedFriendIds]);

  const availableFriends = useMemo(() => {
    if (!filteredFriends) return [];
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
        <Ionicons name="close-circle" size={20} color={currentTheme.colors.error} />
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
            <Text style={styles.recommendedLabel}>
              {lastRecommendationSource === 'ai' ? 'AI Recommended' : 'Recommended'}
            </Text>
          )}
        </View>
        <Ionicons
          name="add-circle"
          size={24}
          color={currentTheme.colors.snapYellow}
        />
      </TouchableOpacity>
    );
  };

  const renderInterestTag = (interest, index) => (
    <View key={index} style={styles.interestTag}>
      <Text style={styles.interestText}>{interest}</Text>
      <TouchableOpacity onPress={() => handleRemoveInterest(interest)}>
        <Ionicons name="close-circle" size={16} color="#000000" />
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
          <Ionicons name="close" size={28} color={currentTheme.colors.text} />
        </TouchableOpacity>
          <Text style={styles.title}>New Group Chat</Text>
          <TouchableOpacity 
            style={[styles.createButton, groupLoading && styles.disabledButton]} 
            onPress={handleCreateGroup} 
            disabled={groupLoading || !groupName.trim()}
          >
            {groupLoading ? (
              <ActivityIndicator size="small" color="#000000" />
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
              placeholderTextColor={currentTheme.colors.textSecondary}
              value={groupName}
              onChangeText={setGroupName}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Group Description (Optional)"
              placeholderTextColor={currentTheme.colors.textSecondary}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.interestInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                placeholder="Add interests (e.g., hiking, gaming)"
                placeholderTextColor={currentTheme.colors.textSecondary}
                value={interestInput}
                onChangeText={setInterestInput}
                onSubmitEditing={handleAddInterest}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddInterest}>
                <Ionicons name="add-circle" size={28} color={currentTheme.colors.snapYellow} />
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
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Ionicons 
                      name={hasGeneratedDetailsSuggestions ? "refresh" : "bulb"} 
                      size={16} 
                      color="#000000" 
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
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Ionicons 
                      name={hasGeneratedMemberSuggestions ? "refresh" : "people"} 
                      size={16} 
                      color="#000000" 
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
              <Ionicons name="search" size={20} color={currentTheme.colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Friends"
                placeholderTextColor={currentTheme.colors.textSecondary}
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