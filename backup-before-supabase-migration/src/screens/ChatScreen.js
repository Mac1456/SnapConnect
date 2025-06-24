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
import { useAuthStore } from '../stores/authStore';
import { useSnapStore } from '../stores/snapStore';

const { width, height } = Dimensions.get('window');

export default function ChatScreen({ navigation, route }) {
  const { chatId, username } = route.params;
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
  const [viewTimer, setViewTimer] = useState(null);
  
  const { user } = useAuthStore();
  const { snaps, markSnapOpened } = useSnapStore();

  // Filter snaps for this chat
  const chatSnaps = snaps.filter(snap => 
    snap.senderId === chatId && !snap.opened
  );

  useEffect(() => {
    if (chatSnaps.length === 0) {
      Alert.alert('No Snaps', 'No unread snaps from this user', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [chatSnaps.length]);

  useEffect(() => {
    if (chatSnaps.length > 0) {
      const currentSnap = chatSnaps[currentSnapIndex];
      
      // Mark snap as opened
      markSnapOpened(currentSnap.id);
      
      // Start timer for disappearing
      const timer = setTimeout(() => {
        if (currentSnapIndex < chatSnaps.length - 1) {
          setCurrentSnapIndex(currentSnapIndex + 1);
        } else {
          navigation.goBack();
        }
      }, (currentSnap.timer || 3) * 1000);
      
      setViewTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [currentSnapIndex, chatSnaps]);

  const handleTap = () => {
    if (viewTimer) {
      clearTimeout(viewTimer);
    }
    
    if (currentSnapIndex < chatSnaps.length - 1) {
      setCurrentSnapIndex(currentSnapIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (viewTimer) {
      clearTimeout(viewTimer);
    }
    navigation.goBack();
  };

  if (chatSnaps.length === 0) {
    return null;
  }

  const currentSnap = chatSnaps[currentSnapIndex];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <TouchableOpacity 
        onPress={handleTap}
        className="flex-1"
        activeOpacity={1}
      >
        {/* Header */}
        <View className="absolute top-4 left-0 right-0 z-10 flex-row items-center justify-between px-4">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View className="flex-1 mx-4">
            <Text className="text-white font-bold text-center">{username}</Text>
            <View className="flex-row justify-center mt-1">
              {chatSnaps.map((_, index) => (
                <View
                  key={index}
                  className={`h-1 mx-1 rounded-full ${
                    index <= currentSnapIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                  style={{ width: width / chatSnaps.length - 8 }}
                />
              ))}
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Camera')}
            className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
          >
            <Ionicons name="camera" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Snap Content */}
        <View className="flex-1 items-center justify-center">
          {currentSnap.mediaType === 'image' ? (
            <Image
              source={{ uri: currentSnap.mediaUrl }}
              style={{ width, height: height * 0.8 }}
              resizeMode="contain"
            />
          ) : (
            <Video
              source={{ uri: currentSnap.mediaUrl }}
              style={{ width, height: height * 0.8 }}
              resizeMode="contain"
              shouldPlay
              isLooping={false}
              useNativeControls={false}
            />
          )}
          
          {/* Caption */}
          {currentSnap.caption && (
            <View className="absolute bottom-20 left-4 right-4 bg-black/50 rounded-2xl p-4">
              <Text className="text-white text-center text-lg">
                {currentSnap.caption}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Actions */}
        <View className="absolute bottom-8 left-0 right-0 flex-row justify-center space-x-8">
          <TouchableOpacity className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
            <Ionicons name="chatbubble" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('Camera')}
            className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="camera" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
} 