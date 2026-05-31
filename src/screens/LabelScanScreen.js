import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { analyzeLabel } from '../services/visionApi';

export default function LabelScanScreen({ route, navigation }) {
  const barcode = route.params?.barcode || '';
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState('off');
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const cameraRef = useRef(null);

  // Reset when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setCapturing(false);
      setAnalyzing(false);
      setCapturedPhoto(null);
    }, [])
  );

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: false,
      });

      // Compress and resize for faster upload
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setCapturedPhoto(manipulated.uri);
      setAnalyzing(true);

      console.log('[Ingro Label] Analyzing image...');
      const result = await analyzeLabel(manipulated.base64, 'image/jpeg');

      console.log('[Ingro Label] Analysis complete:', result.name, result.confidence);

      // Navigate to Product screen with AI-parsed data
      navigation.replace('Product', {
        aiData: result,
        barcode: barcode,
      });
    } catch (err) {
      console.error('[Ingro Label] Error:', err.message);
      Alert.alert(
        'Analysis Failed',
        err.message || 'Could not analyze the label. Try again with a clearer photo.',
        [
          { text: 'Retry', onPress: () => { setCapturedPhoto(null); setAnalyzing(false); } },
          { text: 'Cancel', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setCapturing(false);
      setAnalyzing(false);
    }
  };

  // Loading state while analyzing
  if (analyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          {capturedPhoto && (
            <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
          )}
          <ActivityIndicator size="large" color="#00E5FF" style={styles.spinner} />
          <Text style={styles.loadingTitle}>AI is reading the label...</Text>
          <Text style={styles.loadingText}>Extracting ingredients & nutrition</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission check
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <MaterialIcons name="document-scanner" size={64} color="#666" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan ingredient labels.
        </Text>
        <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
          <Text style={styles.grantButtonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flash === 'on'}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top instruction */}
        <View style={styles.topArea}>
          <View style={styles.instructionBanner}>
            <MaterialIcons name="info-outline" size={18} color="#00E5FF" />
            <Text style={styles.instructionText}>
              Point at the ingredient list on the back of the package
            </Text>
          </View>
        </View>

        {/* Guide frame */}
        <View style={styles.frameArea}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <Text style={styles.frameLabel}>Align ingredient text here</Text>
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
          >
            <MaterialIcons
              name={flash === 'on' ? 'flash-on' : 'flash-off'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={capturing}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topArea: {
    paddingTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  frameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideFrame: {
    width: '85%',
    height: '60%',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
    borderRadius: 8,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#00E5FF',
  },
  cornerTopLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  frameLabel: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  bottomArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingHorizontal: 30,
  },
  flashButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  previewImage: {
    width: 200,
    height: 260,
    borderRadius: 12,
    marginBottom: 24,
    opacity: 0.6,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingTitle: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  permissionText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  grantButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: '#00E5FF',
    borderRadius: 12,
  },
  grantButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
