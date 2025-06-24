import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ChatsScreen from '../screens/ChatsScreen';
import StoriesScreen from '../screens/StoriesScreen';
import DiscoverScreen from '../screens/DiscoverScreen';

const Tab = createBottomTabNavigator();

// Dummy component for Camera tab since we handle navigation manually
const CameraTabScreen = () => null;

const CustomTabButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={{
      top: -15,
      justifyContent: 'center',
      alignItems: 'center',
      width: 65,
      height: 65,
      borderRadius: 32.5,
      backgroundColor: '#FFFC00',
      shadowColor: '#FF6B9D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      marginHorizontal: 10,
    }}
    onPress={onPress}
  >
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Ionicons 
        name="camera" 
        size={32} 
        color="#000000"
      />
    </View>
  </TouchableOpacity>
);

export default function MainTabNavigator({ navigation }) {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'location' : 'location-outline';
          } else if (route.name === 'Chats') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Camera') {
            iconName = 'camera';
          } else if (route.name === 'Stories') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'compass' : 'compass-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#FFFFFF80',
        tabBarStyle: {
          backgroundColor: '#FF6B9D',
          borderTopColor: '#FFFC00',
          borderTopWidth: 2,
          paddingBottom: Platform.OS === 'ios' ? 20 : 15,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 75,
          marginBottom: Platform.OS === 'ios' ? 0 : 10,
          marginHorizontal: 10,
          borderRadius: 25,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 0 : 10,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarItemStyle: {
            flex: 1,
            paddingVertical: 5,
          },
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen}
        options={{
          tabBarItemStyle: {
            flex: 1,
            paddingVertical: 5,
          },
        }}
      />
      <Tab.Screen 
        name="Camera" 
        component={CameraTabScreen}
        listeners={({ navigation: tabNavigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            console.log('🎥 MainTabNavigator: Camera tab pressed, navigating to Camera screen...');
            // Use the correct navigation context to navigate to Camera screen
            const parentNavigation = tabNavigation.getParent();
            if (parentNavigation) {
              parentNavigation.navigate('Camera');
            } else {
              console.error('🎥 MainTabNavigator: Parent navigation not found!');
            }
          },
        })}
        options={{
          tabBarButton: (props) => <CustomTabButton {...props} />,
          tabBarItemStyle: {
            flex: 0,
            width: 85,
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
      />
      <Tab.Screen 
        name="Stories" 
        component={StoriesScreen}
        options={{
          tabBarItemStyle: {
            flex: 1,
            paddingVertical: 5,
          },
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          tabBarItemStyle: {
            flex: 1,
            paddingVertical: 5,
          },
        }}
      />
    </Tab.Navigator>
  );
} 