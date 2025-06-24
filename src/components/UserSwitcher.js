import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Image, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';

const UserSwitcher = ({ visible, onClose }) => {
  const { signIn, signUp, user, loading } = useSupabaseAuthStore();
  const { theme } = useThemeStore();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);

  // Load saved accounts on mount
  useEffect(() => {
    loadSavedAccounts();
  }, []);

  const loadSavedAccounts = async () => {
    try {
      const accounts = await AsyncStorage.getItem('savedAccounts');
      if (accounts) {
        setSavedAccounts(JSON.parse(accounts));
      }
    } catch (error) {
      console.error('Error loading saved accounts:', error);
    }
  };

  const saveAccount = async (email, username) => {
    try {
      const newAccount = { email, username: username || email.split('@')[0] };
      const updatedAccounts = [...savedAccounts];
      
      // Check if account already exists
      const existingIndex = updatedAccounts.findIndex(acc => acc.email === email);
      if (existingIndex >= 0) {
        updatedAccounts[existingIndex] = newAccount;
      } else {
        updatedAccounts.push(newAccount);
      }
      
      setSavedAccounts(updatedAccounts);
      await AsyncStorage.setItem('savedAccounts', JSON.stringify(updatedAccounts));
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  // Test users for easy switching
  const testUsers = [
    { email: 'alice.cooper@test.com', password: 'password123', username: 'alice_cooper' },
    { email: 'bob.wilson@test.com', password: 'password123', username: 'bob_wilson' },
    { email: 'charlie.brown@test.com', password: 'password123', username: 'charlie_brown' }
  ];

  const handleSwitchAccount = async (accountEmail, accountPassword) => {
    try {
      await signIn(accountEmail, accountPassword || 'password123');
      await saveAccount(accountEmail, accountEmail.split('@')[0]);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to switch account');
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
        await saveAccount(email, username);
      } else {
        await signIn(email, password);
        await saveAccount(email, username || email.split('@')[0]);
      }
      setShowAddAccount(false);
      setEmail('');
      setPassword('');
      setUsername('');
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Authentication failed');
    }
  };

  const currentTheme = theme === 'dark' ? {
    colors: {
      background: '#000000',
      surface: '#1a1a1a',
      primary: '#FFFC00',
      text: '#ffffff',
      textSecondary: '#888888',
      border: '#333333',
    }
  } : {
    colors: {
      background: '#ffffff',
      surface: '#f5f5f5',
      primary: '#FFFC00',
      text: '#000000',
      textSecondary: '#666666',
      border: '#e0e0e0',
    }
  };

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
              Switch Account
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
          </View>

          {!showAddAccount ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Current Account */}
              {user && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 15,
                  backgroundColor: currentTheme.colors.surface,
                  borderRadius: 12,
                  marginBottom: 15,
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
                      @{user.username || user.email?.split('@')[0]}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: currentTheme.colors.textSecondary,
                    }}>
                      Current Account
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={currentTheme.colors.primary} />
                </View>
              )}

              {/* Test Accounts */}
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: currentTheme.colors.text,
                marginBottom: 10,
              }}>
                Quick Switch
              </Text>
              
              {testUsers.map((testUser, index) => (
                <TouchableOpacity
                  key={index}
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
                  onPress={() => handleSwitchAccount(testUser.email, testUser.password)}
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
                      color: currentTheme.colors.background 
                    }}>
                      {testUser.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: currentTheme.colors.text,
                    }}>
                      @{testUser.username}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: currentTheme.colors.textSecondary,
                    }}>
                      Test Account
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
                </TouchableOpacity>
              ))}

              {/* Saved Accounts */}
              {savedAccounts.length > 0 && (
                <>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: currentTheme.colors.text,
                    marginTop: 15,
                    marginBottom: 10,
                  }}>
                    Saved Accounts
                  </Text>
                  
                  {savedAccounts.map((account, index) => (
                    <TouchableOpacity
                      key={index}
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
                      onPress={() => handleSwitchAccount(account.email)}
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
                          color: currentTheme.colors.background 
                        }}>
                          {account.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: currentTheme.colors.text,
                        }}>
                          @{account.username}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: currentTheme.colors.textSecondary,
                        }}>
                          {account.email}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Add Account Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 15,
                  backgroundColor: currentTheme.colors.primary,
                  borderRadius: 12,
                  marginTop: 10,
                }}
                onPress={() => setShowAddAccount(true)}
              >
                <Ionicons name="add-circle" size={24} color={currentTheme.colors.background} />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: currentTheme.colors.background,
                  marginLeft: 10,
                }}>
                  Add Account
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* Add Account Form */
            <View>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
                onPress={() => setShowAddAccount(false)}
              >
                <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
                <Text style={{
                  fontSize: 16,
                  color: currentTheme.colors.text,
                  marginLeft: 8,
                }}>
                  Back
                </Text>
              </TouchableOpacity>

              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: currentTheme.colors.text,
                marginBottom: 20,
              }}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>

              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: currentTheme.colors.border,
                  borderRadius: 12,
                  padding: 15,
                  marginBottom: 15,
                  fontSize: 16,
                  color: currentTheme.colors.text,
                  backgroundColor: currentTheme.colors.surface,
                }}
                placeholder="Email"
                placeholderTextColor={currentTheme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {isSignUp && (
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 15,
                    fontSize: 16,
                    color: currentTheme.colors.text,
                    backgroundColor: currentTheme.colors.surface,
                  }}
                  placeholder="Username"
                  placeholderTextColor={currentTheme.colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              )}

              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: currentTheme.colors.border,
                  borderRadius: 12,
                  padding: 15,
                  marginBottom: 20,
                  fontSize: 16,
                  color: currentTheme.colors.text,
                  backgroundColor: currentTheme.colors.surface,
                }}
                placeholder="Password"
                placeholderTextColor={currentTheme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={{
                  backgroundColor: currentTheme.colors.primary,
                  borderRadius: 12,
                  padding: 15,
                  alignItems: 'center',
                  marginBottom: 15,
                }}
                onPress={handleCreateAccount}
                disabled={loading}
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
                style={{
                  alignItems: 'center',
                  padding: 10,
                }}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={{
                  fontSize: 14,
                  color: currentTheme.colors.textSecondary,
                }}>
                  {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default UserSwitcher; 