/**
 * Local storage for scan history using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@ingredientscanner:history';
const MAX_HISTORY = 50;

/**
 * Save a scanned product to history deduped by barcode.
 */
export async function saveToHistory(product) {
  try {
    const history = await getHistory();
    const filtered = history.filter((item) => item.barcode !== product.barcode);

    const entry = {
      ...product,
      scannedAt: new Date().toISOString(),
    };

    filtered.unshift(entry);
    const trimmed = filtered.slice(0, MAX_HISTORY);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch (e) {
    console.warn('Failed to save history:', e);
    return [];
  }
}

/**
 * Get all scan history (newest first).
 */
export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load history:', e);
    return [];
  }
}

/**
 * Clear all history.
 */
export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.warn('Failed to clear history:', e);
  }
}

/**
 * Delete a single history entry by barcode.
 */
export async function deleteFromHistory(barcode) {
  try {
    const history = await getHistory();
    const filtered = history.filter((item) => item.barcode !== barcode);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.warn('Failed to delete from history:', e);
    return [];
  }
}
