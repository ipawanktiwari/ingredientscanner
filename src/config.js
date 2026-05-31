/**
 * App Configuration
 * Central config for API keys, endpoints, and app settings.
 * 
 * ⚠️ For production: use environment variables or a secrets manager.
 * This file is for development/testing convenience.
 */

const Config = {
  // Command Code API (used for AI vision label scanning)
  COMMAND_CODE: {
    BASE_URL: 'https://api.commandcode.ai/provider/v1',
    API_KEY: '', // Set via environment or load from secure storage
    MODEL: 'xiaomi/mimo-v2.5-pro',
    TIMEOUT_MS: 30000,
  },

  // Open Food Facts API (barcode lookup)
  OPEN_FOOD_FACTS: {
    BASE_URL: 'https://world.openfoodfacts.org/api/v2',
    USER_AGENT: 'Ingro - FoodScanner - v1.3',
    TIMEOUT_MS: 15000,
  },

  // App settings
  APP: {
    VERSION: '1.3.0',
    MAX_RETRIES: 2,
    IMAGE_MAX_WIDTH: 1200,
    IMAGE_QUALITY: 0.7,
  },
};

/**
 * Get the Command Code API key from secure storage or environment.
 * Falls back to empty string if not set.
 */
export async function getApiKey() {
  try {
    // Try AsyncStorage first (set during onboarding or settings)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem('COMMAND_CODE_API_KEY');
    if (stored) return stored;
  } catch {
    // AsyncStorage not available or key not set
  }

  // Return empty — user must set key in app settings
  return '';
}

/**
 * Save API key to secure storage
 */
export async function setApiKey(key) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('COMMAND_CODE_API_KEY', key);
    return true;
  } catch {
    return false;
  }
}

export default Config;
