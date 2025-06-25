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
  
  const { user } = useAuthStore();
  const { viewStory } = useSnapStore();
  const { currentTheme } = useThemeStore();

  console.log('📖 StoryViewScreen: Rendering with stories:', stories?.length, 'initialIndex:', initialIndex);
  console.log('📖 StoryViewScreen: Current story index:', currentStoryIndex);

  useEffect(() => {
    if (stories.length > 0) {
      const currentStory = stories[currentStoryIndex];
      console.log('📖 StoryViewScreen: Current story:', currentStory);
      
      // Reset media state for new story
      setMediaError(false);
      setMediaLoaded(false);
      
      // Mark story as viewed
      const userId = user?.uid || user?.id || user?.userId;
      console.log('📖 StoryViewScreen: Marking story as viewed by user:', userId);
      
      if (currentStory && userId && !currentStory.views?.includes(userId)) {
        console.log('📖 StoryViewScreen: Calling viewStory for:', currentStory.id);
        viewStory(currentStory.id, userId);
      }
      
      // Start timer for auto-advance (stories show for 5 seconds)
      const timer = setTimeout(() => {
        console.log('📖 StoryViewScreen: Auto-advancing story');
        if (currentStoryIndex < stories.length - 1) {
          setCurrentStoryIndex(currentStoryIndex + 1);
        } else {
          console.log('📖 StoryViewScreen: Last story, going back');
          navigation.goBack();
        }
      }, 5000);
      
      setViewTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [currentStoryIndex]);

  const handleTap = (event) => {
    const { locationX } = event.nativeEvent;
    const isRightSide = locationX > width / 2;
    
    console.log('📖 StoryViewScreen: Tap detected, right side:', isRightSide);
    
    if (viewTimer) {
      clearTimeout(viewTimer);
    }
    
    if (isRightSide) {
      // Tap right side - next story
      if (currentStoryIndex < stories.length - 1) {
        console.log('📖 StoryViewScreen: Moving to next story');
        setCurrentStoryIndex(currentStoryIndex + 1);
      } else {
        console.log('📖 StoryViewScreen: Last story, going back');
        navigation.goBack();
      }
    } else {
      // Tap left side - previous story
      if (currentStoryIndex > 0) {
        console.log('📖 StoryViewScreen: Moving to previous story');
        setCurrentStoryIndex(currentStoryIndex - 1);
      } else {
        console.log('📖 StoryViewScreen: First story, going back');
        navigation.goBack();
      }
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
    console.error('📖 StoryViewScreen: Media Error:', error);
    console.error('📖 StoryViewScreen: Media Error Details:', JSON.stringify(error, null, 2));
    setMediaError(true);
    setMediaLoaded(false);
  };

  const handleMediaLoad = () => {
    console.log('📖 StoryViewScreen: Media Loaded successfully');
    setMediaLoaded(true);
    setMediaError(false);
  };

  const onLoadStart = () => {
    console.log('📖 StoryViewScreen: Media load started');
    setMediaLoaded(false);
    setMediaError(false);
  };

  if (!stories || stories.length === 0) {
    console.log('📖 StoryViewScreen: No stories available');
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="alert-circle" size={64} color={currentTheme.colors.textSecondary} />
          <Text style={{ color: currentTheme.colors.text, fontSize: 18, marginTop: 16 }}>
            No stories available
          </Text>
          <TouchableOpacity 
            onPress={() => {
              console.log('📖 StoryViewScreen: Go back button pressed');
              navigation.goBack();
            }}
            style={{
              backgroundColor: currentTheme.colors.snapYellow,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              marginTop: 20,
            }}
          >
            <Text style={{ color: currentTheme.colors.textInverse, fontWeight: 'bold' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStory = stories[currentStoryIndex];
  console.log('📖 StoryViewScreen: Rendering story:', currentStory);

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
    
    console.log('📖 StoryViewScreen: Media URL:', mediaUrl);
    console.log('📖 StoryViewScreen: Media Type:', mediaType);
    console.log('📖 StoryViewScreen: Media loaded:', mediaLoaded, 'Error:', mediaError);

    // Check if media URL exists and is valid
    if (!mediaUrl || mediaUrl.trim() === '') {
      console.log('📖 StoryViewScreen: No media URL available');
      return (
        <View style={{ 
          width, 
          height: height * 0.8, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: currentTheme.colors.surface,
        }}>
          <Ionicons name="image-outline" size={80} color={currentTheme.colors.textSecondary} />
          <Text style={{ color: currentTheme.colors.text, fontSize: 18, marginTop: 16 }}>
            Media not available
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
            This story's media could not be loaded
          </Text>
        </View>
      );
    }

    if (mediaError) {
      console.log('📖 StoryViewScreen: Showing media error state');
      return (
        <View style={{ 
          width, 
          height: height * 0.8, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: currentTheme.colors.surface,
        }}>
          <Ionicons name="alert-circle" size={80} color={currentTheme.colors.error} />
          <Text style={{ color: currentTheme.colors.text, fontSize: 18, marginTop: 16 }}>
            Failed to load media
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
            URL: {mediaUrl}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              console.log('📖 StoryViewScreen: Retry button pressed');
              setMediaError(false);
              setMediaLoaded(false);
            }}
            style={{
              backgroundColor: currentTheme.colors.snapYellow,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              marginTop: 16,
            }}
          >
            <Text style={{ color: currentTheme.colors.textInverse, fontWeight: 'bold' }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Show loading state
    if (!mediaLoaded && !mediaError) {
      console.log('📖 StoryViewScreen: Showing loading state');
      return (
        <View style={{ 
          width, 
          height: height * 0.8, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: currentTheme.colors.surface,
        }}>
          <Ionicons name="hourglass" size={80} color={currentTheme.colors.snapYellow} />
          <Text style={{ color: currentTheme.colors.text, fontSize: 18, marginTop: 16 }}>
            Loading story...
          </Text>
        </View>
      );
    }

    // Render media based on type
    if (mediaType === 'video') {
      console.log('📖 StoryViewScreen: Rendering video');
      return (
        <Video
          source={{ uri: mediaUrl }}
          rate={1.0}
          volume={1.0}
          isMuted={false}
          resizeMode="contain"
          shouldPlay={true}
          isLooping={false}
          style={{ width, height: height * 0.8 }}
          onLoad={handleMediaLoad}
          onError={handleMediaError}
          onLoadStart={onLoadStart}
        />
      );
    } else {
      console.log('📖 StoryViewScreen: Rendering image');
      return (
        <Image
          source={{ uri: mediaUrl }}
          style={{ width, height: height * 0.8 }}
          resizeMode="contain"
          onLoad={handleMediaLoad}
          onError={handleMediaError}
          onLoadStart={onLoadStart}
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {renderMediaContent()}
          
          {/* Loading indicator */}
          {!mediaLoaded && !mediaError && currentStory.mediaUrl && (
            <View style={{
              position: 'absolute',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 10,
              padding: 20,
            }}>
              <Ionicons name="hourglass" size={32} color="white" />
              <Text style={{ color: 'white', marginTop: 8 }}>Loading...</Text>
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