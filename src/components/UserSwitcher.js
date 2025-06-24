import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Image, ScrollView, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';

const UserSwitcher = ({ visible, onClose }) => {
  const { signIn, signUp, user, loading } = useSupabaseAuthStore();
  const { theme } = useThemeStore();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAccountList, setShowAccountList] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);

  // Load saved accounts on mount and when visible changes
  useEffect(() => {
    if (visible) {
      loadSavedAccounts();
    }
  }, [visible]);

  const loadSavedAccounts = async () => {
    try {
      const accounts = await AsyncStorage.getItem('savedAccounts');
      if (accounts) {
        const parsedAccounts = JSON.parse(accounts);
        console.log('📱 UserSwitcher: Loaded saved accounts:', parsedAccounts.length);
        setSavedAccounts(parsedAccounts);
      } else {
        setSavedAccounts([]);
      }
    } catch (error) {
      console.error('📱 UserSwitcher: Error loading saved accounts:', error);
      setSavedAccounts([]);
    }
  };

  const saveAccount = async (email, username, displayName) => {
    try {
      const newAccount = { 
        email, 
        username: username || email.split('@')[0],
        displayName: displayName || username || email.split('@')[0],
        lastUsed: new Date().toISOString()
      };
      
      let updatedAccounts = [...savedAccounts];
      
      // Check if account already exists
      const existingIndex = updatedAccounts.findIndex(acc => acc.email === email);
      if (existingIndex >= 0) {
        updatedAccounts[existingIndex] = { ...updatedAccounts[existingIndex], ...newAccount };
      } else {
        updatedAccounts.push(newAccount);
      }
      
      // Sort by last used
      updatedAccounts.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
      
      setSavedAccounts(updatedAccounts);
      await AsyncStorage.setItem('savedAccounts', JSON.stringify(updatedAccounts));
      console.log('📱 UserSwitcher: Account saved successfully');
    } catch (error) {
      console.error('📱 UserSwitcher: Error saving account:', error);
    }
  };

  const removeAccount = async (email) => {
    try {
      const updatedAccounts = savedAccounts.filter(acc => acc.email !== email);
      setSavedAccounts(updatedAccounts);
      await AsyncStorage.setItem('savedAccounts', JSON.stringify(updatedAccounts));
      console.log('📱 UserSwitcher: Account removed successfully');
    } catch (error) {
      console.error('📱 UserSwitcher: Error removing account:', error);
    }
  };

  const handleRemoveAccount = (account) => {
    Alert.alert(
      'Remove Account',
      `Remove ${account.displayName || account.username} from saved accounts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeAccount(account.email)
        }
      ]
    );
  };

  // Test users for easy switching
  const testUsers = [
    { email: 'alice.cooper@test.com', password: 'password123', username: 'alice_cooper', displayName: 'Alice Cooper' },
    { email: 'bob.wilson@test.com', password: 'password123', username: 'bob_wilson', displayName: 'Bob Wilson' },
    { email: 'charlie.brown@test.com', password: 'password123', username: 'charlie_brown', displayName: 'Charlie Brown' }
  ];

  const handleSwitchAccount = async (account) => {
    try {
      console.log('📱 UserSwitcher: Switching to account:', account.email);
      
      // For test users, use the predefined password
      const testUser = testUsers.find(tu => tu.email === account.email);
      const password = testUser ? testUser.password : 'password123'; // Default password for saved accounts
      
      await signIn(account.email, password);
      await saveAccount(account.email, account.username, account.displayName);
      
      // Close all modals
      setShowAccountList(false);
      setShowAddAccount(false);
      onClose();
    } catch (error) {
      console.error('📱 UserSwitcher: Switch account error:', error);
      Alert.alert('Error', 'Failed to switch account. Please check your credentials.');
    }
  };

  const handleCreateAccount = async () => {
    // For login, only email and password are required
    // For signup, all fields are required
    if (!email || !password || (isSignUp && !username)) {
      Alert.alert('Error', isSignUp ? 'Please fill in all fields' : 'Please enter email and password');
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password, username);
        await saveAccount(email, username, username);
      } else {
        await signIn(email, password);
        await saveAccount(email, username || email.split('@')[0], username || email.split('@')[0]);
      }
      
      // Reset form
      setEmail('');
      setPassword('');
      setUsername('');
      setShowAddAccount(false);
      onClose();
    } catch (error) {
      console.error('📱 UserSwitcher: Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    }
  };

  const currentTheme = theme === 'dark' ? {
    colors: {
      background: '#000000',
      surface: '#1a1a1a',
      primary: '#FFFC00',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      border: '#404040',
      danger: '#ff4444',
    }
  } : {
    colors: {
      background: '#ffffff',
      surface: '#f8f9fa',
      primary: '#FFFC00',
      text: '#000000',
      textSecondary: '#666666',
      border: '#e0e0e0',
      danger: '#dc3545',
    }
  };

  const renderAccountItem = ({ item }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      backgroundColor: currentTheme.colors.surface,
      marginVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: currentTheme.colors.border,
    }}>
      <TouchableOpacity 
        onPress={() => handleSwitchAccount(item)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
      >
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
              {(item.displayName || item.username)?.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: currentTheme.colors.text,
          }}>
            {item.displayName || item.username}
          </Text>
          <Text style={{
            fontSize: 14,
            color: currentTheme.colors.textSecondary,
          }}>
            {item.email}
          </Text>
          <Text style={{
            fontSize: 12,
            color: currentTheme.colors.textSecondary,
            marginTop: 2,
          }}>
            Last used: {new Date(item.lastUsed).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleRemoveAccount(item)}
        style={{
          padding: 8,
          borderRadius: 20,
          backgroundColor: currentTheme.colors.danger,
        }}
      >
        <Ionicons name="trash" size={16} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          backgroundColor: currentTheme.colors.background,
          borderRadius: 20,
          padding: 20,
          width: '90%',
          maxHeight: '80%',
          borderWidth: 1,
          borderColor: currentTheme.colors.border,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.colors.border,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: currentTheme.colors.text,
            }}>
              {showAddAccount ? (isSignUp ? 'Create Account' : 'Sign In') : 
               showAccountList ? 'Saved Accounts' : 'Switch Account'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
          </View>

          {showAddAccount ? (
            // Add Account Form
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: currentTheme.colors.text,
                  marginBottom: 15,
                }}>
                  {isSignUp ? 'Create a new account' : 'Sign in to existing account'}
                </Text>

                <TextInput
                  style={{
                    backgroundColor: currentTheme.colors.surface,
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 15,
                    fontSize: 16,
                    color: currentTheme.colors.text,
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                  }}
                  placeholder="Email"
                  placeholderTextColor={currentTheme.colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TextInput
                  style={{
                    backgroundColor: currentTheme.colors.surface,
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 15,
                    fontSize: 16,
                    color: currentTheme.colors.text,
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                  }}
                  placeholder="Password"
                  placeholderTextColor={currentTheme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                {isSignUp && (
                  <TextInput
                    style={{
                      backgroundColor: currentTheme.colors.surface,
                      borderRadius: 12,
                      padding: 15,
                      marginBottom: 15,
                      fontSize: 16,
                      color: currentTheme.colors.text,
                      borderWidth: 1,
                      borderColor: currentTheme.colors.border,
                    }}
                    placeholder="Username"
                    placeholderTextColor={currentTheme.colors.textSecondary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                )}

                <TouchableOpacity
                  onPress={handleCreateAccount}
                  disabled={loading}
                  style={{
                    backgroundColor: currentTheme.colors.primary,
                    borderRadius: 12,
                    padding: 15,
                    alignItems: 'center',
                    marginBottom: 15,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: currentTheme.colors.background,
                  }}>
                    {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsSignUp(!isSignUp)}
                  style={{ alignItems: 'center', marginBottom: 15 }}
                >
                  <Text style={{
                    fontSize: 14,
                    color: currentTheme.colors.textSecondary,
                  }}>
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowAddAccount(false);
                    setEmail('');
                    setPassword('');
                    setUsername('');
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                    borderRadius: 12,
                    padding: 15,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    color: currentTheme.colors.text,
                  }}>
                    Back
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : showAccountList ? (
            // Saved Accounts List
            <View style={{ flex: 1 }}>
              {savedAccounts.length > 0 ? (
                <FlatList
                  data={savedAccounts}
                  renderItem={renderAccountItem}
                  keyExtractor={(item) => item.email}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 400 }}
                />
              ) : (
                <View style={{
                  alignItems: 'center',
                  paddingVertical: 40,
                }}>
                  <Ionicons name="person-circle" size={64} color={currentTheme.colors.textSecondary} />
                  <Text style={{
                    fontSize: 16,
                    color: currentTheme.colors.textSecondary,
                    marginTop: 15,
                    textAlign: 'center',
                  }}>
                    No saved accounts
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => setShowAccountList(false)}
                style={{
                  borderWidth: 1,
                  borderColor: currentTheme.colors.border,
                  borderRadius: 12,
                  padding: 15,
                  alignItems: 'center',
                  marginTop: 15,
                }}
              >
                <Text style={{
                  fontSize: 16,
                  color: currentTheme.colors.text,
                }}>
                  Back
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Main Menu
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Current Account */}
              {user && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 15,
                  backgroundColor: currentTheme.colors.surface,
                  borderRadius: 12,
                  marginBottom: 20,
                  borderWidth: 2,
                  borderColor: currentTheme.colors.primary,
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
                    {user.profilePicture || user.profile_picture ? (
                      <Image 
                        source={{ uri: user.profilePicture || user.profile_picture }} 
                        style={{ width: 50, height: 50, borderRadius: 25 }}
                      />
                    ) : (
                      <Text style={{ 
                        fontSize: 18, 
                        fontWeight: 'bold',
                        color: currentTheme.colors.background 
                      }}>
                        {(user.username || user.email)?.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: currentTheme.colors.text,
                    }}>
                      {user.display_name || user.username || 'Current User'}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: currentTheme.colors.textSecondary,
                    }}>
                      {user.email}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: currentTheme.colors.primary,
                      marginTop: 2,
                      fontWeight: 'bold',
                    }}>
                      Currently Active
                    </Text>
                  </View>
                </View>
              )}

              {/* Quick Actions */}
              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => setShowAccountList(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 15,
                    backgroundColor: currentTheme.colors.surface,
                    borderRadius: 12,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                  }}
                >
                  <Ionicons name="list" size={24} color={currentTheme.colors.text} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: currentTheme.colors.text,
                    }}>
                      Saved Accounts
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: currentTheme.colors.textSecondary,
                    }}>
                      {savedAccounts.length} saved account{savedAccounts.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowAddAccount(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 15,
                    backgroundColor: currentTheme.colors.primary,
                    borderRadius: 12,
                    marginBottom: 15,
                  }}
                >
                  <Ionicons name="add" size={24} color={currentTheme.colors.background} style={{ marginRight: 12 }} />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: currentTheme.colors.background,
                  }}>
                    Add Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Test Accounts */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: currentTheme.colors.text,
                  marginBottom: 10,
                }}>
                  Quick Test Accounts
                </Text>
                {testUsers.map((testUser) => (
                  <TouchableOpacity
                    key={testUser.email}
                    onPress={() => handleSwitchAccount(testUser)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      backgroundColor: currentTheme.colors.surface,
                      borderRadius: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: currentTheme.colors.border,
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: currentTheme.colors.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: currentTheme.colors.background,
                      }}>
                        {testUser.displayName.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: currentTheme.colors.text,
                      }}>
                        {testUser.displayName}
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: currentTheme.colors.textSecondary,
                      }}>
                        {testUser.email}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default UserSwitcher; 