import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightTheme = {
  mode: 'light',
  colors: {
    primary: '#FFFC00',
    secondary: '#FF6B9D',
    tertiary: '#7B68EE',
    background: ['#FFFC00', '#FF6B9D', '#7B68EE'],
    surface: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    accent: '#000000',
    shadow: '#000000',
  }
};

const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#FFFC00',
    secondary: '#FF6B9D',
    tertiary: '#7B68EE',
    background: ['#1A1A1A', '#2D1B2D', '#1E1E3D'],
    surface: 'rgba(255, 252, 0, 0.1)',
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    accent: '#000000',
    shadow: '#FFFC00',
  }
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      isDarkMode: false,
      currentTheme: lightTheme,
      
      toggleTheme: () => {
        const { isDarkMode } = get();
        const newIsDarkMode = !isDarkMode;
        const newTheme = newIsDarkMode ? darkTheme : lightTheme;
        
        set({
          isDarkMode: newIsDarkMode,
          currentTheme: newTheme,
        });
        
        console.log('🎨 ThemeStore: Theme toggled to', newIsDarkMode ? 'dark' : 'light');
      },
      
      setTheme: (isDark) => {
        const newTheme = isDark ? darkTheme : lightTheme;
        set({
          isDarkMode: isDark,
          currentTheme: newTheme,
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
    }
  )
); 