import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log('🔐 MockAuthStore: Initializing mock auth store...');

// Mock user data storage
const MOCK_USERS_KEY = 'mock_users';
const CURRENT_USER_KEY = 'current_user';

export const useMockAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  // Check authentication state
  checkAuthState: async () => {
    console.log('🔐 MockAuthStore: checkAuthState called');
    try {
      const currentUser = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (currentUser) {
        const user = JSON.parse(currentUser);
        console.log('🔐 MockAuthStore: Found stored user:', user.email);
        set({ user, loading: false, error: null });
      } else {
        console.log('🔐 MockAuthStore: No stored user found');
        set({ user: null, loading: false, error: null });
      }
    } catch (error) {
      console.error('🔐 MockAuthStore: Error checking auth state:', error);
      set({ user: null, loading: false, error: error.message });
    }
  },

  // Sign in user
  signIn: async (email, password) => {
    console.log('🔐 MockAuthStore: signIn called for:', email);
    try {
      set({ loading: true, error: null });
      
      // Get stored users
      const usersData = await AsyncStorage.getItem(MOCK_USERS_KEY);
      const users = usersData ? JSON.parse(usersData) : {};
      
      // Check if user exists and password matches
      if (users[email] && users[email].password === password) {
        const user = {
          uid: users[email].uid,
          email: email,
          username: users[email].username,
          displayName: users[email].displayName,
          createdAt: users[email].createdAt,
          friends: users[email].friends || [],
          snapchatScore: users[email].snapchatScore || 0,
          profilePicture: users[email].profilePicture || null,
          bio: users[email].bio || ''
        };
        
        // Store current user
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        
        console.log('🔐 MockAuthStore: signIn successful');
        set({ user, loading: false, error: null });
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (error) {
      console.error('🔐 MockAuthStore: signIn error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Sign up user
  signUp: async (email, password, username) => {
    console.log('🔐 MockAuthStore: signUp called for:', email, 'username:', username);
    try {
      set({ loading: true, error: null });
      
      // Get stored users
      const usersData = await AsyncStorage.getItem(MOCK_USERS_KEY);
      const users = usersData ? JSON.parse(usersData) : {};
      
      // Check if user already exists
      if (users[email]) {
        throw new Error('User already exists with this email');
      }
      
      // Create new user
      const uid = 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const newUser = {
        uid,
        email,
        password, // In real Firebase, this wouldn't be stored
        username,
        displayName: username,
        createdAt: new Date().toISOString(),
        friends: [],
        snapchatScore: 0,
        profilePicture: null,
        bio: ''
      };
      
      // Store user
      users[email] = newUser;
      await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
      
      // Create user object without password for state
      const userForState = { ...newUser };
      delete userForState.password;
      
      // Store current user
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userForState));
      
      console.log('🔐 MockAuthStore: signUp successful');
      set({ user: userForState, loading: false, error: null });
    } catch (error) {
      console.error('🔐 MockAuthStore: signUp error:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Sign out user
  signOut: async () => {
    console.log('🔐 MockAuthStore: signOut called');
    try {
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
      console.log('🔐 MockAuthStore: signOut successful');
      set({ user: null, error: null });
    } catch (error) {
      console.error('🔐 MockAuthStore: signOut error:', error);
      set({ error: error.message });
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const { user } = get();
      if (user) {
        // Update in users storage
        const usersData = await AsyncStorage.getItem(MOCK_USERS_KEY);
        const users = usersData ? JSON.parse(usersData) : {};
        
        if (users[user.email]) {
          users[user.email] = { ...users[user.email], ...userData };
          await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
        }
        
        // Update current user
        const updatedUser = { ...user, ...userData };
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
        
        set({ user: updatedUser });
      }
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 