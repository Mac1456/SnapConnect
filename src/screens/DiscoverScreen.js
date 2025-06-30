import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../../supabase.config';

const { width } = Dimensions.get('window');

const DiscoverScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const { searchUsers, sendFriendRequest } = useFriendStore();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
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

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user?.id) {
      // Don't search if there's no query or if the user object isn't ready
      if (!user?.id) {
        console.warn('🔍 DiscoverScreen: handleSearch called, but no user ID is available yet.');
      }
      return;
    }
    
    try {
      setLoading(true);
      // Pass the user ID directly to the store function
      const results = await searchUsers(searchQuery.trim(), user.id);
      
      // Map the results to the expected format
      // The store should already be filtering out the current user, but this is a good safeguard
      const mappedResults = results.map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name || u.username || u.email?.split('@')[0] || 'Unknown User',
          email: u.email,
          profilePicture: u.profile_picture
        }));
        
      console.log('🔍 DiscoverScreen: Mapped search results:', mappedResults);
      setSearchResults(mappedResults);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetId) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to send a friend request.');
      return;
    }
    if (!targetId) {
      Alert.alert('Error', 'The target user is invalid.');
      return;
    }

    try {
      setLoading(true);
      console.log(`🔍 DiscoverScreen: Sending friend request to user ID: ${targetId}`);
      
      // Pass the recipient ID and the current user's ID to the store
      await sendFriendRequest(targetId, user.id);
      
      Alert.alert(
        'Success', 
        `Friend request sent!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Friend request error:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (targetUser) => {
    // Navigate to chat with this user
    navigation.navigate('Chat', { 
      recipientId: targetUser.id,
      recipientUsername: targetUser.username || targetUser.displayName,
      recipientName: targetUser.displayName || targetUser.username
    });
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const renderUserItem = ({ item }) => (
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
          {item.username}
        </Text>
        <Text style={{
          fontSize: 14,
          color: currentTheme.colors.textSecondary,
        }}>
          {item.displayName}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: currentTheme.colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
          onPress={() => handleSendFriendRequest(item.id)}
        >
          <Ionicons name="person-add" size={16} color={currentTheme.colors.background} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            backgroundColor: currentTheme.colors.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          }}
          onPress={() => handleSendMessage(item)}
        >
          <Ionicons name="chatbubble" size={16} color={currentTheme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={currentTheme.colors.backgroundGradient || (currentTheme.mode === 'dark' ? ['#000000', '#1A1A1A'] : ['#FFFFFF', '#F8F9FA'])}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View 
          style={{ backgroundColor: currentTheme.colors.surface }}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold">Discover</Text>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
            <Ionicons name="search" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Section */}
        {showSearch && (
          <View className="px-4 py-4" style={{ backgroundColor: currentTheme.colors.surface }}>
            <Text style={{ color: currentTheme.colors.text }} className="text-lg font-bold mb-3">Find Friends</Text>
            
            <View className="flex-row mb-3">
              <TextInput
                style={{ 
                  backgroundColor: currentTheme.colors.background[0],
                  color: currentTheme.colors.text,
                  borderColor: currentTheme.colors.textTertiary
                }}
                className="flex-1 border rounded-xl px-4 py-2 mr-2"
                placeholder="Search by username..."
                placeholderTextColor={currentTheme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                onPress={handleSearch}
                disabled={loading}
                style={{ backgroundColor: currentTheme.colors.primary }}
                className="rounded-xl px-4 py-2"
              >
                <Ionicons name="search" size={20} color={currentTheme.colors.accent} />
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {loading ? (
              <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 16,
                  color: currentTheme.colors.textSecondary,
                }}>
                  Searching...
                </Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            ) : searchQuery.trim() ? (
              <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="search" size={48} color={currentTheme.colors.textSecondary} />
                <Text style={{
                  fontSize: 16,
                  color: currentTheme.colors.textSecondary,
                  marginTop: 10,
                }}>
                  No users found
                </Text>
              </View>
            ) : (
              <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="people" size={48} color={currentTheme.colors.textSecondary} />
                <Text style={{
                  fontSize: 16,
                  color: currentTheme.colors.textSecondary,
                  marginTop: 10,
                }}>
                  Search for people to connect with
                </Text>
              </View>
            )}
          </View>
        )}

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
};

export default DiscoverScreen; 