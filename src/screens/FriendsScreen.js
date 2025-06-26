import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useThemeStore } from '../stores/themeStore';

export default function FriendsScreen({ navigation }) {
  const { user } = useAuthStore();
  const { 
    friends, 
    friendRequests, 
    loading, 
    error,
    getFriends,
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    listenToFriendRequests,
    removeFriend,
  } = useFriendStore();
  const { currentTheme } = useThemeStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'friends'

  useEffect(() => {
    // Initial data load when the component mounts
    loadData();

    // Set up real-time listener for friend requests
    const unsubscribe = listenToFriendRequests();

    // Clean up the listener when the component unmounts
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  const loadData = async () => {
    // The store now handles the user ID automatically
    await Promise.all([
      getFriends(),
      getFriendRequests()
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName || friend.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friend.id);
              Alert.alert('Success', `${friend.displayName || friend.username} has been removed.`);
              // The store will auto-refresh, but this can feel more responsive
              loadData(); 
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend.');
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = async (request) => {
    try {
      // The new function expects the entire request object
      await acceptFriendRequest(request);
      Alert.alert('Success', 'Friend request accepted!');
      // Data will refresh automatically via the listener, but a manual refresh can be faster
      await loadData(); 
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    Alert.alert(
      'Reject Friend Request',
      'Are you sure you want to reject this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              // The new function expects just the request ID
              await rejectFriendRequest(requestId);
              Alert.alert('Success', 'Friend request rejected');
              // Data will refresh automatically via the listener
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject friend request');
            }
          }
        }
      ]
    );
  };

  const renderFriendRequest = (request) => (
    <View
      key={request.id}
      style={{ backgroundColor: currentTheme.colors.surface }}
      className="mx-4 mb-4 p-4 rounded-2xl backdrop-blur-lg"
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-gray-300 rounded-full items-center justify-center mr-3">
          {request.requester?.profile_picture ? (
            <Image 
              source={{ uri: request.requester.profile_picture }} 
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <Ionicons name="person" size={24} color={currentTheme.colors.textSecondary} />
          )}
        </View>
        
        <View className="flex-1">
          <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">
            {request.requester?.display_name || request.requester?.username}
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">
            @{request.requester?.username}
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary }} className="text-xs mt-1">
            {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <View className="flex-row mt-4 space-x-3">
        <TouchableOpacity
          onPress={() => handleAcceptRequest(request)}
          style={{ backgroundColor: currentTheme.colors.primary }}
          className="flex-1 py-3 rounded-xl items-center"
          disabled={loading}
        >
          <Text className="text-white font-bold">Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleRejectRequest(request.id)}
          style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.textSecondary }}
          className="flex-1 py-3 rounded-xl items-center border"
          disabled={loading}
        >
          <Text style={{ color: currentTheme.colors.text }} className="font-bold">Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = (friend) => (
    <View
      key={friend.id}
      style={{ backgroundColor: currentTheme.colors.surface }}
      className="mx-4 mb-4 p-4 rounded-2xl backdrop-blur-lg"
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-gray-300 rounded-full items-center justify-center mr-3">
          {friend.profilePicture ? (
            <Image 
              source={{ uri: friend.profilePicture }} 
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <Ionicons name="person" size={24} color={currentTheme.colors.textSecondary} />
          )}
        </View>
        
        <View className="flex-1">
          <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">
            {friend.displayName || friend.username}
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">
            @{friend.username}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={() => navigation.navigate('Chat', { 
            recipientId: friend.id, 
            recipientName: friend.displayName || friend.username 
          })}
          style={{ backgroundColor: currentTheme.colors.primary }}
          className="px-3 py-2 rounded-xl"
        >
          <Ionicons name="chatbubble" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRemoveFriend(friend)}
          style={{ backgroundColor: currentTheme.colors.error, marginLeft: 10 }}
          className="px-3 py-2 rounded-xl"
        >
          <Ionicons name="trash" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={currentTheme.colors.backgroundGradient || (currentTheme.mode === 'dark' ? ['#000000', '#1A1A1A'] : ['#FFFFFF', '#F8F9FA'])}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold">👥 Friends</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
            <Ionicons name="person-add" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row mx-4 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab('requests')}
            style={{ 
              backgroundColor: activeTab === 'requests' ? currentTheme.colors.primary : currentTheme.colors.surface 
            }}
            className="flex-1 py-3 rounded-l-xl items-center"
          >
            <Text 
              style={{ color: activeTab === 'requests' ? 'white' : currentTheme.colors.text }} 
              className="font-bold"
            >
              Requests ({friendRequests.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setActiveTab('friends')}
            style={{ 
              backgroundColor: activeTab === 'friends' ? currentTheme.colors.primary : currentTheme.colors.surface 
            }}
            className="flex-1 py-3 rounded-r-xl items-center"
          >
            <Text 
              style={{ color: activeTab === 'friends' ? 'white' : currentTheme.colors.text }} 
              className="font-bold"
            >
              Friends ({friends.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'requests' ? (
            <>
              {friendRequests.length > 0 ? (
                friendRequests.map(renderFriendRequest)
              ) : (
                <View className="items-center py-16">
                  <View 
                    style={{ backgroundColor: currentTheme.colors.surface }}
                    className="backdrop-blur-lg rounded-3xl p-8 mx-4 items-center"
                  >
                    <Ionicons name="mail-outline" size={80} color={currentTheme.colors.textSecondary} />
                    <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold mt-4">No Friend Requests</Text>
                    <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center mt-2 px-4">
                      When people send you friend requests, they'll appear here
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              {friends.length > 0 ? (
                friends.map(renderFriend)
              ) : (
                <View className="items-center py-16">
                  <View 
                    style={{ backgroundColor: currentTheme.colors.surface }}
                    className="backdrop-blur-lg rounded-3xl p-8 mx-4 items-center"
                  >
                    <Ionicons name="people-outline" size={80} color={currentTheme.colors.textSecondary} />
                    <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold mt-4">No Friends Yet</Text>
                    <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center mt-2 px-4">
                      Start connecting with people by searching for them in the Discover tab
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Discover')}
                      style={{ backgroundColor: currentTheme.colors.primary }}
                      className="px-6 py-3 rounded-xl mt-4"
                    >
                      <Text className="text-white font-bold">Find Friends</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
} 