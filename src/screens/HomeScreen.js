import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useThemeStore } from '../stores/themeStore';
import { useNavigation } from '@react-navigation/native';
import UserSwitcher from '../components/UserSwitcher';

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const { searchUsers, sendFriendRequest, friends } = useFriendStore();
  const parentNavigation = useNavigation();
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Mock data for now
  const snaps = [];
  const unreadSnaps = [];

  const navigateToCamera = () => {
    console.log('🏠 HomeScreen: Take Snap button pressed');
    try {
      // Try to get the parent navigation (stack navigator)
      const rootNavigation = parentNavigation.getParent();
      if (rootNavigation) {
        console.log('🏠 HomeScreen: Using parent navigation to navigate to Camera');
        rootNavigation.navigate('Camera');
      } else {
        console.log('🏠 HomeScreen: Using direct navigation to Camera');
        navigation.navigate('Camera');
      }
    } catch (error) {
      console.error('🏠 HomeScreen: Navigation error:', error);
      // Fallback navigation
      navigation.navigate('Camera');
    }
  };

  const handleProfilePress = () => {
    console.log('🏠 HomeScreen: Profile button pressed');
    try {
      // Try to get the parent navigation (stack navigator)
      const rootNavigation = parentNavigation.getParent();
      if (rootNavigation) {
        console.log('🏠 HomeScreen: Using parent navigation to navigate to Profile');
        rootNavigation.navigate('Profile');
      } else {
        console.log('🏠 HomeScreen: Using direct navigation to Profile');
        navigation.navigate('Profile');
      }
    } catch (error) {
      console.error('🏠 HomeScreen: Profile navigation error:', error);
      // Fallback navigation
      navigation.navigate('Profile');
    }
  };

  const handleProfileLongPress = () => {
    console.log('🏠 HomeScreen: Profile button long pressed - showing user switcher');
    setShowUserSwitcher(true);
  };

  const handleSearchPress = () => {
    console.log('🏠 HomeScreen: Search button pressed - showing friend search');
    setShowFriendSearch(true);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const results = await searchUsers(searchQuery.trim());
      
      // Filter out current user and existing friends
      const filteredResults = results
        .filter(u => u.id !== user.uid)
        .filter(u => !friends.some(friend => friend.id === u.id))
        .map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name || u.username || u.email?.split('@')[0] || 'Unknown User',
          email: u.email,
          profilePicture: u.profile_picture
        }));
        
      console.log('🏠 HomeScreen: Search results:', filteredResults.length);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('🏠 HomeScreen: Search error:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetUser) => {
    try {
      setLoading(true);
      console.log('🏠 HomeScreen: Sending friend request to:', targetUser.username);
      
      await sendFriendRequest(targetUser.id, targetUser.username);
      
      Alert.alert(
        'Success', 
        `Friend request sent to ${targetUser.displayName}!`,
        [{ text: 'OK' }]
      );

      // Remove user from search results
      setSearchResults(prev => prev.filter(user => user.id !== targetUser.id));
    } catch (error) {
      console.error('🏠 HomeScreen: Friend request error:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (targetUser) => {
    setShowFriendSearch(false);
    navigation.navigate('Chat', { 
      recipientId: targetUser.id,
      recipientUsername: targetUser.username || targetUser.displayName,
      recipientName: targetUser.displayName || targetUser.username
    });
  };

  const handleSendSnap = (targetUser) => {
    setShowFriendSearch(false);
    navigation.navigate('Camera', { 
      recipientId: targetUser.id,
      recipientUsername: targetUser.username || targetUser.displayName,
      mode: 'snap'
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Switch User',
      'Sign out to test with different accounts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              console.log('🏠 HomeScreen: User signed out for testing');
            } catch (error) {
              console.error('🏠 HomeScreen: Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderSearchResult = ({ item }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      backgroundColor: currentTheme.colors.surface,
      marginHorizontal: 15,
      marginVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: currentTheme.colors.border,
    }}>
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: currentTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        {item.profilePicture ? (
          <Image 
            source={{ uri: item.profilePicture }} 
            style={{ width: 50, height: 50, borderRadius: 25 }}
          />
        ) : (
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold',
            color: currentTheme.colors.background 
          }}>
            {(item.username || item.displayName)?.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: currentTheme.colors.text,
        }}>
          {item.displayName}
        </Text>
        <Text style={{
          fontSize: 14,
          color: currentTheme.colors.textSecondary,
        }}>
          @{item.username}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity
          onPress={() => handleSendFriendRequest(item)}
          disabled={loading}
          style={{
            backgroundColor: currentTheme.colors.primary,
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text style={{
            color: currentTheme.colors.background,
            fontWeight: 'bold',
            fontSize: 11,
          }}>
            Add
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleSendMessage(item)}
          style={{
            backgroundColor: currentTheme.colors.border,
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text style={{
            color: currentTheme.colors.text,
            fontWeight: 'bold',
            fontSize: 11,
          }}>
            Message
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleSendSnap(item)}
          style={{
            backgroundColor: currentTheme.colors.secondary || currentTheme.colors.border,
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text style={{
            color: currentTheme.colors.text,
            fontWeight: 'bold',
            fontSize: 11,
          }}>
            Snap
          </Text>
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
          <TouchableOpacity 
            onPress={handleProfilePress}
            onLongPress={handleProfileLongPress}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: currentTheme.colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: currentTheme.colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            {user?.profilePicture || user?.profile_picture ? (
              <Image 
                source={{ uri: user.profilePicture || user.profile_picture }} 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={24} color={currentTheme.colors.accent} />
            )}
          </TouchableOpacity>
          
          <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold drop-shadow-lg">SnapConnect</Text>
          
          <TouchableOpacity 
            onPress={handleSearchPress}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: currentTheme.colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: currentTheme.colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Ionicons name="search" size={24} color={currentTheme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View className="flex-row justify-around px-4 py-4">
          <TouchableOpacity 
            style={{ backgroundColor: currentTheme.colors.surface }}
            className="rounded-2xl px-8 py-4 backdrop-blur-lg shadow-lg"
            onPress={navigateToCamera}
          >
            <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">📸 Take Snap</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ backgroundColor: currentTheme.colors.surface }}
            className="rounded-2xl px-8 py-4 backdrop-blur-lg shadow-lg"
            onPress={() => navigation.navigate('Chats')}
          >
            <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">💬 View Chats</Text>
          </TouchableOpacity>
        </View>

        {/* Snap Map Placeholder */}
        <View className="flex-1 mx-4 mb-4">
          <View 
            style={{ backgroundColor: currentTheme.colors.surface }}
            className="rounded-3xl flex-1 items-center justify-center backdrop-blur-lg"
          >
            <Ionicons name="location" size={80} color={currentTheme.colors.text} />
            <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold mt-4 drop-shadow-lg">🗺️ Snap Map</Text>
            <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center mt-2 px-8 text-lg">
              See where your friends are and discover what's happening around you
            </Text>
            
            {/* Recent Activity */}
            <View className="mt-8 w-full px-6">
              <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mb-4 drop-shadow-lg">✨ Recent Activity</Text>
              
              {unreadSnaps.length > 0 ? (
                <ScrollView className="max-h-40">
                  {unreadSnaps.map((snap, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{ backgroundColor: currentTheme.colors.background }}
                      className="flex-row items-center p-3 rounded-xl mb-2 backdrop-blur-lg"
                      onPress={() => navigation.navigate('StoryView', { snap })}
                    >
                      <View className="w-10 h-10 rounded-full bg-yellow-400 items-center justify-center mr-3">
                        <Text className="font-bold text-black">
                          {snap.sender?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text style={{ color: currentTheme.colors.text }} className="font-bold">
                          {snap.sender}
                        </Text>
                        <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">
                          Sent you a snap
                        </Text>
                      </View>
                      <Text style={{ color: currentTheme.colors.textSecondary }} className="text-xs">
                        {snap.timestamp}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View className="items-center py-8">
                  <Text style={{ color: currentTheme.colors.textSecondary }} className="text-lg">
                    No recent activity
                  </Text>
                  <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm mt-2">
                    Start snapping with friends!
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* User Switcher Modal */}
        <UserSwitcher 
          visible={showUserSwitcher}
          onClose={() => setShowUserSwitcher(false)}
        />

        {/* Friend Search Modal */}
        <Modal
          visible={showFriendSearch}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFriendSearch(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            justifyContent: 'flex-end',
          }}>
            <View style={{
              backgroundColor: currentTheme.colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '80%',
            }}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                paddingBottom: 15,
                borderBottomWidth: 1,
                borderBottomColor: currentTheme.colors.border,
              }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: currentTheme.colors.text,
                }}>
                  Find Friends
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowFriendSearch(false);
                      navigation.navigate('FindFriends');
                    }}
                    style={{
                      backgroundColor: currentTheme.colors.primary,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{
                      color: currentTheme.colors.background,
                      fontWeight: 'bold',
                      fontSize: 12,
                    }}>
                      More Options
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowFriendSearch(false)}>
                    <Ionicons name="close" size={24} color={currentTheme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Input */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: currentTheme.colors.surface,
                borderRadius: 25,
                paddingHorizontal: 15,
                marginBottom: 15,
                borderWidth: 1,
                borderColor: currentTheme.colors.border,
              }}>
                <Ionicons name="search" size={20} color={currentTheme.colors.textSecondary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (text.trim()) {
                      setTimeout(() => handleSearch(), 300);
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  placeholder="Search friends..."
                  placeholderTextColor={currentTheme.colors.textSecondary}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    fontSize: 16,
                    color: currentTheme.colors.text,
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}>
                    <Ionicons name="close-circle" size={20} color={currentTheme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results */}
              {searchQuery.trim() ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResult}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 400 }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={() => (
                    <View style={{
                      alignItems: 'center',
                      paddingVertical: 40,
                    }}>
                      <Ionicons name="search" size={64} color={currentTheme.colors.textSecondary} />
                      <Text style={{
                        fontSize: 16,
                        color: currentTheme.colors.textSecondary,
                        marginTop: 15,
                        textAlign: 'center',
                      }}>
                        {loading ? 'Searching...' : 'No users found'}
                      </Text>
                    </View>
                  )}
                />
              ) : (
                <View style={{
                  alignItems: 'center',
                  paddingVertical: 40,
                }}>
                  <Ionicons name="people" size={64} color={currentTheme.colors.textSecondary} />
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: currentTheme.colors.text,
                    marginTop: 15,
                    textAlign: 'center',
                  }}>
                    Quick Friend Search
                  </Text>
                  <Text style={{
                    fontSize: 16,
                    color: currentTheme.colors.textSecondary,
                    marginTop: 8,
                    textAlign: 'center',
                  }}>
                    Search for friends and send requests, messages, or snaps
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
} 