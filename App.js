import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useSupabaseAuthStore as useAuthStore } from './src/stores/supabaseAuthStore';
import AuthScreen from './src/screens/AuthScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import CameraScreen from './src/screens/CameraScreen';
import ChatScreen from './src/screens/ChatScreen';
import StoryViewScreen from './src/screens/StoryViewScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FindFriendsScreen from './src/screens/FindFriendsScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

console.log('📱 App.js: Starting SnapConnect application...');

const Stack = createStackNavigator();

export default function App() {
  console.log('📱 App.js: App component rendering...');
  
  const { user, loading, checkAuthState } = useAuthStore();
  
  console.log('📱 App.js: Auth state:', { 
    user: user ? 'User logged in' : 'No user', 
    loading,
    userId: user?.uid || 'none'
  });

  useEffect(() => {
    console.log('📱 App.js: useEffect - checking auth state...');
    const initAuth = async () => {
      try {
        await checkAuthState();
        console.log('📱 App.js: checkAuthState called successfully');
      } catch (error) {
        console.error('📱 App.js: Error in checkAuthState:', error);
      }
    };
    initAuth();
  }, [checkAuthState]);

  if (loading) {
    console.log('📱 App.js: Showing loading state...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Loading SnapConnect...</Text>
      </View>
    );
  }

  console.log('📱 App.js: Rendering navigation with user:', user ? 'authenticated' : 'not authenticated');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        onReady={() => console.log('📱 App.js: Navigation container ready')}
        onStateChange={(state) => console.log('📱 App.js: Navigation state changed:', state?.routeNames)}
      >
        <StatusBar style="light" />
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            presentation: 'modal'
          }}
        >
          {user ? (
            <>
              {console.log('📱 App.js: Rendering authenticated screens')}
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
              <Stack.Screen 
                name="Camera" 
                component={CameraScreen}
                options={{ 
                  presentation: 'fullScreenModal',
                  animationTypeForReplace: 'push',
                  gestureEnabled: false
                }}
              />
              <Stack.Screen 
                name="Profile" 
                component={ProfileScreen}
                options={{ 
                  presentation: 'card',
                  gestureEnabled: true
                }}
              />
              <Stack.Screen 
                name="Chat" 
                component={ChatScreen}
                options={{ 
                  presentation: 'card',
                  gestureEnabled: true
                }}
              />
              <Stack.Screen 
                name="StoryView" 
                component={StoryViewScreen}
                options={{ 
                  presentation: 'fullScreenModal',
                  gestureEnabled: true
                }}
              />
              <Stack.Screen 
                name="Friends" 
                component={FriendsScreen}
                options={{ 
                  presentation: 'card',
                  gestureEnabled: true
                }}
              />
              <Stack.Screen 
                name="FindFriends" 
                component={FindFriendsScreen}
                options={{ 
                  presentation: 'card',
                  gestureEnabled: true
                }}
              />
              <Stack.Screen 
                name="Discover" 
                component={DiscoverScreen}
                options={{ 
                  presentation: 'card',
                  gestureEnabled: true
                }}
              />
            </>
          ) : (
            <>
              {console.log('📱 App.js: Rendering auth screen')}
              <Stack.Screen name="Auth" component={AuthScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
} 