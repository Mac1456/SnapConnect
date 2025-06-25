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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useThemeStore } from '../stores/themeStore';

const FindFriendsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const { searchUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, friends } = useFriendStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'requests', 'friends'

  useEffect(() => {
    loadFriendRequests();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadFriendRequests = async () => {
    try {
      const requests = await getFriendRequests();
      setFriendRequests(requests || []);
    } catch (error) {
      console.error('🔍 FindFriendsScreen: Error loading friend requests:', error);
    }
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
        
      console.log('🔍 FindFriendsScreen: Search results:', filteredResults.length);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('🔍 FindFriendsScreen: Search error:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetUser) => {
    try {
      setLoading(true);
      console.log('🔍 FindFriendsScreen: Sending friend request to:', targetUser.username);
      
      await sendFriendRequest(targetUser.id, targetUser.username);
      
      Alert.alert(
        'Success', 
        `Friend request sent to ${targetUser.displayName}!`,
        [{ text: 'OK' }]
      );

      // Remove user from search results
      setSearchResults(prev => prev.filter(user => user.id !== targetUser.id));
    } catch (error) {
      console.error('🔍 FindFriendsScreen: Friend request error:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      setLoading(true);
      await acceptFriendRequest(request.id);
      
      Alert.alert('Success', `You are now friends with ${request.requester_username}!`);
      
      // Refresh friend requests
      await loadFriendRequests();
    } catch (error) {
      console.error('🔍 FindFriendsScreen: Accept request error:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      setLoading(true);
      await rejectFriendRequest(request.id);
      
      // Refresh friend requests
      await loadFriendRequests();
    } catch (error) {
      console.error('🔍 FindFriendsScreen: Reject request error:', error);
      Alert.alert('Error', 'Failed to reject friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (targetUser) => {
    navigation.navigate('Chat', { 
      recipientId: targetUser.id,
      recipientUsername: targetUser.username || targetUser.displayName,
      recipientName: targetUser.displayName || targetUser.username
    });
  };

  const handleSendSnap = (targetUser) => {
    navigation.navigate('Camera', { 
      recipientId: targetUser.id,
      recipientUsername: targetUser.username || targetUser.displayName,
      mode: 'snap'
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFriendRequests();
    setRefreshing(false);
  };

  const renderSearchResult = ({ item }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: currentTheme.colors.surfaceElevated,
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: currentTheme.colors.border,
      shadowColor: currentTheme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: currentTheme.colors.snapYellow,
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
            color: currentTheme.colors.textInverse 
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
          marginBottom: 2,
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
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => handleSendMessage(item)}
          style={{
            backgroundColor: currentTheme.colors.snapPurple,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Ionicons name="chatbubble" size={16} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleSendSnap(item)}
          style={{
            backgroundColor: currentTheme.colors.snapPink,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Ionicons name="camera" size={16} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleSendFriendRequest(item)}
          style={{
            backgroundColor: currentTheme.colors.snapYellow,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Ionicons name="person-add" size={16} color={currentTheme.colors.textInverse} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriendRequest = ({ item }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: currentTheme.colors.surfaceElevated,
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: currentTheme.colors.border,
      shadowColor: currentTheme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: currentTheme.colors.snapYellow,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: currentTheme.colors.textInverse,
        }}>
          {item.requester_username?.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: currentTheme.colors.text,
          marginBottom: 2,
        }}>
          {item.requester_username}
        </Text>
        <Text style={{
          fontSize: 14,
          color: currentTheme.colors.textSecondary,
        }}>
          Wants to be friends
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => handleAcceptRequest(item)}
          style={{
            backgroundColor: currentTheme.colors.success,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleRejectRequest(item)}
          style={{
            backgroundColor: currentTheme.colors.error,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = ({ item }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: currentTheme.colors.surfaceElevated,
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: currentTheme.colors.border,
      shadowColor: currentTheme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: currentTheme.colors.snapYellow,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        {item.profile_picture ? (
          <Image 
            source={{ uri: item.profile_picture }} 
            style={{ width: 50, height: 50, borderRadius: 25 }}
          />
        ) : (
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: currentTheme.colors.textInverse,
          }}>
            {(item.username || item.display_name)?.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: currentTheme.colors.text,
          marginBottom: 2,
        }}>
          {item.display_name || item.username}
        </Text>
        <Text style={{
          fontSize: 14,
          color: currentTheme.colors.textSecondary,
        }}>
          @{item.username}
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => handleSendMessage(item)}
          style={{
            backgroundColor: currentTheme.colors.snapPurple,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Ionicons name="chatbubble" size={16} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleSendSnap(item)}
          style={{
            backgroundColor: currentTheme.colors.snapPink,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Ionicons name="camera" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: currentTheme.colors.background 
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.colors.border,
        backgroundColor: currentTheme.colors.surfaceElevated,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: currentTheme.colors.text,
        }}>
          Find Friends
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar - Moved to top */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: currentTheme.colors.surfaceElevated,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: currentTheme.colors.surface,
          borderRadius: 25,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: currentTheme.colors.border,
        }}>
          <Ionicons name="search" size={20} color={currentTheme.colors.textSecondary} />
          <TextInput
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              marginLeft: 12,
              fontSize: 16,
              color: currentTheme.colors.text,
            }}
            placeholderTextColor={currentTheme.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={currentTheme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: currentTheme.colors.surfaceElevated,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.colors.border,
      }}>
        {[
          { id: 'search', label: 'Search', icon: 'search' },
          { id: 'requests', label: 'Requests', icon: 'person-add', badge: friendRequests.length },
          { id: 'friends', label: 'Friends', icon: 'people' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.id ? currentTheme.colors.snapYellow : 'transparent',
            }}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? currentTheme.colors.snapYellow : currentTheme.colors.textSecondary} 
            />
            <Text style={{
              marginLeft: 8,
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              color: activeTab === tab.id ? currentTheme.colors.snapYellow : currentTheme.colors.textSecondary,
            }}>
              {tab.label}
            </Text>
            {tab.badge > 0 && (
              <View style={{
                backgroundColor: currentTheme.colors.error,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}>
                  {tab.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'search' && (
          <View style={{ flex: 1 }}>
            {searchQuery.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                refreshControl={
                  <RefreshControl refreshing={loading} onRefresh={handleSearch} />
                }
                contentContainerStyle={{ paddingVertical: 8 }}
                ListEmptyComponent={
                  <View style={{
                    alignItems: 'center',
                    paddingVertical: 40,
                  }}>
                    <Ionicons name="search" size={64} color={currentTheme.colors.textTertiary} />
                    <Text style={{
                      fontSize: 16,
                      color: currentTheme.colors.textSecondary,
                      marginTop: 16,
                      textAlign: 'center',
                    }}>
                      {loading ? 'Searching...' : 'No users found'}
                    </Text>
                  </View>
                }
              />
            ) : (
              <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 32,
              }}>
                <Ionicons name="search" size={80} color={currentTheme.colors.textTertiary} />
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: currentTheme.colors.text,
                  marginTop: 16,
                  textAlign: 'center',
                }}>
                  Search for Friends
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: currentTheme.colors.textSecondary,
                  marginTop: 8,
                  textAlign: 'center',
                }}>
                  Find friends by username, display name, or email
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'requests' && (
          <FlatList
            data={friendRequests}
            renderItem={renderFriendRequest}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingVertical: 8 }}
            ListEmptyComponent={
              <View style={{
                alignItems: 'center',
                paddingVertical: 40,
              }}>
                <Ionicons name="person-add" size={64} color={currentTheme.colors.textTertiary} />
                <Text style={{
                  fontSize: 16,
                  color: currentTheme.colors.textSecondary,
                  marginTop: 16,
                  textAlign: 'center',
                }}>
                  No pending friend requests
                </Text>
              </View>
            }
          />
        )}

        {activeTab === 'friends' && (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingVertical: 8 }}
            ListEmptyComponent={
              <View style={{
                alignItems: 'center',
                paddingVertical: 40,
              }}>
                <Ionicons name="people" size={64} color={currentTheme.colors.textTertiary} />
                <Text style={{
                  fontSize: 16,
                  color: currentTheme.colors.textSecondary,
                  marginTop: 16,
                  textAlign: 'center',
                }}>
                  No friends yet
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: currentTheme.colors.textTertiary,
                  marginTop: 8,
                  textAlign: 'center',
                }}>
                  Search for users to send friend requests
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default FindFriendsScreen; 