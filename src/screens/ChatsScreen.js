import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useSnapStore } from '../stores/snapStore';
import { useFriendStore } from '../stores/friendStore';
import { useThemeStore } from '../stores/themeStore';

export default function ChatsScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  const { user } = useAuthStore();
  const { snaps, listenToSnaps } = useSnapStore();
  const { 
    friends, 
    friendRequests, 
    getFriends, 
    searchUsers, 
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    listenToFriendRequests 
  } = useFriendStore();
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    if (user) {
      // Listen to snaps and friend requests
      const unsubscribeSnaps = listenToSnaps(user.uid);
      const unsubscribeFriendRequests = listenToFriendRequests(user.uid);
      
      // Get friends list
      if (user.friends && user.friends.length > 0) {
        getFriends(user.friends);
      }
      
      return () => {
        unsubscribeSnaps();
        unsubscribeFriendRequests();
      };
    }
  }, [user]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results.filter(u => u.id !== user.uid));
    }
  };

  const handleSendFriendRequest = async (targetUser) => {
    try {
      await sendFriendRequest(targetUser.id, user);
      Alert.alert('Success', `Friend request sent to ${targetUser.displayName}`);
      setSearchResults(searchResults.filter(u => u.id !== targetUser.id));
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requesterId) => {
    try {
      await acceptFriendRequest(requesterId, user.uid);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requesterId) => {
    try {
      await rejectFriendRequest(requesterId, user.uid);
    } catch (error) {
      Alert.alert('Error', 'Failed to reject friend request');
    }
  };

  // Group snaps by sender
  const snapsByUser = snaps.reduce((acc, snap) => {
    if (!acc[snap.senderId]) {
      acc[snap.senderId] = [];
    }
    acc[snap.senderId].push(snap);
    return acc;
  }, {});

  return (
    <LinearGradient
      colors={currentTheme.colors.background}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View 
          style={{ backgroundColor: currentTheme.colors.surface }}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold">Chats</Text>
          <TouchableOpacity onPress={() => setShowAddFriends(!showAddFriends)}>
            <Ionicons name="person-add" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Add Friends Section */}
        {showAddFriends && (
          <View className="mx-4 my-4 p-4 rounded-2xl shadow-lg" style={{ backgroundColor: currentTheme.colors.surface }}>
            <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mb-3">Add Friends</Text>
            
            <View className="flex-row mb-3">
              <TextInput
                style={{ 
                  backgroundColor: currentTheme.colors.surface,
                  color: currentTheme.colors.text,
                  borderColor: currentTheme.colors.textTertiary
                }}
                className="flex-1 border rounded-xl px-4 py-2 mr-2"
                placeholder="Search by username..."
                placeholderTextColor={currentTheme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                onPress={handleSearch}
                style={{ backgroundColor: currentTheme.colors.primary }}
                className="rounded-xl px-4 py-2"
              >
                <Ionicons name="search" size={20} color={currentTheme.colors.accent} />
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {searchResults.map((result) => (
              <View key={result.id} 
                style={{ borderBottomColor: currentTheme.colors.textTertiary }}
                className="flex-row items-center justify-between py-2 border-b"
              >
                <View>
                  <Text style={{ color: currentTheme.colors.text }} className="font-semibold">{result.displayName}</Text>
                  <Text style={{ color: currentTheme.colors.textSecondary }}>@{result.username}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleSendFriendRequest(result)}
                  style={{ backgroundColor: currentTheme.colors.primary }}
                  className="rounded-full px-4 py-2"
                >
                  <Text style={{ color: currentTheme.colors.accent }} className="font-semibold">Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <View className="mx-4 mb-4">
            <Text style={{ color: currentTheme.colors.text }} className="text-lg font-bold mb-2">Friend Requests</Text>
            {friendRequests.map((request) => (
              <View key={request.userId} 
                style={{ backgroundColor: currentTheme.colors.surface }}
                className="rounded-xl p-3 mb-2"
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text style={{ color: currentTheme.colors.text }} className="font-semibold">{request.displayName}</Text>
                    <Text style={{ color: currentTheme.colors.textSecondary }}>@{request.username}</Text>
                  </View>
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      onPress={() => handleAcceptRequest(request.userId)}
                      style={{ backgroundColor: currentTheme.colors.primary }}
                      className="rounded-full px-4 py-2"
                    >
                      <Text style={{ color: currentTheme.colors.accent }} className="font-semibold">Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRejectRequest(request.userId)}
                      style={{ backgroundColor: currentTheme.colors.secondary }}
                      className="rounded-full px-4 py-2"
                    >
                      <Text style={{ color: currentTheme.colors.text }} className="font-semibold">Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Chat List */}
        <ScrollView className="flex-1 px-4">
          {/* Friends with snaps */}
          {Object.keys(snapsByUser).map((senderId) => {
            const userSnaps = snapsByUser[senderId];
            const latestSnap = userSnaps[0];
            const unreadCount = userSnaps.filter(snap => !snap.opened).length;
            
            return (
              <TouchableOpacity
                key={senderId}
                onPress={() => navigation.navigate('Chat', {
                  chatId: senderId,
                  username: latestSnap.senderUsername
                })}
                style={{ borderBottomColor: currentTheme.colors.textTertiary }}
                className="flex-row items-center py-4 border-b"
              >
                <View 
                  style={{ backgroundColor: currentTheme.colors.secondary }}
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                >
                  <Ionicons name="person" size={24} color={currentTheme.colors.text} />
                </View>
                
                <View className="flex-1">
                  <Text style={{ color: currentTheme.colors.text }} className="font-semibold text-lg">
                    {latestSnap.senderUsername}
                  </Text>
                  <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">
                    {latestSnap.type === 'image' ? '📷 Photo' : '🎥 Video'} • {latestSnap.timestamp}
                  </Text>
                </View>
                
                {unreadCount > 0 && (
                  <View 
                    style={{ backgroundColor: currentTheme.colors.primary }}
                    className="w-6 h-6 rounded-full items-center justify-center"
                  >
                    <Text style={{ color: currentTheme.colors.accent }} className="text-xs font-bold">
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* No chats state */}
          {Object.keys(snapsByUser).length === 0 && (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={64} color={currentTheme.colors.textTertiary} />
              <Text style={{ color: currentTheme.colors.textSecondary }} className="text-lg mt-4 text-center">
                No chats yet
              </Text>
              <Text style={{ color: currentTheme.colors.textTertiary }} className="text-sm mt-2 text-center px-8">
                Add friends and start sharing snaps to see your conversations here!
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
} 