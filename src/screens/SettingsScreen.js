import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';
import { clearAuth } from '../services/apiClient';

export default function SettingsScreen({ navigation }) {
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    loadDevice();
  }, []);

  const loadDevice = async () => {
    try {
      const id = await AsyncStorage.getItem('@ingro:device_id');
      if (id) setDeviceId(id.substring(0, 16) + '...');
    } catch {}
  };

  const handleLogout = async () => {
    await clearAuth();
    setDeviceId('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="settings" size={32} color="#00E5FF" />
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="devices" size={18} color="#888" />
            <Text style={styles.infoLabel}>Device ID</Text>
            <Text style={styles.infoValue}>{deviceId || 'Not registered'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="cloud" size={18} color="#888" />
            <Text style={styles.infoLabel}>Backend</Text>
            <Text style={styles.infoValue}>objectifylab.com</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="api" size={18} color="#888" />
            <Text style={styles.infoLabel}>Scans</Text>
            <Text style={styles.infoValue}>5 free / day</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={18} color="#FF5252" />
            <Text style={styles.logoutText}>Reset Account</Text>
          </TouchableOpacity>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Ingro Works</Text>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Scan a barcode — we look it up in Open Food Facts</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Not found? Flip & scan the ingredient label with AI</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Get a 0-5 health rating with detailed breakdown</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>No API keys needed — everything runs on our servers</Text>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>Ingro v{Config.APP.VERSION}</Text>
          <Text style={styles.appInfoText}>Know what you eat — backed by science + AI</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    marginTop: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  section: {
    backgroundColor: '#12122a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,82,82,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.3)',
  },
  logoutText: {
    color: '#FF5252',
    fontSize: 15,
    fontWeight: '600',
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '800',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,229,255,0.15)',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  stepText: {
    color: '#b0b0b0',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appInfoTitle: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  appInfoText: {
    color: '#666',
    fontSize: 14,
  },
});
