import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMockAuthStore as useAuthStore } from '../stores/mockAuthStore';

console.log('🔑 AuthScreen: Component loaded');

export default function AuthScreen() {
  console.log('🔑 AuthScreen: Component rendering...');
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const { signIn, signUp, loading, error, clearError } = useAuthStore();
  
  console.log('🔑 AuthScreen: Auth state:', { loading, error: error || 'none' });

  useEffect(() => {
    console.log('🔑 AuthScreen: Component mounted');
    return () => console.log('🔑 AuthScreen: Component unmounted');
  }, []);

  useEffect(() => {
    if (error) {
      console.log('🔑 AuthScreen: Error detected:', error);
    }
  }, [error]);

  const handleSubmit = async () => {
    console.log('🔑 AuthScreen: handleSubmit called');
    console.log('🔑 AuthScreen: Form data:', { 
      isLogin, 
      email, 
      hasPassword: !!password, 
      username: isLogin ? 'N/A' : username,
    });
    
    clearError();
    
    if (!email || !password) {
      console.log('🔑 AuthScreen: Missing email or password');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isLogin) {
      console.log('🔑 AuthScreen: Attempting sign in...');
      await signIn(email, password);
    } else {
      if (!username) {
        console.log('🔑 AuthScreen: Missing username for signup');
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      console.log('🔑 AuthScreen: Attempting sign up...');
      await signUp(email, password, username);
    }

    if (error) {
      console.log('🔑 AuthScreen: Showing error alert:', error);
      Alert.alert('Error', error);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={['#FFFC00', '#FF6B9D', '#7B68EE']}
        className="flex-1"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center px-8"
        >
          <View className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 mx-4">
            <Text className="text-4xl font-bold text-white text-center mb-8">
              SnapConnect
            </Text>
            <Text className="text-lg text-white/80 text-center mb-8">
              Share Moments. Disappear. Discover More.
            </Text>

            <View className="space-y-4">
              {!isLogin && (
                <>
                  <TextInput
                    className="bg-white/20 rounded-xl px-4 py-3 text-white placeholder-white/70"
                    placeholder="Username"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </>
              )}
              
              <TextInput
                className="bg-white/20 rounded-xl px-4 py-3 text-white placeholder-white/70"
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TextInput
                className="bg-white/20 rounded-xl px-4 py-3 text-white placeholder-white/70"
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              className="bg-white rounded-xl py-4 mt-6"
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text className="text-black font-bold text-center text-lg">
                {loading ? 'Loading...' : (isLogin ? 'Log In' : 'Sign Up')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-4"
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text className="text-white/80 text-center">
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Log in'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
} 