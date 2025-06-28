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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useSupabaseSnapStore as useSnapStore } from '../stores/supabaseSnapStore';
import { useThemeStore } from '../stores/themeStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import UserSwitcher from '../components/UserSwitcher';

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const { friends, getFriends } = useFriendStore();
  const { stories, loadAllStories, setupStoriesListener } = useSnapStore();
  const parentNavigation = useNavigation();
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  
  // Mock data for now
  const snaps = [];
  const unreadSnaps = [];

  // Load friends and stories when component mounts or user changes
  useEffect(() => {
    if (user && user.uid) {
      console.log('🏠 HomeScreen: Loading friends and stories for user:', user.uid);
      getFriends(user.uid);
      loadAllStories(user.uid);
      setupStoriesListener(user.uid);
    }
  }, [user]);

  // Process stories by user for display
  const friendStoriesByUser = React.useMemo(() => {
    console.log('🏠 HomeScreen: Processing stories for display, total stories:', stories?.length || 0);
    
    if (!stories || stories.length === 0) {
      return {};
    }

    const storiesByUser = {};
    
    stories.forEach(story => {
      const userId = story.userId || story.user_id;
      if (!storiesByUser[userId]) {
        storiesByUser[userId] = [];
      }
      storiesByUser[userId].push(story);
    });

    // Sort stories within each user by creation time (newest first)
    Object.keys(storiesByUser).forEach(userId => {
      storiesByUser[userId].sort((a, b) => 
        new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
      );
    });

    console.log('🏠 HomeScreen: Stories grouped by user:', Object.keys(storiesByUser).length, 'users');
    return storiesByUser;
  }, [stories]);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const storyTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - storyTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    return storyTime.toLocaleDateString();
  };

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

  return (
          <LinearGradient
        colors={currentTheme.colors.backgroundGradient || ['#FFFFFF', '#F8F9FA']}
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
            onPress={() => navigation.navigate('Friends')}
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
            <Ionicons name="people-outline" size={24} color={currentTheme.colors.accent} />
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

        {/* Friends' Stories */}
        <View className="flex-1 mx-4 mb-4">
          <View 
            style={{ backgroundColor: currentTheme.colors.surface }}
            className="rounded-3xl flex-1 backdrop-blur-lg p-6"
          >
            <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold mb-4 drop-shadow-lg">📖 Friends' Stories</Text>
            
            {Object.keys(friendStoriesByUser).length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {Object.keys(friendStoriesByUser).map((userId) => {
                  const userStories = friendStoriesByUser[userId];
                  const latestStory = userStories[0];
                  const hasViewed = user && user.uid ? latestStory.views?.includes(user.uid) : false;
                  
                  return (
                    <TouchableOpacity
                      key={userId}
                      onPress={() => navigation.navigate('StoryView', { 
                        stories: userStories, 
                        initialIndex: 0 
                      })}
                      style={{ backgroundColor: currentTheme.colors.background }}
                      className="flex-row items-center p-4 rounded-xl mb-3 backdrop-blur-lg"
                    >
                      <View 
                        style={{ 
                          borderColor: hasViewed ? currentTheme.colors.textSecondary : currentTheme.colors.primary,
                          borderWidth: 3,
                        }}
                        className="w-16 h-16 rounded-full overflow-hidden mr-4"
                      >
                        {latestStory.mediaType === 'image' ? (
                          <Image 
                            source={{ uri: latestStory.mediaUrl || latestStory.media_url }} 
                            className="w-full h-full" 
                            resizeMode="cover"
                          />
                        ) : (
                          <View 
                            style={{ backgroundColor: currentTheme.colors.surface }}
                            className="w-full h-full items-center justify-center"
                          >
                            <Ionicons name="play" size={24} color={currentTheme.colors.text} />
                          </View>
                        )}
                      </View>
                      
                      <View className="flex-1">
                        <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">
                          {latestStory.displayName || latestStory.display_name || latestStory.username}
                        </Text>
                        <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">
                          {userStories.length} {userStories.length === 1 ? 'story' : 'stories'} • {formatTimeAgo(latestStory.createdAt || latestStory.created_at)}
                        </Text>
                        {latestStory.caption && (
                          <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm mt-1" numberOfLines={1}>
                            "{latestStory.caption}"
                          </Text>
                        )}
                      </View>
                      
                      {!hasViewed && (
                        <View 
                          style={{ backgroundColor: currentTheme.colors.primary }}
                          className="w-3 h-3 rounded-full" 
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View className="items-center justify-center flex-1">
                <Ionicons name="people-outline" size={80} color={currentTheme.colors.text} />
                <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mt-4 drop-shadow-lg">No Stories Yet</Text>
                <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center mt-2 px-4 text-base">
                  Stories from your friends will appear here when they share them
                </Text>
                <TouchableOpacity
                  onPress={navigateToCamera}
                  style={{ backgroundColor: currentTheme.colors.primary }}
                  className="rounded-2xl px-6 py-3 mt-6"
                >
                  <Text style={{ color: currentTheme.colors.background }} className="font-bold text-base">📸 Create Story</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* User Switcher Modal */}
        <UserSwitcher 
          visible={showUserSwitcher}
          onClose={() => setShowUserSwitcher(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
} 