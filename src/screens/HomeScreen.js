import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import { useNavigation } from '@react-navigation/native';
import UserSwitcher from '../components/UserSwitcher';
// import { useSupabaseSnapStore as useSnapStore } from '../stores/supabaseSnapStore';
// import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const parentNavigation = useNavigation();
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  // Mock data for now
  const snaps = [];
  const friends = [];
  const unreadSnaps = [];

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

  const handleSearchPress = () => {
    console.log('🏠 HomeScreen: Search button pressed');
    // Navigate to search/discover functionality
    navigation.navigate('Discover');
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
      colors={currentTheme.colors.background}
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
            onPress={handleSearchPress}
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
            <Ionicons name="search" size={24} color={currentTheme.colors.accent} />
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

        {/* Snap Map Placeholder */}
        <View className="flex-1 mx-4 mb-4">
          <View 
            style={{ backgroundColor: currentTheme.colors.surface }}
            className="rounded-3xl flex-1 items-center justify-center backdrop-blur-lg"
          >
            <Ionicons name="location" size={80} color={currentTheme.colors.text} />
            <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold mt-4 drop-shadow-lg">🗺️ Snap Map</Text>
            <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center mt-2 px-8 text-lg">
              See where your friends are and discover what's happening around you
            </Text>
            
            {/* Recent Activity */}
            <View className="mt-8 w-full px-6">
              <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mb-4 drop-shadow-lg">✨ Recent Activity</Text>
              
              {unreadSnaps.length > 0 ? (
                <ScrollView className="max-h-40">
                  {unreadSnaps.map((snap) => (
                    <TouchableOpacity
                      key={snap.id}
                      style={{ borderBottomColor: currentTheme.colors.textTertiary }}
                      className="flex-row items-center py-3 border-b"
                      onPress={() => navigation.navigate('Chat', { 
                        chatId: snap.senderId,
                        username: snap.senderUsername 
                      })}
                    >
                      <View 
                        style={{ backgroundColor: currentTheme.colors.surface }}
                        className="w-12 h-12 rounded-full items-center justify-center mr-3"
                      >
                        <Ionicons name="camera" size={24} color={currentTheme.colors.text} />
                      </View>
                      <View className="flex-1">
                        <Text style={{ color: currentTheme.colors.text }} className="font-bold text-lg">
                          {snap.senderUsername}
                        </Text>
                        <Text style={{ color: currentTheme.colors.textSecondary }} className="text-base">
                          Sent you a snap
                        </Text>
                      </View>
                      <View 
                        style={{ backgroundColor: currentTheme.colors.primary }}
                        className="w-4 h-4 rounded-full" 
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View className="items-center py-8">
                  <Text style={{ color: currentTheme.colors.textSecondary }} className="text-center text-lg">
                    🎉 No new snaps - Create your first story!
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
      
      {/* User Switcher Modal */}
      <UserSwitcher 
        visible={showUserSwitcher}
        onClose={() => setShowUserSwitcher(false)} 
      />
    </LinearGradient>
  );
} 