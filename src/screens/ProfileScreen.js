import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  const { user, signOut, updateProfile } = useAuthStore();
  const { isDarkMode, currentTheme, toggleTheme } = useThemeStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.display_name || user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editBio, setEditBio] = useState(user?.bio || user?.display_bio || '');
  const [profileImage, setProfileImage] = useState(user?.profile_picture || user?.profileImage || null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Update state when user data changes
  React.useEffect(() => {
    if (user) {
      console.log('👤 ProfileScreen: User data changed, updating state:', {
        display_name: user?.display_name,
        displayName: user?.displayName,
        profile_picture: user?.profile_picture,
        profileImage: user?.profileImage,
        email: user?.email,
        bio: user?.bio
      });
      setEditDisplayName(user?.display_name || user?.displayName || '');
      setEditEmail(user?.email || '');
      setEditBio(user?.bio || user?.display_bio || '');
      setProfileImage(user?.profile_picture || user?.profileImage || null);
    }
  }, [user]);

  const getProfilePicture = React.useCallback(() => {
    const pic = profileImage || user?.profile_picture || user?.profileImage;
    return pic;
  }, [profileImage, user?.profile_picture, user?.profileImage]);

  const getDefaultAvatar = React.useCallback(() => {
    const displayName = user?.display_name || user?.displayName || user?.username || user?.email?.split('@')[0] || 'User';
    const initials = displayName.split(' ').map(name => name.charAt(0).toUpperCase()).join('').slice(0, 2);
    console.log('👤 ProfileScreen: Getting default avatar for', displayName, ':', initials);
    return initials;
  }, [user?.display_name, user?.displayName, user?.username, user?.email]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              console.log('👤 ProfileScreen: User logged out successfully');
            } catch (error) {
              console.error('👤 ProfileScreen: Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleSaveProfile = async () => {
    try {
      console.log('👤 ProfileScreen: Saving profile with data:', {
        displayName: editDisplayName,
        email: editEmail,
        bio: editBio,
        profileImage: profileImage,
      });
      
      const result = await updateProfile({
        displayName: editDisplayName,
        email: editEmail,
        bio: editBio,
        profileImage: profileImage,
      });
      
      if (result && result.success) {
        setIsEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully!');
        console.log('👤 ProfileScreen: Profile updated successfully');
        
        // Force refresh the profile image state with the updated user data
        if (result.user) {
          setProfileImage(result.user.profile_picture || result.user.profilePicture);
          setRefreshKey(prev => prev + 1); // Force re-render
        }
      } else {
        Alert.alert('Error', result?.error || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('👤 ProfileScreen: Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleSelectProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const selectedImageUri = result.assets[0].uri;
        console.log('👤 ProfileScreen: Profile image selected:', selectedImageUri);
        setProfileImage(selectedImageUri);
        console.log('👤 ProfileScreen: Profile image state updated');
      }
    } catch (error) {
      console.error('👤 ProfileScreen: Image picker error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Account deletion will be available in a future update.');
          }
        }
      ]
    );
  };

  const handlePrivacySettings = () => {
    Alert.alert(
      'Privacy Settings',
      'Privacy settings panel coming soon!',
      [{ text: 'OK' }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'Need help?\n\n• Email: support@snapconnect.app\n• Help Center: Coming Soon\n• FAQ: Coming Soon',
      [{ text: 'OK' }]
    );
  };

  return (
    <LinearGradient
      colors={currentTheme.colors.backgroundGradient || (currentTheme.mode === 'dark' ? ['#000000', '#1A1A1A'] : ['#FFFFFF', '#F8F9FA'])}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
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
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.accent} />
          </TouchableOpacity>
          
          <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold drop-shadow-lg">👤 Profile</Text>
          
          <TouchableOpacity 
            onPress={() => setIsEditModalVisible(true)}
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
            <Ionicons name="create-outline" size={24} color={currentTheme.colors.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4">
          {/* User Info Card */}
          <View style={{ backgroundColor: currentTheme.colors.surface }} className="backdrop-blur-lg rounded-3xl p-6 mb-6 mt-4">
            <View className="items-center mb-6">
              <TouchableOpacity onPress={handleSelectProfileImage}>
                <View 
                  style={{ 
                    backgroundColor: getProfilePicture() ? 'transparent' : currentTheme.colors.primary,
                    borderColor: currentTheme.colors.textTertiary,
                    overflow: 'hidden'
                  }}
                  className="w-24 h-24 rounded-full items-center justify-center mb-4 border-4"
                >
                  {getProfilePicture() ? (
                    <Image 
                      key={`profile-${refreshKey}`}
                      source={{ uri: getProfilePicture() }} 
                      className="w-full h-full rounded-full" 
                      onError={(error) => {
                        console.log('👤 ProfileScreen: Profile image load error:', error);
                      }}
                      onLoad={() => {
                        console.log('👤 ProfileScreen: Profile image loaded successfully');
                      }}
                    />
                  ) : (
                    <Text style={{ color: currentTheme.colors.background }} className="text-2xl font-bold">{getDefaultAvatar()}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold drop-shadow-lg">
                {user?.display_name || user?.displayName || 'SnapConnect User'}
              </Text>
              {(user?.bio || user?.display_bio) && (
                <Text style={{ color: currentTheme.colors.textTertiary }} className="text-center mt-2 px-4">
                  {user?.bio || user?.display_bio}
                </Text>
              )}
              <Text style={{ color: currentTheme.colors.textSecondary }} className="text-lg mt-1">
                {user?.email || 'user@snapconnect.app'}
              </Text>
              <View className="flex-row mt-4 space-x-6">
                <View className="items-center">
                  <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold">0</Text>
                  <Text style={{ color: currentTheme.colors.textSecondary }}>Stories</Text>
                </View>
                <View className="items-center">
                  <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold">0</Text>
                  <Text style={{ color: currentTheme.colors.textSecondary }}>Friends</Text>
                </View>
                <View className="items-center">
                  <Text style={{ color: currentTheme.colors.text }} className="text-2xl font-bold">0</Text>
                  <Text style={{ color: currentTheme.colors.textSecondary }}>Snaps</Text>
                </View>
              </View>
            </View>
          </View>

          {/* App Settings */}
          <View style={{ backgroundColor: currentTheme.colors.surface }} className="backdrop-blur-lg rounded-3xl p-6 mb-4">
            <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mb-4 drop-shadow-lg">⚙️ App Settings</Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="notifications-outline" size={24} color={currentTheme.colors.text} />
                  <Text style={{ color: currentTheme.colors.text }} className="text-lg ml-3">Push Notifications</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#767577', true: currentTheme.colors.primary }}
                  thumbColor={notificationsEnabled ? currentTheme.colors.secondary : '#f4f3f4'}
                />
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={24} color={currentTheme.colors.text} />
                  <Text style={{ color: currentTheme.colors.text }} className="text-lg ml-3">Location Services</Text>
                </View>
                <Switch
                  value={locationEnabled}
                  onValueChange={setLocationEnabled}
                  trackColor={{ false: '#767577', true: currentTheme.colors.primary }}
                  thumbColor={locationEnabled ? currentTheme.colors.secondary : '#f4f3f4'}
                />
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="moon-outline" size={24} color={currentTheme.colors.text} />
                  <Text style={{ color: currentTheme.colors.text }} className="text-lg ml-3">Dark Mode</Text>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#767577', true: currentTheme.colors.primary }}
                  thumbColor={isDarkMode ? currentTheme.colors.secondary : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* Account Management */}
          <View style={{ backgroundColor: currentTheme.colors.surface }} className="backdrop-blur-lg rounded-3xl p-6 mb-4">
            <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mb-4 drop-shadow-lg">🔐 Account</Text>
            
            <TouchableOpacity 
              className="flex-row items-center py-3"
              onPress={handlePrivacySettings}
            >
              <Ionicons name="shield-outline" size={24} color={currentTheme.colors.text} />
              <Text style={{ color: currentTheme.colors.text }} className="text-lg ml-3 flex-1">Privacy Settings</Text>
              <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-3"
              onPress={() => Alert.alert('Data Export', 'Data export feature coming soon!')}
            >
              <Ionicons name="download-outline" size={24} color={currentTheme.colors.text} />
              <Text style={{ color: currentTheme.colors.text }} className="text-lg ml-3 flex-1">Export My Data</Text>
              <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-3"
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={24} color={currentTheme.colors.secondary} />
              <Text style={{ color: currentTheme.colors.secondary }} className="text-lg ml-3 flex-1">Delete Account</Text>
              <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Support & Info */}
          <View style={{ backgroundColor: currentTheme.colors.surface }} className="backdrop-blur-lg rounded-3xl p-6 mb-4">
            <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold mb-4 drop-shadow-lg">❓ Support & Info</Text>
            
            <TouchableOpacity 
              className="flex-row items-center py-3"
              onPress={handleSupport}
            >
              <Ionicons name="help-circle-outline" size={24} color={currentTheme.colors.text} />
              <Text style={{ color: currentTheme.colors.text }} className="text-lg ml-3 flex-1">Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-3"
              onPress={() => Alert.alert('About', 'SnapConnect v1.0.0\n\nBuilt with ❤️ using React Native & Expo')}
            >
              <Ionicons name="information-circle-outline" size={24} color={currentTheme.colors.text} />
              <Text style={{ color: currentTheme.colors.text }} className="text-lg ml-3 flex-1">About SnapConnect</Text>
              <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-3"
              onPress={() => Alert.alert('Legal', 'Terms of Service and Privacy Policy coming soon!')}
            >
              <Ionicons name="document-text-outline" size={24} color={currentTheme.colors.text} />
              <Text style={{ color: currentTheme.colors.text }} className="text-lg ml-3 flex-1">Terms & Privacy</Text>
              <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            onPress={handleLogout}
            style={{ backgroundColor: currentTheme.colors.surface }}
            className="backdrop-blur-lg rounded-3xl p-6 mb-8"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={24} color={currentTheme.colors.secondary} />
              <Text style={{ color: currentTheme.colors.secondary }} className="text-lg font-bold ml-3">Logout</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <LinearGradient
            colors={currentTheme.colors.backgroundGradient || (currentTheme.mode === 'dark' ? ['#000000', '#1A1A1A'] : ['#FFFFFF', '#F8F9FA'])}
            className="flex-1"
          >
            <SafeAreaView className="flex-1">
              <View className="flex-row items-center justify-between px-4 py-3">
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Text style={{ color: currentTheme.colors.text }} className="text-lg">Cancel</Text>
                </TouchableOpacity>
                <Text style={{ color: currentTheme.colors.text }} className="text-xl font-bold">Edit Profile</Text>
                <TouchableOpacity onPress={handleSaveProfile}>
                  <Text style={{ color: currentTheme.colors.primary }} className="text-lg font-bold">Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1 px-4">
                <View className="items-center mb-6">
                  <TouchableOpacity onPress={handleSelectProfileImage}>
                    <View 
                      style={{ 
                        backgroundColor: getProfilePicture() ? 'transparent' : currentTheme.colors.primary,
                        borderColor: currentTheme.colors.textTertiary,
                        overflow: 'hidden'
                      }}
                      className="w-24 h-24 rounded-full items-center justify-center mb-4 border-4"
                    >
                      {getProfilePicture() ? (
                        <Image 
                          key={`profile-edit-${refreshKey}`}
                          source={{ uri: getProfilePicture() }} 
                          className="w-full h-full rounded-full" 
                          onError={(error) => {
                            console.log('👤 ProfileScreen: Edit modal profile image load error:', error);
                          }}
                          onLoad={() => {
                            console.log('👤 ProfileScreen: Edit modal profile image loaded successfully');
                          }}
                        />
                      ) : (
                        <Text style={{ color: currentTheme.colors.background }} className="text-2xl font-bold">{getDefaultAvatar()}</Text>
                      )}
                    </View>
                    <Text style={{ color: currentTheme.colors.text }} className="text-center font-semibold">Change Photo</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ backgroundColor: currentTheme.colors.surface }} className="rounded-3xl p-6 mb-6">
                  <Text style={{ color: currentTheme.colors.text }} className="text-lg font-bold mb-4">Profile Information</Text>
                  
                  <View className="mb-4">
                    <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm mb-2">Display Name</Text>
                    <TextInput
                      style={{ 
                        backgroundColor: currentTheme.colors.surface,
                        color: currentTheme.colors.text,
                        borderColor: currentTheme.colors.textTertiary
                      }}
                      className="border-2 rounded-xl px-4 py-3 text-lg"
                      value={editDisplayName}
                      onChangeText={setEditDisplayName}
                      placeholder="Enter display name"
                      placeholderTextColor={currentTheme.colors.textTertiary}
                    />
                  </View>

                  <View className="mb-4">
                    <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm mb-2">Email</Text>
                    <TextInput
                      style={{ 
                        backgroundColor: currentTheme.colors.surface,
                        color: currentTheme.colors.text,
                        borderColor: currentTheme.colors.textTertiary
                      }}
                      className="border-2 rounded-xl px-4 py-3 text-lg"
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="Enter email"
                      placeholderTextColor={currentTheme.colors.textTertiary}
                      keyboardType="email-address"
                    />
                  </View>

                  <View className="mb-4">
                    <Text style={{ color: currentTheme.colors.textSecondary }} className="text-sm mb-2">Bio</Text>
                    <TextInput
                      style={{ 
                        backgroundColor: currentTheme.colors.surface,
                        color: currentTheme.colors.text,
                        borderColor: currentTheme.colors.textTertiary
                      }}
                      className="border-2 rounded-xl px-4 py-3 text-lg"
                      value={editBio}
                      onChangeText={setEditBio}
                      placeholder="Tell us about yourself..."
                      placeholderTextColor={currentTheme.colors.textTertiary}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          </LinearGradient>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
} 