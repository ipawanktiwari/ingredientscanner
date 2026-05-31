import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getApiKey, setApiKey } from '../config';

export default function SettingsScreen({ navigation }) {
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const key = await getApiKey();
      if (key) {
        setApiKeyState(key);
      }
    } catch (err) {
      console.error('[Settings] Error loading API key:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API key');
      return;
    }

    try {
      const success = await setApiKey(apiKey.trim());
      if (success) {
        setSaved(true);
        Alert.alert('Success', 'API key saved successfully');
        setTimeout(() => setSaved(false), 2000);
      } else {
        Alert.alert('Error', 'Failed to save API key');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save API key: ' + err.message);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API key first');
      return;
    }

    try {
      // Test the key by making a simple request
      const response = await fetch('https://api.commandcode.ai/provider/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'API key is valid!');
      } else {
        Alert.alert('Error', 'API key is invalid or expired');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not test API key: ' + err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="settings" size={32} color="#00E5FF" />
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* API Key Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Command Code API Key</Text>
          <Text style={styles.sectionDesc}>
            Required for AI label scanning. Get your key from commandcode.ai
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKeyState}
              placeholder="Enter your API key"
              placeholderTextColor="#666"
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {saved && (
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" style={styles.savedIcon} />
            )}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={handleTestKey}
            >
              <MaterialIcons name="wifi-tethering" size={18} color="#000" />
              <Text style={styles.buttonText}>Test Key</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <MaterialIcons name="save" size={18} color="#000" />
              <Text style={styles.buttonText}>Save Key</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How to get your API key:</Text>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Visit commandcode.ai and sign up</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Go to Dashboard → API Keys</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Create a new key and copy it</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Paste it here and save</Text>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>Ingro v1.4.0</Text>
          <Text style={styles.appInfoText}>Know what you eat</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
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
    marginBottom: 8,
  },
  sectionDesc: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  savedIcon: {
    marginRight: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  testButton: {
    backgroundColor: '#FFD600',
  },
  saveButton: {
    backgroundColor: '#00E5FF',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: '#0d1b2a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a2a3a',
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    color: '#00E5FF',
    fontSize: 16,
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
