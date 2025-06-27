import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseSnapStore as useSnapStore } from '../stores/supabaseSnapStore';
import { useThemeStore } from '../stores/themeStore';

const { width, height } = Dimensions.get('window');

export default function StoryViewScreen({ navigation, route }) {
  const { stories, initialIndex = 0 } = route.params;
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [viewTimer, setViewTimer] = useState(null);
  const [mediaError, setMediaError] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuthStore();
  const { viewStory } = useSnapStore();
  const { currentTheme } = useThemeStore();

  console.log('📖 StoryViewScreen: Rendering with stories:', stories?.length, 'initialIndex:', initialIndex);
  console.log('📖 StoryViewScreen: Current story index:', currentStoryIndex);

  const advanceStory = () => {
    console.log('📖 StoryViewScreen: Advancing story');
    if (viewTimer) clearTimeout(viewTimer);

    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const goBackStory = () => {
    console.log('📖 StoryViewScreen: Going back a story');
    if (viewTimer) clearTimeout(viewTimer);

    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    console.log('📖 StoryViewScreen: 🔄 useEffect triggered for story index:', currentStoryIndex);
    console.log('📖 StoryViewScreen: 🔄 Stories length:', stories.length);
    
    if (stories.length > 0) {
      const currentStory = stories[currentStoryIndex];
      console.log('📖 StoryViewScreen: 🔄 Current story:', JSON.stringify(currentStory, null, 2));
      
      // Reset media state for new story
      console.log('📖 StoryViewScreen: 🔄 Resetting media state');
      setMediaError(false);
      setMediaLoaded(false);
      setIsLoading(true);
      
      // Mark story as viewed
      const userId = user?.uid || user?.id || user?.userId;
      console.log('📖 StoryViewScreen: 🔄 User ID for viewing:', userId);
      console.log('📖 StoryViewScreen: 🔄 Story views before marking:', currentStory?.views);
      
      if (currentStory && userId && !currentStory.views?.includes(userId)) {
        console.log('📖 StoryViewScreen: 🔄 User has not viewed this story, calling viewStory for:', currentStory.id);
        viewStory(currentStory.id, userId);
      } else {
        console.log('📖 StoryViewScreen: 🔄 Story already viewed or missing data:', { 
          currentStory: !!currentStory, 
          userId, 
          alreadyViewed: currentStory?.views?.includes(userId) 
        });
      }
      
      if (viewTimer) clearTimeout(viewTimer);

      if (currentStory.mediaType === 'image') {
        console.log('📖 StoryViewScreen: 🔄 This is an image, setting 5s timer');
        const timer = setTimeout(advanceStory, 5000);
        setViewTimer(timer);
        } else {
        console.log('📖 StoryViewScreen: 🔄 This is a video, will advance on completion');
        }
      
      return () => {
        console.log('📖 StoryViewScreen: 🔄 Cleaning up timers');
        if (viewTimer) clearTimeout(viewTimer);
      };
    } else {
      console.log('📖 StoryViewScreen: 🔄 No stories available');
    }
  }, [currentStoryIndex]);

  const handleTap = (event) => {
    const { locationX } = event.nativeEvent;
    const isRightSide = locationX > width / 2;
    
    console.log('📖 StoryViewScreen: 👆 Tap detected at x:', locationX, 'right side:', isRightSide);
    console.log('📖 StoryViewScreen: 👆 Current story index:', currentStoryIndex, 'of', stories.length);
    
    if (viewTimer) {
      console.log('📖 StoryViewScreen: 👆 Clearing view timer');
      clearTimeout(viewTimer);
    }
    
    if (isRightSide) {
      advanceStory();
    } else {
      goBackStory();
    }
  };

  const handleBack = () => {
    console.log('📖 StoryViewScreen: Back button pressed');
    if (viewTimer) {
      clearTimeout(viewTimer);
    }
    navigation.goBack();
  };

  const handleMediaError = (error) => {
    console.log('🔴 StoryViewScreen: 🚨 handleMediaError TRIGGERED');
    try {
      const errorMessage = error?.nativeEvent?.error || error;
      console.log('🔴 StoryViewScreen: 🚨 Raw Error Object:', error);
      console.log('🔴 StoryViewScreen: 🚨 Error Message:', errorMessage);
      console.log('🔴 StoryViewScreen: 🚨 Current story URL:', currentStory?.mediaUrl);
    } catch (e) {
      console.log('🔴 StoryViewScreen: 🚨 ERROR WHILE LOGGING ERROR:', e);
    }
    setMediaError(true);
    setMediaLoaded(false);
    setIsLoading(false);
  };

  const handleMediaLoad = () => {
    console.log('📖 StoryViewScreen: ✅ Media Loaded successfully');
    console.log('📖 StoryViewScreen: ✅ Media URL:', currentStory?.mediaUrl);
    setMediaLoaded(true);
    setMediaError(false);
    setIsLoading(false);
  };

  const onLoadStart = () => {
    console.log('📖 StoryViewScreen: 🔄 Media load started');
    console.log('📖 StoryViewScreen: 🔄 Starting to load:', currentStory?.mediaUrl);
    setIsLoading(true);
    setMediaLoaded(false);
    setMediaError(false);
  };

  if (!stories || stories.length === 0) {
    console.log('📖 StoryViewScreen: No stories available, returning empty view');
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="alert-circle" size={64} color="white" />
          <Text style={{ color: 'white', fontSize: 18, marginTop: 16 }}>
            No stories available
          </Text>
          <TouchableOpacity 
            onPress={() => {
              console.log('📖 StoryViewScreen: Go back button pressed');
              navigation.goBack();
            }}
            style={{
              backgroundColor: '#FFFC00',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              marginTop: 16,
            }}
          >
            <Text style={{ color: 'black', fontWeight: 'bold' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStory = stories[currentStoryIndex];

  if (!currentStory) {
    console.warn('📖 StoryViewScreen: currentStory is undefined, going back');
    navigation.goBack();
    return null;
  }

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

  const renderMediaContent = () => {
    // Use different media URL fields based on what's available
    const mediaUrl = currentStory.mediaUrl || currentStory.media_url || currentStory.url;
    const mediaType = currentStory.mediaType || currentStory.media_type || 'image';
    
    console.log('📖 StoryViewScreen: 🎬 Media URL:', mediaUrl);
    console.log('📖 StoryViewScreen: 🎬 Media Type:', mediaType);
    console.log('📖 StoryViewScreen: 🎬 Media states - loaded:', mediaLoaded, 'error:', mediaError, 'loading:', isLoading);

    if (!mediaUrl) {
      console.log('📖 StoryViewScreen: 🎬 No media URL available');
      return (
        <View style={{ 
          width, 
          height: height * 0.8, 
          backgroundColor: 'black',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Ionicons name="image-outline" size={64} color="white" />
          <Text style={{ color: 'white', marginTop: 16 }}>No media available</Text>
        </View>
      );
    }

    if (mediaError) {
      console.log('📖 StoryViewScreen: 🎬 Showing error state');
      return (
        <View style={{ 
          width, 
          height: height * 0.8, 
          backgroundColor: 'black',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
          <Text style={{ color: 'white', marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }}>
            Failed to load media
          </Text>
          <Text style={{ color: '#ccc', marginTop: 8, textAlign: 'center', paddingHorizontal: 32, fontSize: 12 }}>
            {mediaUrl}
          </Text>
        </View>
      );
    }

    if (mediaType === 'video') {
      console.log('📖 StoryViewScreen: 🎬 Rendering video element');
      return (
        <Video
          source={{ uri: mediaUrl }}
          shouldPlay={true}
          isLooping={false}
          resizeMode="contain"
          style={{ 
            width, 
            height: height * 0.8,
            backgroundColor: 'black'
          }}
          onLoadStart={onLoadStart}
          onLoad={(status) => {
            console.log('📖 StoryViewScreen: 🎬 Video onLoad:', status);
            if (status.isLoaded && !mediaLoaded) {
              handleMediaLoad();
            }
          }}
          onReadyForDisplay={() => {
            console.log('📖 StoryViewScreen: 🎬 Video onReadyForDisplay');
            handleMediaLoad();
          }}
          onError={(error) => {
            console.log('📖 StoryViewScreen: 🎬 Video onError event:', error);
            handleMediaError(error);
          }}
          onPlaybackStatusUpdate={(status) => {
            // Only log important status changes to avoid spam
            if (status.isLoaded && !mediaLoaded) {
              console.log('📖 StoryViewScreen: 🎬 Video playback ready');
              handleMediaLoad();
            }
            if (status.didJustFinish) {
              console.log('📖 StoryViewScreen: 🎬 Video finished playing, advancing story');
              advanceStory();
            }
          }}
        />
      );
    } else {
      console.log('📖 StoryViewScreen: 🎬 Rendering image element');
      return (
        <Image
          source={{ uri: mediaUrl }}
          style={{ 
            width, 
            height: height * 0.8,
            backgroundColor: 'black'
          }}
          resizeMode="contain"
          onLoadStart={onLoadStart}
          onLoad={(event) => {
            console.log('📖 StoryViewScreen: 🎬 Image onLoad:', event.nativeEvent);
            handleMediaLoad();
          }}
          onError={(error) => {
            console.log('📖 StoryViewScreen: 🎬 Image onError event:', JSON.stringify(error.nativeEvent, null, 2));
            handleMediaError(error);
          }}
        />
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <TouchableOpacity 
        onPress={handleTap}
        style={{ flex: 1 }}
        activeOpacity={1}
      >
        {/* Header */}
        <View style={{ 
          position: 'absolute', 
          top: 16, 
          left: 0, 
          right: 0, 
          zIndex: 10, 
          paddingHorizontal: 16 
        }}>
          {/* Progress Bars */}
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {stories.map((_, index) => (
              <View
                key={index}
                style={{
                  height: 3,
                  marginHorizontal: 2,
                  borderRadius: 2,
                  flex: 1,
                  backgroundColor: index < currentStoryIndex 
                    ? 'white' 
                    : index === currentStoryIndex 
                    ? 'rgba(255, 255, 255, 0.7)' 
                    : 'rgba(255, 255, 255, 0.3)'
                }}
              />
            ))}
          </View>
          
          {/* User Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="person" size={20} color="white" />
              </View>
              <View>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                  {currentStory.displayName || currentStory.username}
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
                  {formatTimeAgo(currentStory.createdAt)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={handleBack}
              style={{
                width: 40,
                height: 40,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Story Content */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
          {renderMediaContent()}
          
          {/* Loading indicator overlay */}
          {isLoading && !mediaError && currentStory.mediaUrl && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 5,
            }}>
              <Ionicons name="hourglass" size={48} color="#FFFC00" />
              <Text style={{ color: 'white', marginTop: 16, fontSize: 16 }}>Loading story...</Text>
              <Text style={{ color: '#ccc', marginTop: 8, fontSize: 12, textAlign: 'center', paddingHorizontal: 32 }}>
                {currentStory.mediaUrl}
              </Text>
            </View>
          )}
          
          {/* Caption */}
          {currentStory.caption && (
            <View style={{
              position: 'absolute',
              bottom: 80,
              left: 16,
              right: 16,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 16,
              padding: 16,
            }}>
              <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
                {currentStory.caption}
              </Text>
            </View>
          )}
        </View>

        {/* Story Stats */}
        {currentStory.userId === user.uid && (
          <View style={{
            position: 'absolute',
            bottom: 20,
            left: 16,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: 16,
            padding: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="eye" size={16} color="white" />
              <Text style={{ color: 'white', marginLeft: 8 }}>
                {currentStory.views?.length || 0} views
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
} 