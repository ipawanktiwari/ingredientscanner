/**
 * App Configuration
 * Central config for API keys, endpoints, and app settings.
 * 
 * ⚠️ For production: use environment variables or a secrets manager.
 * This file is for development/testing convenience.
 */

const Config = {
  // Backend API proxy (handles Open Food Facts, AI vision, auth, rate limiting)
  API_BASE_URL: 'https://www.objectifylab.com/api/ingro',

  // Open Food Facts API (barcode lookup — now routed through backend)
  OPEN_FOOD_FACTS: {
    BASE_URL: 'https://world.openfoodfacts.org/api/v2',
    USER_AGENT: 'Ingro - FoodScanner - v2.0',
    TIMEOUT_MS: 15000,
  },

  // App settings
  APP: {
    VERSION: '2.0.0',
    MAX_RETRIES: 2,
    IMAGE_MAX_WIDTH: 1200,
    IMAGE_QUALITY: 0.7,
  },
};

export default Config;
