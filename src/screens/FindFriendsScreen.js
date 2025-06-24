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

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => handleSendFriendRequest(item)}
          disabled={loading}
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
            Add Friend
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriendRequest = ({ item }) => (
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
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold',
          color: currentTheme.colors.background 
        }}>
          {item.requester_username?.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: currentTheme.colors.text,
        }}>
          @{item.requester_username}
        </Text>
        <Text style={{
          fontSize: 12,
          color: currentTheme.colors.textSecondary,
        }}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => handleAcceptRequest(item)}
          disabled={loading}
          style={{
            backgroundColor: '#4CAF50',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: 12,
          }}>
            Accept
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleRejectRequest(item)}
          disabled={loading}
          style={{
            backgroundColor: '#f44336',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: 12,
          }}>
            Decline
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = ({ item }) => (
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
          {item.displayName || item.username}
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
            Message
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleSendSnap(item)}
          style={{
            backgroundColor: currentTheme.colors.secondary || currentTheme.colors.border,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{
            color: currentTheme.colors.text,
            fontWeight: 'bold',
            fontSize: 12,
          }}>
            Snap
          </Text>
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
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.colors.border,
        backgroundColor: currentTheme.colors.surface,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
        </TouchableOpacity>
        
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: currentTheme.colors.text,
          flex: 1,
        }}>
          Find Friends
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: currentTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.colors.border,
      }}>
        {[
          { key: 'search', label: 'Search', icon: 'search' },
          { key: 'requests', label: `Requests${friendRequests.length > 0 ? ` (${friendRequests.length})` : ''}`, icon: 'person-add' },
          { key: 'friends', label: 'Friends', icon: 'people' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 15,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? currentTheme.colors.primary : 'transparent',
            }}
          >
            <Ionicons 
              name={tab.icon} 
              size={18} 
              color={activeTab === tab.key ? currentTheme.colors.primary : currentTheme.colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={{
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              color: activeTab === tab.key ? currentTheme.colors.primary : currentTheme.colors.textSecondary,
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'search' && (
        <View style={{ flex: 1 }}>
          {/* Search Input */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            margin: 15,
            backgroundColor: currentTheme.colors.surface,
            borderRadius: 25,
            paddingHorizontal: 15,
            borderWidth: 1,
            borderColor: currentTheme.colors.border,
          }}>
            <Ionicons name="search" size={20} color={currentTheme.colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by username, name, or email..."
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
              <TouchableOpacity onPress={() => setSearchQuery('')}>
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
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 40,
            }}>
              <Ionicons name="people" size={64} color={currentTheme.colors.textSecondary} />
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: currentTheme.colors.text,
                marginTop: 15,
                textAlign: 'center',
              }}>
                Find New Friends
              </Text>
              <Text style={{
                fontSize: 16,
                color: currentTheme.colors.textSecondary,
                marginTop: 8,
                textAlign: 'center',
              }}>
                Search for friends by username, name, or email address
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={friendRequests}
          renderItem={renderFriendRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={() => (
            <View style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}>
              <Ionicons name="person-add" size={64} color={currentTheme.colors.textSecondary} />
              <Text style={{
                fontSize: 16,
                color: currentTheme.colors.textSecondary,
                marginTop: 15,
                textAlign: 'center',
              }}>
                No friend requests
              </Text>
            </View>
          )}
        />
      )}

      {activeTab === 'friends' && (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={() => (
            <View style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}>
              <Ionicons name="people" size={64} color={currentTheme.colors.textSecondary} />
              <Text style={{
                fontSize: 16,
                color: currentTheme.colors.textSecondary,
                marginTop: 15,
                textAlign: 'center',
              }}>
                No friends yet
              </Text>
              <Text style={{
                fontSize: 14,
                color: currentTheme.colors.textSecondary,
                marginTop: 8,
                textAlign: 'center',
              }}>
                Search for friends to get started!
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default FindFriendsScreen; 