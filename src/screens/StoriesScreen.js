import React, { useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSupabaseSnapStore as useSnapStore } from '../stores/supabaseSnapStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';

export default function StoriesScreen({ navigation }) {
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const parentNavigation = useNavigation();
  const {
    stories,
    listenToStories,
    loadAllStories,
    setupStoriesListener,
    deleteStory,
  } = useSnapStore();
  const { friends, getFriends } = useFriendStore();

  useEffect(() => {
    if (user && user.uid) {
      console.log('📖 StoriesScreen: 🔄 useEffect triggered - Loading friends and stories for user:', user.uid);
      console.log('📖 StoriesScreen: 🔄 User object:', JSON.stringify(user, null, 2));
      
      // Load friends first
      console.log('📖 StoriesScreen: 🔄 Calling getFriends...');
      getFriends(user.uid);
      
      // Load all stories (including user's own and public stories)
      console.log('📖 StoriesScreen: 🔄 Calling loadAllStories...');
      loadAllStories(user.uid);
      
      // Set up real-time listener for stories
      console.log('📖 StoriesScreen: 🔄 Setting up stories real-time listener...');
      setupStoriesListener(user.uid);
    } else {
      console.log('📖 StoriesScreen: 🔄 useEffect - No user or user.uid:', { user, uid: user?.uid });
    }
  }, [user]);

  // Refresh stories when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user && user.uid) {
        console.log('📖 StoriesScreen: 🎯 Screen focused, refreshing stories and friends for user:', user.uid);
        console.log('📖 StoriesScreen: 🎯 Focus - Current stories count:', stories.length);
        console.log('📖 StoriesScreen: 🎯 Focus - Current friends count:', friends.length);
        
        getFriends(user.uid);
        loadAllStories(user.uid);
      } else {
        console.log('📖 StoriesScreen: 🎯 Focus - No user or user.uid:', { user, uid: user?.uid });
      }
    }, [user, loadAllStories, getFriends])
  );

  // Group stories by user
  console.log('📖 StoriesScreen: 📊 Starting to group stories by user...');
  console.log('📖 StoriesScreen: 📊 Total stories to process:', stories.length);
  console.log('📖 StoriesScreen: 📊 Stories array:', JSON.stringify(stories, null, 2));
  
  const storiesByUser = stories.reduce((acc, story) => {
    console.log('📖 StoriesScreen: 📊 Processing story:', story.id, 'from user:', story.userId);
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {});

  console.log('📖 StoriesScreen: 📊 Stories grouped by user:', JSON.stringify(storiesByUser, null, 2));

  // Get friend IDs for filtering
  console.log('📖 StoriesScreen: 📊 Processing friends for filtering...');
  console.log('📖 StoriesScreen: 📊 Friends array:', JSON.stringify(friends, null, 2));
  
  const friendIds = friends.map(friend => friend.id);
  console.log('📖 StoriesScreen: 📊 Friend IDs:', friendIds);
  console.log('📖 StoriesScreen: 📊 All story user IDs:', Object.keys(storiesByUser));

  // Filter stories to only show friends' stories (plus user's own)
  console.log('📖 StoriesScreen: 🔍 Starting to filter stories...');
  console.log('📖 StoriesScreen: 🔍 Current user ID:', user?.uid);
  console.log('📖 StoriesScreen: 🔍 Available story user IDs:', Object.keys(storiesByUser));
  console.log('📖 StoriesScreen: 🔍 Friend IDs for filtering:', friendIds);
  
  const friendStoriesByUser = Object.keys(storiesByUser)
    .filter(userId => {
      // Include user's own stories or friends' stories
      const isOwnStory = user && user.uid && userId === user.uid;
      const isFriendStory = friendIds.includes(userId);
      console.log('📖 StoriesScreen: 🔍 Checking userId:', userId, 'isOwnStory:', isOwnStory, 'isFriendStory:', isFriendStory);
      const shouldInclude = isOwnStory || isFriendStory;
      console.log('📖 StoriesScreen: 🔍 Should include user', userId, ':', shouldInclude);
      return shouldInclude;
    })
    .reduce((acc, userId) => {
      console.log('📖 StoriesScreen: 🔍 Adding stories for user:', userId, 'count:', storiesByUser[userId].length);
      acc[userId] = storiesByUser[userId];
      return acc;
    }, {});

  console.log('📖 StoriesScreen: 🔍 Filtered friend stories user IDs:', Object.keys(friendStoriesByUser));
  console.log('📖 StoriesScreen: 🔍 Filtered friend stories data:', JSON.stringify(friendStoriesByUser, null, 2));

  const navigateToCamera = () => {
    console.log('📖 StoriesScreen: 📸 Camera button pressed');
    console.log('📖 StoriesScreen: 📸 Navigation object:', !!navigation);
    console.log('📖 StoriesScreen: 📸 Parent navigation object:', !!parentNavigation);
    
    try {
      // Try to get the parent navigation (stack navigator)
      const rootNavigation = parentNavigation.getParent();
      console.log('📖 StoriesScreen: 📸 Root navigation found:', !!rootNavigation);
      
      if (rootNavigation) {
        console.log('📖 StoriesScreen: 📸 Using parent navigation to navigate to Camera');
        rootNavigation.navigate('Camera');
      } else {
        console.log('📖 StoriesScreen: 📸 Using direct navigation to Camera');
        navigation.navigate('Camera');
      }
    } catch (error) {
      console.error('📖 StoriesScreen: 📸 Navigation error:', error.message);
      console.error('📖 StoriesScreen: 📸 Navigation error stack:', error.stack);
      // Fallback navigation
      console.log('📖 StoriesScreen: 📸 Using fallback navigation');
      navigation.navigate('Camera');
    }
  };

  const handleDeleteStory = (story) => {
    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            console.log('🗑️ Deleting story:', story.id);
            deleteStory(story.id, story.mediaUrl);
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const storyTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMinutes = Math.floor((now - storyTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    return '1d';
  };

  return (
    <LinearGradient
      colors={currentTheme.colors.backgroundGradient || (currentTheme.mode === 'dark' ? ['#000000', '#1A1A1A'] : ['#FFFFFF', '#F8F9FA'])}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text style={{ color: currentTheme.colors.text }} className="text-3xl font-bold drop-shadow-lg">📖 Stories</Text>
          <TouchableOpacity 
            onPress={navigateToCamera} 
            style={{ backgroundColor: currentTheme.colors.surface }}
            className="backdrop-blur-lg rounded-full p-3"
          >
            <Ionicons name="camera" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1">
          {/* My Story */}
          <View className="px-4 mb-6">
            <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold mb-4 drop-shadow-lg">✨ My Story</Text>
            
            <TouchableOpacity
              onPress={navigateToCamera}
              className="items-center"
            >
              <View 
                style={{ 
                  backgroundColor: currentTheme.colors.surface,
                  borderColor: currentTheme.colors.textTertiary
                }}
                className="w-20 h-20 backdrop-blur-lg rounded-full items-center justify-center border-2 border-dashed mb-3"
              >
                <Ionicons name="add" size={32} color={currentTheme.colors.text} />
              </View>
              <Text style={{ color: currentTheme.colors.text }} className="text-lg font-semibold drop-shadow-lg">📸 Add to Story</Text>
            </TouchableOpacity>

          {/* User's own stories */}
          {user && user.uid && friendStoriesByUser[user.uid] && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              {friendStoriesByUser[user.uid].map((story) => (
                <TouchableOpacity
                  key={story.id}
                  onPress={() => navigation.navigate('StoryView', { 
                    stories: friendStoriesByUser[user.uid], 
                    initialIndex: friendStoriesByUser[user.uid].indexOf(story) 
                  })}
                  onLongPress={() => handleDeleteStory(story)}
                  className="mr-4"
                >
                  <View 
                    style={{ borderColor: currentTheme.colors.primary }}
                    className="w-16 h-16 rounded-full overflow-hidden border-2"
                  >
                    {story.mediaType === 'image' ? (
                      <Image 
                        source={{ uri: story.mediaUrl }} 
                        className="w-full h-full"
                        style={{ backgroundColor: '#f0f0f0' }}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('📖 StoriesScreen: Preview image failed to load:', story.mediaUrl, error);
                        }}
                        onLoad={() => {
                          console.log('📖 StoriesScreen: Preview image loaded successfully:', story.mediaUrl);
                        }}
                      />
                    ) : story.mediaType === 'video' ? (
                      <View 
                        style={{ backgroundColor: '#333' }}
                        className="w-full h-full items-center justify-center"
                      >
                        <Ionicons name="play" size={20} color="white" />
                      </View>
                    ) : (
                      <View 
                        style={{ backgroundColor: '#f0f0f0' }}
                        className="w-full h-full items-center justify-center"
                      >
                        <Ionicons name="image" size={20} color="#666" />
                      </View>
                    )}
                  </View>
                  <Text style={{ color: currentTheme.colors.text }} className="text-xs text-center mt-1">
                    {formatTimeAgo(story.createdAt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Friends' Stories */}
        {user && user.uid && Object.keys(friendStoriesByUser).filter(userId => userId !== user.uid).length > 0 && (
          <View className="px-4">
            <Text style={{ color: currentTheme.colors.text }} className="text-lg font-bold mb-3">Friends</Text>
            
            {Object.keys(friendStoriesByUser)
              .filter(userId => user && user.uid && userId !== user.uid)
              .map((userId) => {
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
                    className="flex-row items-center py-3"
                  >
                    <View 
                      style={{ 
                        borderColor: hasViewed ? currentTheme.colors.textTertiary : currentTheme.colors.primary
                      }}
                      className="w-16 h-16 rounded-full overflow-hidden border-2 mr-3"
                    >
                      {latestStory.mediaType === 'image' ? (
                        <Image 
                          source={{ uri: latestStory.mediaUrl }} 
                          className="w-full h-full"
                          style={{ backgroundColor: '#f0f0f0' }}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log('📖 StoriesScreen: Friend story preview failed:', latestStory.mediaUrl, error);
                          }}
                          onLoad={() => {
                            console.log('📖 StoriesScreen: Friend story preview loaded:', latestStory.mediaUrl);
                          }}
                        />
                      ) : latestStory.mediaType === 'video' ? (
                        <View 
                          style={{ backgroundColor: '#333' }}
                          className="w-full h-full items-center justify-center"
                        >
                           <Ionicons name="play" size={20} color="white" />
                        </View>
                      ) : (
                        <View 
                          style={{ backgroundColor: '#f0f0f0' }}
                          className="w-full h-full items-center justify-center"
                        >
                          <Ionicons name="image" size={20} color="#666" />
                        </View>
                      )}
                    </View>
                    
                    <View className="flex-1">
                      <Text style={{ color: currentTheme.colors.text }} className="font-semibold">
                        {latestStory.displayName || latestStory.username}
                      </Text>
                      <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">
                        {formatTimeAgo(latestStory.createdAt)}
                      </Text>
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
          </View>
        )}

          {/* Empty State */}
          {Object.keys(friendStoriesByUser).length === 0 && (
            <View className="items-center py-16">
              <View 
                style={{ backgroundColor: currentTheme.colors.surface }}
                className="backdrop-blur-lg rounded-3xl p-8 mx-4 items-center"
              >
                <Ionicons name="people-outline" size={80} color={currentTheme.colors.text} />
                <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold mt-4 drop-shadow-lg">🎭 No stories yet</Text>
                <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center mt-2 px-4 text-lg">
                  Stories from you and your friends will appear here
                </Text>
                <TouchableOpacity
                  onPress={navigateToCamera}
                  style={{ backgroundColor: currentTheme.colors.surface }}
                  className="backdrop-blur-lg rounded-2xl px-8 py-4 mt-6"
                >
                  <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">🎬 Create Story</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Show message when user has no friends yet */}
          {friends.length === 0 && Object.keys(friendStoriesByUser).filter(userId => user && user.uid && userId !== user.uid).length === 0 && (
            <View className="px-4 py-8">
              <View 
                style={{ backgroundColor: currentTheme.colors.surface }}
                className="backdrop-blur-lg rounded-3xl p-6 items-center"
              >
                <Ionicons name="person-add-outline" size={60} color={currentTheme.colors.text} />
                <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mt-4 text-center">Add Friends</Text>
                <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center mt-2 text-base">
                  Add friends to see their stories here
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('FindFriends')}
                  style={{ backgroundColor: currentTheme.colors.primary }}
                  className="rounded-2xl px-6 py-3 mt-4"
                >
                  <Text style={{ color: currentTheme.colors.background }} className="font-bold">Find Friends</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
} 