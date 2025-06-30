import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/themeStore';

const { width, height } = Dimensions.get('window');

const OnboardingGuide = ({ visible, onComplete }) => {
  const { currentTheme } = useThemeStore();
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      title: "Welcome to SnapConnect",
      subtitle: "Your social media adventure starts here!",
      icon: "heart",
      content: [
        "Connect with friends through photos and messages",
        "Share your daily moments with stories",
        "Create group chats and plan activities together",
        "Discover new friends and expand your network"
      ]
    },
    {
      title: "Home Screen",
      subtitle: "Your personal dashboard",
      icon: "home",
      content: [
        "View your profile and manage your account",
        "See friend suggestions and connect with new people",
        "Access your friend list and manage connections",
        "Quick navigation to all app features"
      ]
    },
    {
      title: "Camera & Stories",
      subtitle: "Capture and share moments",
      icon: "camera",
      content: [
        "Take photos and videos instantly",
        "Add captions and share as stories",
        "View friends' stories in real-time",
        "Stories disappear after 24 hours"
      ]
    },
    {
      title: "Messages & Chats",
      subtitle: "Stay connected with friends",
      icon: "chatbubbles",
      content: [
        "Send direct messages to friends",
        "Create group chats with multiple friends",
        "Get AI-powered activity suggestions",
        "Share photos and plan meetups together"
      ]
    },
    {
      title: "Discover & Friends",
      subtitle: "Expand your network",
      icon: "people",
      content: [
        "Find new friends based on interests",
        "Send and receive friend requests",
        "Browse suggested connections",
        "Build your social circle"
      ]
    },
    {
      title: "Profile & Settings",
      subtitle: "Make it yours",
      icon: "person-circle",
      content: [
        "Customize your profile with photos and bio",
        "Manage your privacy and account settings",
        "Switch between light and dark themes",
        "Control your notifications and preferences"
      ]
    }
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentPageData = pages[currentPage];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onComplete}
    >
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: currentTheme.colors.background 
      }}>
        <View style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingVertical: 20,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 30,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Text style={{
                color: currentTheme.colors.textSecondary,
                fontSize: 16,
                fontWeight: '500',
              }}>
                {currentPage + 1} of {pages.length}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSkip}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: currentTheme.colors.surface,
              }}
            >
              <Text style={{
                color: currentTheme.colors.textSecondary,
                fontSize: 16,
                fontWeight: '500',
              }}>
                Skip
              </Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={{
            height: 4,
            backgroundColor: currentTheme.colors.surface,
            borderRadius: 2,
            marginBottom: 40,
          }}>
            <View style={{
              height: '100%',
              width: `${((currentPage + 1) / pages.length) * 100}%`,
              backgroundColor: currentTheme.colors.primary,
              borderRadius: 2,
            }} />
          </View>

          {/* Content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{
              alignItems: 'center',
              marginBottom: 40,
            }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: currentTheme.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}>
                <Ionicons
                  name={currentPageData.icon}
                  size={40}
                  color={currentTheme.colors.background}
                />
              </View>

              <Text style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: currentTheme.colors.text,
                textAlign: 'center',
                marginBottom: 8,
              }}>
                {currentPageData.title}
              </Text>

              <Text style={{
                fontSize: 18,
                color: currentTheme.colors.textSecondary,
                textAlign: 'center',
                marginBottom: 32,
              }}>
                {currentPageData.subtitle}
              </Text>
            </View>

            <View style={{
              backgroundColor: currentTheme.colors.surface,
              borderRadius: 16,
              padding: 24,
              marginBottom: 40,
            }}>
              {currentPageData.content.map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: index === currentPageData.content.length - 1 ? 0 : 16,
                  }}
                >
                  <View style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: currentTheme.colors.primary,
                    marginTop: 8,
                    marginRight: 16,
                  }} />
                  <Text style={{
                    fontSize: 16,
                    color: currentTheme.colors.text,
                    lineHeight: 22,
                    flex: 1,
                  }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 20,
          }}>
            <TouchableOpacity
              onPress={handlePrevious}
              disabled={currentPage === 0}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 25,
                backgroundColor: currentPage === 0 ? 'transparent' : currentTheme.colors.surface,
                opacity: currentPage === 0 ? 0.5 : 1,
              }}
            >
              <Text style={{
                color: currentTheme.colors.text,
                fontSize: 16,
                fontWeight: '600',
              }}>
                Previous
              </Text>
            </TouchableOpacity>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {pages.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === currentPage 
                      ? currentTheme.colors.primary 
                      : currentTheme.colors.surface,
                    marginHorizontal: 4,
                  }}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleNext}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 25,
                backgroundColor: currentTheme.colors.primary,
              }}
            >
              <Text style={{
                color: currentTheme.colors.background,
                fontSize: 16,
                fontWeight: '600',
              }}>
                {currentPage === pages.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default OnboardingGuide; 