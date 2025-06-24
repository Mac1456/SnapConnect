import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const { width } = Dimensions.get('window');

export default function DiscoverScreen({ navigation }) {
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  
  // Mock data for discover content - In production, this would come from Firebase
  const [discoverContent] = useState([
    {
      id: '1',
      title: 'Trending Now',
      type: 'trending',
      items: [
        { id: '1', title: 'College Life', thumbnail: 'https://picsum.photos/300/400?random=1' },
        { id: '2', title: 'Weekend Vibes', thumbnail: 'https://picsum.photos/300/400?random=2' },
        { id: '3', title: 'Study Group', thumbnail: 'https://picsum.photos/300/400?random=3' },
      ]
    },
    {
      id: '2',
      title: 'Popular This Week',
      type: 'popular',
      items: [
        { id: '4', title: 'Campus Events', thumbnail: 'https://picsum.photos/300/400?random=4' },
        { id: '5', title: 'Friend Hangouts', thumbnail: 'https://picsum.photos/300/400?random=5' },
        { id: '6', title: 'Group Activities', thumbnail: 'https://picsum.photos/300/400?random=6' },
      ]
    },
    {
      id: '3',
      title: 'For You',
      type: 'recommended',
      description: 'Content based on your interests and friend activity',
      items: [
        { id: '7', title: 'Similar Groups', thumbnail: 'https://picsum.photos/300/400?random=7' },
        { id: '8', title: 'Nearby Events', thumbnail: 'https://picsum.photos/300/400?random=8' },
        { id: '9', title: 'Friend Suggestions', thumbnail: 'https://picsum.photos/300/400?random=9' },
      ]
    }
  ]);

  // Placeholder for future RAG features
  const ragPlaceholders = [
    {
      title: 'AI Caption Suggestions',
      description: 'Get personalized caption ideas for your group photos',
      icon: 'bulb',
      color: currentTheme.colors.primary,
      comingSoon: true
    },
    {
      title: 'Activity Recommendations',
      description: 'Discover activities your friend group might enjoy',
      icon: 'compass',
      color: currentTheme.colors.tertiary,
      comingSoon: true
    },
    {
      title: 'Memory Prompts',
      description: 'Story ideas based on your shared experiences',
      icon: 'heart',
      color: currentTheme.colors.secondary,
      comingSoon: true
    },
    {
      title: 'Event Reminders',
      description: 'Smart notifications for friend group milestones',
      icon: 'calendar',
      color: currentTheme.colors.primary,
      comingSoon: true
    }
  ];

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
          <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold">Discover</Text>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1">
          {/* Coming Soon - RAG Features */}
          <View className="px-4 mb-6 mt-4">
            <Text style={{ color: currentTheme.colors.text }} className="text-lg font-bold mb-3">Coming Soon: AI Features</Text>
            <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm mb-4">
              Personalized experiences powered by AI that understands your friend group.
            </Text>
            
            <View className="space-y-3">
              {ragPlaceholders.map((feature, index) => (
                <TouchableOpacity
                  key={index}
                  style={{ 
                    backgroundColor: currentTheme.colors.surface,
                    borderLeftColor: feature.color,
                    borderLeftWidth: 4
                  }}
                  className="rounded-2xl p-4 flex-row items-center"
                  disabled={feature.comingSoon}
                >
                  <View 
                    style={{ backgroundColor: feature.color }}
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  >
                    <Ionicons name={feature.icon} size={24} color={currentTheme.colors.accent} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">{feature.title}</Text>
                      {feature.comingSoon && (
                        <View 
                          style={{ backgroundColor: currentTheme.colors.primary }}
                          className="rounded-full px-2 py-1 ml-2"
                        >
                          <Text style={{ color: currentTheme.colors.accent }} className="text-xs font-bold">SOON</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm">{feature.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Current Discover Content */}
          {discoverContent.map((section) => (
            <View key={section.id} className="mb-8">
              <View className="px-4 mb-4">
                <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold">{section.title}</Text>
                {section.description && (
                  <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm mt-1">{section.description}</Text>
                )}
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-4"
              >
                {section.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    className="mr-4 w-32"
                  >
                    <View className="w-32 h-48 rounded-2xl overflow-hidden">
                      <Image
                        source={{ uri: item.thumbnail }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      <View className="absolute inset-0 bg-black/30" />
                      <View className="absolute bottom-0 left-0 right-0 p-3">
                        <Text className="text-white font-bold text-sm">
                          {item.title}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}

          {/* Explore Categories */}
          <View className="px-4 mb-8">
            <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mb-4">Explore</Text>
            
            <View className="flex-row flex-wrap">
              {[
                { name: 'Friends', icon: 'people', color: currentTheme.colors.tertiary },
                { name: 'Groups', icon: 'albums', color: currentTheme.colors.secondary },
                { name: 'Events', icon: 'calendar', color: currentTheme.colors.primary },
                { name: 'Places', icon: 'location', color: currentTheme.colors.tertiary },
              ].map((category) => (
                <TouchableOpacity
                  key={category.name}
                  className="w-1/2 p-2"
                >
                  <View 
                    style={{ backgroundColor: category.color }}
                    className="rounded-2xl p-6 items-center justify-center h-32"
                  >
                    <View 
                      style={{ backgroundColor: currentTheme.colors.surface }}
                      className="w-16 h-16 rounded-full items-center justify-center mb-3"
                    >
                      <Ionicons name={category.icon} size={32} color={currentTheme.colors.text} />
                    </View>
                    <Text style={{ color: currentTheme.colors.text }} className="font-bold">{category.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
} 