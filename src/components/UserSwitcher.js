import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Image, ScrollView, FlatList, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { useThemeStore } from '../stores/themeStore';

const UserSwitcher = ({ visible, onClose }) => {
  const { signIn, signUp, user, loading } = useSupabaseAuthStore();
  const { currentTheme } = useThemeStore();
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
      const passwordToUse = testUser ? testUser.password : 'password123'; // Default password for test accounts
      
      await signIn(account.email, passwordToUse);
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

  const renderAccountItem = ({ item }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: currentTheme.colors.surface,
      marginVertical: 4,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: currentTheme.colors.borderStrong,
      shadowColor: currentTheme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    }}>
      <TouchableOpacity 
        onPress={() => handleSwitchAccount(item)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
      >
        <View style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: currentTheme.colors.snapYellow,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
          borderWidth: 2,
          borderColor: currentTheme.colors.snapPink,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: currentTheme.colors.textInverse,
          }}>
            {(item.displayName || item.username)?.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: currentTheme.colors.text,
            marginBottom: 2,
          }}>
            {item.displayName || item.username}
          </Text>
          <Text style={{
            fontSize: 14,
            color: currentTheme.colors.textSecondary,
          }}>
            {item.email}
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => handleRemoveAccount(item)}
        style={{
          padding: 8,
          borderRadius: 20,
          backgroundColor: currentTheme.colors.error + '30',
          borderWidth: 1,
          borderColor: currentTheme.colors.error,
        }}
      >
        <Ionicons name="trash-outline" size={20} color={currentTheme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: currentTheme.colors.background,
      }}>
        <View style={{
          flex: 1,
          backgroundColor: currentTheme.colors.background,
          padding: 20,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottomWidth: 2,
            borderBottomColor: currentTheme.colors.snapYellow,
          }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: currentTheme.colors.text,
            }}>
              Switch Account
            </Text>
            <TouchableOpacity
              onPress={() => {
                console.log('📱 UserSwitcher: Close button pressed');
                onClose();
              }}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: currentTheme.colors.error,
                borderWidth: 2,
                borderColor: currentTheme.colors.snapPink,
              }}
            >
              <Ionicons name="close" size={24} color={currentTheme.colors.textInverse} />
            </TouchableOpacity>
          </View>

          {/* Current User */}
          {user && (
            <View style={{
              padding: 16,
              backgroundColor: currentTheme.colors.surface,
              borderRadius: 15,
              borderWidth: 2,
              borderColor: currentTheme.colors.snapYellow,
              marginBottom: 20,
              shadowColor: currentTheme.colors.snapYellow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: currentTheme.colors.text,
                marginBottom: 8,
              }}>
                Current Account
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: currentTheme.colors.snapPink,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: currentTheme.colors.snapYellow,
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: currentTheme.colors.textInverse,
                  }}>
                    {user.email?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: currentTheme.colors.text,
                  }}>
                    {user.email}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: currentTheme.colors.textSecondary,
                  }}>
                    Currently signed in
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
            marginBottom: 20,
          }}>
            <TouchableOpacity
              onPress={() => {
                console.log('📱 UserSwitcher: Show account list pressed');
                setShowAccountList(true);
              }}
              style={{
                flex: 1,
                backgroundColor: currentTheme.colors.snapYellow,
                borderWidth: 2,
                borderColor: currentTheme.colors.snapPink,
                borderRadius: 15,
                paddingVertical: 12,
                paddingHorizontal: 16,
                shadowColor: currentTheme.colors.snapYellow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Text style={{
                color: currentTheme.colors.textInverse,
                fontWeight: 'bold',
                fontSize: 16,
                textAlign: 'center',
              }}>
                Saved Accounts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                console.log('📱 UserSwitcher: Add account pressed');
                setShowAddAccount(true);
              }}
              style={{
                flex: 1,
                backgroundColor: currentTheme.colors.snapPink,
                borderWidth: 2,
                borderColor: currentTheme.colors.snapYellow,
                borderRadius: 15,
                paddingVertical: 12,
                paddingHorizontal: 16,
                shadowColor: currentTheme.colors.snapPink,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Text style={{
                color: currentTheme.colors.textInverse,
                fontWeight: 'bold',
                fontSize: 16,
                textAlign: 'center',
              }}>
                Add Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Test Users */}
          <View style={{
            backgroundColor: currentTheme.colors.surface,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: currentTheme.colors.borderStrong,
            padding: 16,
            shadowColor: currentTheme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: currentTheme.colors.text,
              marginBottom: 12,
            }}>
              Quick Login (Test Users)
            </Text>
            <ScrollView>
              {testUsers.map((testUser, index) => (
                <TouchableOpacity
                  key={testUser.email}
                  onPress={() => {
                    console.log('📱 UserSwitcher: Test user selected:', testUser.email);
                    handleSwitchAccount({
                      email: testUser.email,
                      username: testUser.username,
                      displayName: testUser.displayName
                    });
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: currentTheme.colors.background,
                    marginVertical: 4,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: currentTheme.colors.snapYellow,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                    borderWidth: 2,
                    borderColor: currentTheme.colors.snapPink,
                  }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: currentTheme.colors.textInverse,
                    }}>
                      {testUser.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: currentTheme.colors.text,
                    }}>
                      {testUser.displayName}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: currentTheme.colors.textSecondary,
                    }}>
                      {testUser.email}
                    </Text>
                  </View>
                  
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={currentTheme.colors.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>

      {/* Saved Accounts Modal */}
      <Modal
        visible={showAccountList}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowAccountList(false)}
      >
        <SafeAreaView style={{
          flex: 1,
          backgroundColor: currentTheme.colors.background,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: currentTheme.colors.background,
            padding: 20,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottomWidth: 2,
              borderBottomColor: currentTheme.colors.snapYellow,
            }}>
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: currentTheme.colors.text,
              }}>
                Saved Accounts
              </Text>
              <TouchableOpacity
                onPress={() => {
                  console.log('📱 UserSwitcher: Account list close pressed');
                  setShowAccountList(false);
                }}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: currentTheme.colors.error,
                  borderWidth: 2,
                  borderColor: currentTheme.colors.snapPink,
                }}
              >
                <Ionicons name="close" size={24} color={currentTheme.colors.textInverse} />
              </TouchableOpacity>
            </View>

            {/* Accounts List */}
            <FlatList
              data={savedAccounts}
              renderItem={renderAccountItem}
              keyExtractor={(item) => item.email}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{
                  padding: 40,
                  alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: currentTheme.colors.text,
                    marginBottom: 8,
                  }}>
                    No Saved Accounts
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: currentTheme.colors.textSecondary,
                    textAlign: 'center',
                  }}>
                    Add an account to switch between multiple users
                  </Text>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Account Modal */}
      <Modal
        visible={showAddAccount}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowAddAccount(false)}
      >
        <SafeAreaView style={{
          flex: 1,
          backgroundColor: currentTheme.colors.background,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: currentTheme.colors.background,
            padding: 20,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottomWidth: 2,
              borderBottomColor: currentTheme.colors.snapYellow,
            }}>
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: currentTheme.colors.text,
              }}>
                {isSignUp ? 'Create Account' : 'Add Account'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  console.log('📱 UserSwitcher: Add account close pressed');
                  setShowAddAccount(false);
                  setEmail('');
                  setPassword('');
                  setUsername('');
                  setIsSignUp(false);
                }}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: currentTheme.colors.error,
                  borderWidth: 2,
                  borderColor: currentTheme.colors.snapPink,
                }}
              >
                <Ionicons name="close" size={24} color={currentTheme.colors.textInverse} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {/* Auth Toggle */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: currentTheme.colors.surface,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: currentTheme.colors.borderStrong,
                marginBottom: 20,
                padding: 4,
              }}>
                <TouchableOpacity
                  onPress={() => {
                    console.log('📱 UserSwitcher: Switch to login');
                    setIsSignUp(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: !isSignUp ? currentTheme.colors.snapYellow : 'transparent',
                  }}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: !isSignUp ? currentTheme.colors.textInverse : currentTheme.colors.text,
                  }}>
                    Sign In
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => {
                    console.log('📱 UserSwitcher: Switch to signup');
                    setIsSignUp(true);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: isSignUp ? currentTheme.colors.snapPink : 'transparent',
                  }}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: isSignUp ? currentTheme.colors.textInverse : currentTheme.colors.text,
                  }}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: currentTheme.colors.text,
                    marginBottom: 8,
                  }}>
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      console.log('📱 UserSwitcher: Email changed');
                      setEmail(text);
                    }}
                    placeholder="Enter your email"
                    placeholderTextColor={currentTheme.colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      backgroundColor: currentTheme.colors.surface,
                      borderWidth: 2,
                      borderColor: currentTheme.colors.borderStrong,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: currentTheme.colors.text,
                    }}
                  />
                </View>

                <View>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: currentTheme.colors.text,
                    marginBottom: 8,
                  }}>
                    Password
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={(text) => {
                      console.log('📱 UserSwitcher: Password changed');
                      setPassword(text);
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor={currentTheme.colors.textTertiary}
                    secureTextEntry
                    style={{
                      backgroundColor: currentTheme.colors.surface,
                      borderWidth: 2,
                      borderColor: currentTheme.colors.borderStrong,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: currentTheme.colors.text,
                    }}
                  />
                </View>

                {isSignUp && (
                  <View>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: currentTheme.colors.text,
                      marginBottom: 8,
                    }}>
                      Username
                    </Text>
                    <TextInput
                      value={username}
                      onChangeText={(text) => {
                        console.log('📱 UserSwitcher: Username changed');
                        setUsername(text);
                      }}
                      placeholder="Choose a username"
                      placeholderTextColor={currentTheme.colors.textTertiary}
                      autoCapitalize="none"
                      style={{
                        backgroundColor: currentTheme.colors.surface,
                        borderWidth: 2,
                        borderColor: currentTheme.colors.borderStrong,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        color: currentTheme.colors.text,
                      }}
                    />
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={() => {
                  console.log('📱 UserSwitcher: Submit button pressed');
                  handleCreateAccount();
                }}
                disabled={loading || !email || !password || (isSignUp && !username)}
                style={{
                  backgroundColor: currentTheme.colors.snapYellow,
                  borderWidth: 2,
                  borderColor: currentTheme.colors.snapPink,
                  borderRadius: 15,
                  paddingVertical: 16,
                  marginTop: 32,
                  opacity: (loading || !email || !password || (isSignUp && !username)) ? 0.5 : 1,
                  shadowColor: currentTheme.colors.snapYellow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Text style={{
                  color: currentTheme.colors.textInverse,
                  fontWeight: 'bold',
                  fontSize: 18,
                  textAlign: 'center',
                }}>
                  {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </Modal>
  );
};

export default UserSwitcher; 