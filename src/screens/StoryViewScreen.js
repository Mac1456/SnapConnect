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

const { width, height } = Dimensions.get('window');

export default function StoryViewScreen({ navigation, route }) {
  const { stories, initialIndex = 0 } = route.params;
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [viewTimer, setViewTimer] = useState(null);
  
  const { user } = useAuthStore();
  const { viewStory } = useSnapStore();

  useEffect(() => {
    if (stories.length > 0) {
      const currentStory = stories[currentStoryIndex];
      
      // Mark story as viewed
      if (!currentStory.views?.includes(user.uid)) {
        viewStory(currentStory.id, user.uid);
      }
      
      // Start timer for auto-advance (stories show for 5 seconds)
      const timer = setTimeout(() => {
        if (currentStoryIndex < stories.length - 1) {
          setCurrentStoryIndex(currentStoryIndex + 1);
        } else {
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
    
    if (viewTimer) {
      clearTimeout(viewTimer);
    }
    
    if (isRightSide) {
      // Tap right side - next story
      if (currentStoryIndex < stories.length - 1) {
        setCurrentStoryIndex(currentStoryIndex + 1);
      } else {
        navigation.goBack();
      }
    } else {
      // Tap left side - previous story
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex(currentStoryIndex - 1);
      } else {
        navigation.goBack();
      }
    }
  };

  const handleBack = () => {
    if (viewTimer) {
      clearTimeout(viewTimer);
    }
    navigation.goBack();
  };

  if (!stories || stories.length === 0) {
    return null;
  }

  const currentStory = stories[currentStoryIndex];
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
    <SafeAreaView className="flex-1 bg-black">
      <TouchableOpacity 
        onPress={handleTap}
        className="flex-1"
        activeOpacity={1}
      >
        {/* Header */}
        <View className="absolute top-4 left-0 right-0 z-10 px-4">
          {/* Progress Bars */}
          <View className="flex-row mb-4">
            {stories.map((_, index) => (
              <View
                key={index}
                className={`h-1 mx-1 rounded-full flex-1 ${
                  index < currentStoryIndex 
                    ? 'bg-white' 
                    : index === currentStoryIndex 
                    ? 'bg-white/70' 
                    : 'bg-white/30'
                }`}
              />
            ))}
          </View>
          
          {/* User Info */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-gray-600 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={20} color="white" />
              </View>
              <View>
                <Text className="text-white font-bold">
                  {currentStory.displayName || currentStory.username}
                </Text>
                <Text className="text-white/70 text-sm">
                  {formatTimeAgo(currentStory.createdAt)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={handleBack}
              className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Story Content */}
        <View className="flex-1 items-center justify-center">
          {currentStory.mediaUrl ? (
            currentStory.mediaType === 'image' ? (
              <Image
                source={{ uri: currentStory.mediaUrl }}
                style={{ width, height: height * 0.8 }}
                resizeMode="contain"
                onError={(error) => console.error('StoryView Image Error:', error)}
                onLoad={() => console.log('StoryView Image Loaded:', currentStory.mediaUrl)}
              />
            ) : (
              <Video
                source={{ uri: currentStory.mediaUrl }}
                style={{ width, height: height * 0.8 }}
                resizeMode="contain"
                shouldPlay
                isLooping={false}
                useNativeControls={false}
                onError={(error) => console.error('StoryView Video Error:', error)}
                onLoad={() => console.log('StoryView Video Loaded:', currentStory.mediaUrl)}
              />
            )
          ) : (
            <View className="items-center justify-center" style={{ width, height: height * 0.8 }}>
              <Ionicons name="image-outline" size={80} color="white" />
              <Text className="text-white text-lg mt-4">Media not available</Text>
            </View>
          )}
          
          {/* Caption */}
          {currentStory.caption && (
            <View className="absolute bottom-20 left-4 right-4 bg-black/50 rounded-2xl p-4">
              <Text className="text-white text-center text-lg">
                {currentStory.caption}
              </Text>
            </View>
          )}
        </View>

        {/* Story Stats */}
        {currentStory.userId === user.uid && (
          <View className="absolute bottom-8 left-4 right-4 bg-black/50 rounded-2xl p-4">
            <View className="flex-row items-center">
              <Ionicons name="eye" size={16} color="white" />
              <Text className="text-white ml-2">
                {currentStory.views?.length || 0} views
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
} 