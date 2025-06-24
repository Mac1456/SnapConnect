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
  } = useFriendStore();
  const { currentTheme } = useThemeStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'friends'

  useEffect(() => {
    if (user?.uid) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (user?.uid) {
      await Promise.all([
        getFriends(user.uid),
        getFriendRequests(user.uid)
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (requesterId) => {
    try {
      await acceptFriendRequest(requesterId, user.uid);
      await loadData(); // Refresh data
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requesterId) => {
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
              await rejectFriendRequest(requesterId, user.uid);
              await loadData(); // Refresh data
              Alert.alert('Success', 'Friend request rejected');
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
          {request.requester_profile_picture ? (
            <Image 
              source={{ uri: request.requester_profile_picture }} 
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <Ionicons name="person" size={24} color={currentTheme.colors.textSecondary} />
          )}
        </View>
        
        <View className="flex-1">
          <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">
            {request.requester_display_name || request.requester_username}
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">
            @{request.requester_username}
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary }} className="text-xs mt-1">
            {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <View className="flex-row mt-4 space-x-3">
        <TouchableOpacity
          onPress={() => handleAcceptRequest(request.requester_id)}
          style={{ backgroundColor: currentTheme.colors.primary }}
          className="flex-1 py-3 rounded-xl items-center"
          disabled={loading}
        >
          <Text className="text-white font-bold">Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleRejectRequest(request.requester_id)}
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
          onPress={() => navigation.navigate('Chat', { friendId: friend.id, friendName: friend.displayName || friend.username })}
          style={{ backgroundColor: currentTheme.colors.primary }}
          className="px-4 py-2 rounded-xl"
        >
          <Ionicons name="chatbubble" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={currentTheme.colors.background}
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