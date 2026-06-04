/**
 * API Client — handles auth (JWT via device registration) and all backend HTTP calls.
 * 
 * The backend proxy sits at objectifylab.com/api/ingro and handles:
 *   - Open Food Facts barcode lookups
 *   - AI vision label scanning
 *   - Rate limiting + scan quotas (5 free/day)
 *   - User auth + meal logging
 * 
 * Configuration loaded from ../config.js — no hardcoded secrets.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

const TOKEN_KEY = '@ingro:auth_token';
const DEVICE_ID_KEY = '@ingro:device_id';

/**
 * Generate a persistent device ID (stored in AsyncStorage so it survives app reinstalls).
 */
async function getDeviceId() {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Simple UUID-like device ID — no personal data
      deviceId = 'ingro_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'ingro_fallback_' + Date.now().toString(36);
  }
}

/**
 * Get stored JWT token.
 */
async function getToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Register/login with backend using device ID.
 * Backend returns JWT on first registration and subsequent logins.
 */
async function ensureAuth() {
  let token = await getToken();
  if (token) return token;

  const deviceId = await getDeviceId();
  const response = await fetch(`${Config.API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, name: 'Ingro User' }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  token = data.access_token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

/**
 * Clear auth token (logout / re-register).
 */
export async function clearAuth() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(DEVICE_ID_KEY);
}

/**
 * Make an authenticated API call to the Ingro backend.
 * Handles token refresh automatically.
 */
export async function apiCall(path, options = {}) {
  // Ensure we're authenticated
  let token = await ensureAuth();

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  let response = await fetch(`${Config.API_BASE_URL}${path}`, {
    ...options,
    headers,
    signal: options.signal,
  });

  // Token expired — re-auth and retry once
  if (response.status === 401) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    token = await ensureAuth();
    headers['Authorization'] = `Bearer ${token}`;
    response = await fetch(`${Config.API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal,
    });
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${response.status}`);
  }

  return response.json();
}
