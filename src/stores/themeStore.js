import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightTheme = {
  mode: 'light',
  colors: {
    primary: '#FFFC00',
    secondary: '#FF6B9D',
    tertiary: '#7B68EE',
    background: '#FFFFFF',
    backgroundGradient: ['#FFFFFF', '#F8F9FA'],
    surface: '#F8F9FA',
    surfaceElevated: '#FFFFFF',
    surfaceModal: '#FFFFFF',
    text: '#000000',
    textSecondary: '#555555',
    textTertiary: '#777777',
    textInverse: '#000000',
    accent: '#FFFC00',
    border: '#E0E0E0',
    borderStrong: '#CCCCCC',
    borderModal: '#FFFC00',
    shadow: 'rgba(0, 0, 0, 0.15)',
    shadowStrong: 'rgba(0, 0, 0, 0.25)',
    error: '#DC3545',
    success: '#28A745',
    warning: '#FFC107',
    info: '#17A2B8',
    snapYellow: '#FFFC00',
    snapPink: '#FF6B9D',
    snapPurple: '#7B68EE',
    // Chat specific colors
    chatBackground: '#F8F9FA',
    chatBubbleSent: '#FFFC00',
    chatBubbleReceived: '#E9ECEF',
    chatBubbleTextSent: '#000000',
    chatBubbleTextReceived: '#000000',
    chatInputBackground: '#FFFFFF',
    chatInputBorder: '#CCCCCC',
    // Modal overlay
    modalOverlay: 'rgba(0, 0, 0, 0.6)',
    modalBackground: '#FFFFFF',
  }
};

const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#FFFC00',
    secondary: '#FF6B9D',
    tertiary: '#7B68EE',
    background: '#000000',
    backgroundGradient: ['#000000', '#1A1A1A'],
    surface: '#1A1A1A',
    surfaceElevated: '#2A2A2A',
    surfaceModal: '#1F1F1F',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    textTertiary: '#999999',
    textInverse: '#000000',
    accent: '#FFFC00',
    border: '#404040',
    borderStrong: '#666666',
    borderModal: '#FFFC00',
    shadow: 'rgba(255, 252, 0, 0.3)',
    shadowStrong: 'rgba(255, 252, 0, 0.5)',
    error: '#FF4444',
    success: '#4CAF50',
    warning: '#FFC107',
    info: '#2196F3',
    snapYellow: '#FFFC00',
    snapPink: '#FF6B9D',
    snapPurple: '#7B68EE',
    // Chat specific colors
    chatBackground: '#0A0A0A',
    chatBubbleSent: '#FFFC00',
    chatBubbleReceived: '#333333',
    chatBubbleTextSent: '#000000',
    chatBubbleTextReceived: '#FFFFFF',
    chatInputBackground: '#1A1A1A',
    chatInputBorder: '#666666',
    // Modal overlay
    modalOverlay: 'rgba(0, 0, 0, 0.8)',
    modalBackground: '#1F1F1F',
  }
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      isDarkMode: false,
      currentTheme: lightTheme,
      theme: 'light', // For backward compatibility
      
      // Helper function to ensure theme has all required properties
      ensureThemeCompleteness: (theme) => {
        const baseTheme = theme?.mode === 'dark' ? darkTheme : lightTheme;
        return {
          ...baseTheme,
          ...theme,
          colors: {
            ...baseTheme.colors,
            ...theme?.colors,
            // Ensure backgroundGradient always exists
            backgroundGradient: theme?.colors?.backgroundGradient || baseTheme.colors.backgroundGradient
          }
        };
      },
      
      toggleTheme: () => {
        const { isDarkMode, ensureThemeCompleteness } = get();
        const newIsDarkMode = !isDarkMode;
        const newTheme = ensureThemeCompleteness(newIsDarkMode ? darkTheme : lightTheme);
        
        set({
          isDarkMode: newIsDarkMode,
          currentTheme: newTheme,
          theme: newIsDarkMode ? 'dark' : 'light',
        });
        
        console.log('🎨 ThemeStore: Theme toggled to', newIsDarkMode ? 'dark' : 'light');
      },
      
      setTheme: (isDark) => {
        const { ensureThemeCompleteness } = get();
        const newTheme = ensureThemeCompleteness(isDark ? darkTheme : lightTheme);
        set({
          isDarkMode: isDark,
          currentTheme: newTheme,
          theme: isDark ? 'dark' : 'light',
        });
      },
    }),
    {
      name: 'theme-storage',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure currentTheme has all required properties after rehydration
          const ensureThemeCompleteness = (theme) => {
            const baseTheme = theme?.mode === 'dark' ? darkTheme : lightTheme;
            return {
              ...baseTheme,
              ...theme,
              colors: {
                ...baseTheme.colors,
                ...theme?.colors,
                backgroundGradient: theme?.colors?.backgroundGradient || baseTheme.colors.backgroundGradient
              }
            };
          };
          
          state.currentTheme = ensureThemeCompleteness(state.currentTheme);
          state.ensureThemeCompleteness = ensureThemeCompleteness;
          console.log('🎨 ThemeStore: Theme rehydrated and migrated');
        }
      },
    }
  )
); 