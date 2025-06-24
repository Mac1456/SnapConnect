import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
// import { useSupabaseSnapStore as useSnapStore } from '../stores/supabaseSnapStore';
// import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef(null);
  const recordingTimer = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getMediaLibraryPermissions();
  }, []);

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  const getMediaLibraryPermissions = async () => {
    try {
      console.log('🎥 CameraScreen: Requesting media library permissions...');
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      console.log('🎥 CameraScreen: Media library permission:', mediaPermission.status);
    } catch (error) {
      console.error('🎥 CameraScreen: Error getting media library permissions:', error);
    }
  };

  const handleCameraReady = () => {
    console.log('🎥 CameraScreen: Camera is ready');
    setIsReady(true);
  };

  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimer.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    setRecordingDuration(0);
  };

  const startVideoRecording = async () => {
    if (!cameraRef.current || !isReady || isCapturing || isRecording) {
      console.log('🎥 CameraScreen: Camera not ready or already capturing/recording');
      return;
    }

    try {
      console.log('🎥 CameraScreen: Starting video recording...');
      setIsRecording(true);
      setIsCapturing(true);
      
      // Start visual feedback
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Start progress animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 30000, // 30 seconds max
        useNativeDriver: false,
      }).start();
      
      startRecordingTimer();
      
      const video = await cameraRef.current.recordAsync({
        quality: '720p',
        maxDuration: 30, // 30 seconds max
        mute: false,
      });
      
      console.log('🎥 CameraScreen: Video recorded:', video.uri);
      await handleVideoSave(video);
      
    } catch (error) {
      console.error('🎥 CameraScreen: Error recording video:', error);
      Alert.alert('Recording Error', 'Failed to record video. Please try again.');
    } finally {
      stopVideoRecording();
    }
  };

  const stopVideoRecording = async () => {
    if (!isRecording) return;
    
    try {
      console.log('🎥 CameraScreen: Stopping video recording...');
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('🎥 CameraScreen: Error stopping recording:', error);
    }
    
    // Reset animations
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    progressAnim.setValue(0);
    
    setIsRecording(false);
    setIsCapturing(false);
    stopRecordingTimer();
  };

  const handleVideoSave = async (video) => {
    try {
      const asset = await MediaLibrary.saveToLibraryAsync(video.uri);
      console.log('🎥 CameraScreen: Video saved to library:', asset);
      
      Alert.alert(
        'Video Saved!',
        `Your ${recordingDuration}s video has been saved to your gallery.`,
        [
          { text: 'Record Another', onPress: () => {} },
          { text: 'Done', onPress: () => navigation.goBack() }
        ]
      );
    } catch (saveError) {
      console.log('🎥 CameraScreen: Could not save video to library (Expo Go limitation):', saveError.message);
      
      Alert.alert(
        'Video Recorded!',
        `Video recorded successfully (${recordingDuration}s)! Note: Saving to gallery is limited in Expo Go. Use a development build for full functionality.`,
        [
          { text: 'Record Another', onPress: () => {} },
          { text: 'Done', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !isReady || isCapturing || isRecording) {
      console.log('🎥 CameraScreen: Camera not ready or already capturing/recording');
      return;
    }

    try {
      setIsCapturing(true);
      console.log('🎥 CameraScreen: Taking picture...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });
      
      console.log('🎥 CameraScreen: Photo taken:', photo.uri);
      
      // Try to save to device (may not work in Expo Go)
      try {
        const asset = await MediaLibrary.saveToLibraryAsync(photo.uri);
        console.log('🎥 CameraScreen: Photo saved to library:', asset);
        
        // Show success feedback
        Alert.alert(
          'Photo Saved!',
          'Your photo has been saved to your gallery.',
          [
            { text: 'Take Another', onPress: () => setIsCapturing(false) },
            { text: 'Done', onPress: () => navigation.goBack() }
          ]
        );
      } catch (saveError) {
        console.log('🎥 CameraScreen: Could not save to library (Expo Go limitation):', saveError.message);
        
        // Show different message for Expo Go
        Alert.alert(
          'Photo Taken!',
          'Photo captured successfully! Note: Saving to gallery is limited in Expo Go. Use a development build for full functionality.',
          [
            { text: 'Take Another', onPress: () => setIsCapturing(false) },
            { text: 'Done', onPress: () => navigation.goBack() }
          ]
        );
      }
      
    } catch (error) {
      console.error('🎥 CameraScreen: Error taking picture:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setIsCapturing(false);
    }
  };

  const switchCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const openCameraRoll = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Show options for what to do with the selected media
        Alert.alert(
          'Use Selected Media',
          `Selected ${asset.type === 'video' ? 'video' : 'photo'} from camera roll`,
          [
            { text: 'Send as Snap', onPress: () => handleSelectedMedia(asset, 'snap') },
            { text: 'Post as Story', onPress: () => handleSelectedMedia(asset, 'story') },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('🎥 CameraScreen: Error opening camera roll:', error);
      Alert.alert('Error', 'Failed to open camera roll. Please try again.');
    }
  };

  const handleSelectedMedia = async (asset, type) => {
    try {
      console.log(`🎥 CameraScreen: Handling selected ${asset.type} for ${type}`);
      
      // For now, just show success message
      // In a full implementation, you would upload to Supabase and create snap/story
      Alert.alert(
        'Success!',
        `${asset.type === 'video' ? 'Video' : 'Photo'} selected for ${type}. This would be uploaded in a full implementation.`,
        [
          { text: 'Select Another', onPress: openCameraRoll },
          { text: 'Done', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('🎥 CameraScreen: Error handling selected media:', error);
      Alert.alert('Error', 'Failed to process selected media.');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading permissions state
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFC00" />
        <Text style={styles.loadingText}>Requesting Camera Permission...</Text>
      </View>
    );
  }

  // No permission state
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={80} color="#FFFC00" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          To take photos and record videos, please enable camera access for this app.
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera view
  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={handleCameraReady}
        ratio="16:9"
        mode="video"
      />
      
      {/* Camera Overlay - Using absolute positioning to avoid CameraView children warning */}
      <View style={styles.cameraOverlay}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => navigation.goBack()}
            disabled={isRecording}
          >
            <Ionicons name="close" size={32} color={isRecording ? "#666" : "white"} />
          </TouchableOpacity>
          
          {/* Recording Timer */}
          {isRecording && (
            <View style={styles.timerContainer}>
              <View style={styles.recordingDot} />
              <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={switchCamera}
            disabled={isRecording}
          >
            <Ionicons name="camera-reverse-outline" size={32} color={isRecording ? "#666" : "white"} />
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            {isRecording ? 'Recording...' : 'Tap for photo • Hold for video'}
          </Text>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Camera Roll Button */}
          <TouchableOpacity 
            style={styles.cameraRollButton}
            onPress={openCameraRoll}
            disabled={isRecording}
          >
            <Ionicons name="images" size={24} color={isRecording ? "#666" : "white"} />
          </TouchableOpacity>
          
          <View style={styles.captureButtonContainer}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                isCapturing && styles.captureButtonDisabled
              ]}
              onPress={takePicture}
              disabled={!isReady}
            >
              <Animated.View 
                style={[
                  styles.captureButtonInner,
                  { 
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: isRecording ? '#FF4444' : 'white'
                  }
                ]}
              >
                {isCapturing && !isRecording ? (
                  <ActivityIndicator size="small" color="black" />
                ) : isRecording ? (
                  <View style={styles.recordingIndicator} />
                ) : (
                  <Ionicons name="camera" size={28} color="black" />
                )}
              </Animated.View>
            </TouchableOpacity>
            
            {/* Video Record Button */}
            <TouchableOpacity
              style={[
                styles.videoButton,
                isRecording && styles.videoButtonRecording
              ]}
              onPress={isRecording ? stopVideoRecording : startVideoRecording}
              disabled={!isReady || isCapturing}
            >
              <Ionicons 
                name={isRecording ? "stop" : "videocam"} 
                size={24} 
                color={isRecording ? "white" : "white"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera not ready overlay */}
        {!isReady && (
          <View style={styles.notReadyOverlay}>
            <ActivityIndicator size="large" color="#FFFC00" />
            <Text style={styles.notReadyText}>Preparing Camera...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#FFFC00',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 30,
  },
  permissionButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
  },
  closeButtonText: {
    color: '#FFFC00',
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Lowered from 20 to 60 to move buttons down
  },
  controlButton: {
    width: 60, // Increased from 50 to 60 for easier tapping
    height: 60, // Increased from 50 to 60 for easier tapping
    borderRadius: 30, // Updated to maintain circular shape
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly more opaque for better visibility
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginRight: 8,
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    position: 'absolute',
    top: 150, // Adjusted to account for lowered top controls
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  cameraRollButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  captureButtonContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFC00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  videoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  videoButtonRecording: {
    backgroundColor: '#FF4444',
  },
  progressRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#FF4444',
    borderTopColor: 'transparent',
  },
  notReadyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notReadyText: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
  },
}); 