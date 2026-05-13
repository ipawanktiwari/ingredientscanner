import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCANNER_SIZE = SCREEN_WIDTH * 0.7;

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [flash, setFlash] = useState('off');
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Reset scanner when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setHasScanned(false);
      startScanLine();
      startPulse();
      return () => {
        scanLineAnim.setValue(0);
        pulseAnim.setValue(1);
      };
    }, [])
  );

  const startScanLine = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleBarcodeScanned = async ({ data, type }) => {
    if (hasScanned) return;
    setHasScanned(true);
    Vibration.vibrate(100);

    // Barcode is the product data key
    navigation.navigate('Product', { barcode: data, barcodeType: type });
  };

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
        <MaterialIcons name="camera-alt" size={64} color="#666" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan product barcodes and check ingredients.
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
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flash === 'on'}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14', 'qr'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Scanner overlay */}
      <View style={styles.overlay}>
        {/* Semi-transparent mask */}
        <View style={styles.maskRow}>
          <View style={styles.maskCorner} />
          <View style={styles.maskCenter}>
            <View style={styles.scannerFrame}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Animated scan line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, SCANNER_SIZE - 4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.maskCorner} />
        </View>

        {/* Bottom info area */}
        <View style={styles.bottomArea}>
          <Text style={styles.instructionText}>
            Point your camera at a product barcode
          </Text>
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
          >
            <MaterialIcons
              name={flash === 'on' ? 'flash-on' : 'flash-off'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('History')}
          >
            <MaterialIcons name="history" size={24} color="#fff" />
            <Text style={styles.historyButtonText}>History</Text>
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
  maskRow: {
    flex: 1,
    flexDirection: 'row',
  },
  maskCorner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  maskCenter: {
    width: SCANNER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#00E5FF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.7)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomArea: {
    alignItems: 'center',
    paddingBottom: 80,
    paddingHorizontal: 40,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  flashButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  historyButtonText: {
    color: '#fff',
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