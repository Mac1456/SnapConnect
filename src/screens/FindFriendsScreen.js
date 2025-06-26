import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useThemeStore } from '../stores/themeStore';

const FindFriendsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const { 
    searchUsers, 
    sendFriendRequest, 
    friends,
    getFriends 
  } = useFriendStore(
    (state) => ({
      searchUsers: state.searchUsers,
      sendFriendRequest: state.sendFriendRequest,
      friends: state.friends,
      getFriends: state.getFriends,
    })
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState([]); // Track sent requests locally

  useEffect(() => {
    // Load initial friends list to filter search results
    getFriends();
  }, []);

  useEffect(() => {
    // Debounced search
    const handler = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleSearch = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      // Filter out existing friends
      const filteredResults = results.filter(
        (result) => !friends.some((friend) => friend.id === result.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      Alert.alert('Error', 'Failed to search for users.');
      console.error('FindFriendsScreen search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetUser) => {
    try {
      await sendFriendRequest(targetUser.id);
      Alert.alert('Success', `Friend request sent to ${targetUser.display_name || targetUser.username}!`);
      setSentRequests(prev => [...prev, targetUser.id]); // Mark as sent
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not send friend request.');
      console.error('FindFriendsScreen send request error:', error);
    }
  };

  const renderSearchResultItem = ({ item }) => {
    const isRequestSent = sentRequests.includes(item.id);

    return (
      <View style={{ backgroundColor: currentTheme.colors.surface }} className="mx-4 mb-3 p-4 rounded-2xl flex-row items-center">
        <Image
          source={{ uri: item.profile_picture || `https://ui-avatars.com/api/?name=${item.username}&background=random` }}
          className="w-12 h-12 rounded-full mr-4"
        />
        <View className="flex-1">
          <Text style={{ color: currentTheme.colors.text }} className="font-bold text-base">
            {item.display_name || item.username}
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">
            @{item.username}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleSendFriendRequest(item)}
          disabled={isRequestSent}
          style={{
            backgroundColor: isRequestSent ? currentTheme.colors.surface : currentTheme.colors.primary,
            borderColor: isRequestSent ? currentTheme.colors.border : 'transparent',
            borderWidth: isRequestSent ? 1 : 0,
          }}
          className="px-4 py-2 rounded-full"
        >
          <Text 
            style={{ color: isRequestSent ? currentTheme.colors.textSecondary : 'white' }} 
            className="font-bold text-sm"
          >
            {isRequestSent ? 'Sent' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={currentTheme.colors.backgroundGradient}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold">Find Friends</Text>
          <View className="w-6" />
        </View>

        {/* Search Bar */}
        <View className="px-4 mb-4">
          <View 
            style={{ backgroundColor: currentTheme.colors.surface }}
            className="flex-row items-center rounded-full px-4 py-3"
          >
            <Ionicons name="search" size={20} color={currentTheme.colors.textSecondary} className="mr-3" />
            <TextInput
              placeholder="Search by username or display name"
              placeholderTextColor={currentTheme.colors.textSecondary}
              style={{ color: currentTheme.colors.text, flex: 1 }}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        
        {/* Results */}
        {loading && searchResults.length === 0 ? (
          <ActivityIndicator size="large" color={currentTheme.colors.primary} className="mt-8" />
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSearchResultItem}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="items-center justify-center flex-1 p-8">
            <Ionicons name="people-outline" size={80} color={currentTheme.colors.textSecondary} />
            <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mt-4">Find Your Friends</Text>
            <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center mt-2">
              Search for friends by their username or display name to connect with them.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default FindFriendsScreen; 