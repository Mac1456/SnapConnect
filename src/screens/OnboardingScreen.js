import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';

const onboardingSteps = [
  {
    title: 'Welcome to SnapConnect!',
    description: 'The best place to connect with your friends and share your moments.',
  },
  {
    title: 'Capture & Share',
    description: 'Take photos and videos, add a caption, and send them to your best friends.',
  },
  {
    title: 'Post Your Story',
    description: 'Share your day with all your friends by adding snaps to your Story. They last for 24 hours!',
  },
  {
    title: 'Discover',
    description: 'Explore Stories from the community and see what\'s happening around the world.',
  },
];

const OnboardingScreen = () => {
  const { completeOnboarding } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);

  const handleComplete = () => {
    console.log('🎬 OnboardingScreen: Completing onboarding...');
    completeOnboarding();
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{onboardingSteps[currentStep].title}</Text>
        <Text style={styles.subtitle}>{onboardingSteps[currentStep].description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentStep === index ? styles.activeDot : {}]}
            />
          ))}
        </View>

        <View style={styles.buttonsContainer}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.button} onPress={handleBack}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          )}
          {isLastStep ? (
            <TouchableOpacity style={[styles.button, styles.getStartedButton]} onPress={handleComplete}>
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#555',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: '#333',
  },
  getStartedButton: {
    backgroundColor: '#FFFC00', // A yellow color like Snapchat
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen; 