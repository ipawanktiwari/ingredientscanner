/**
 * AI Vision API — sends label images to backend for AI analysis.
 * Backend proxies to Gemini 2.5 Flash (free) with Command Code fallback.
 * No API key needed on client — all handled server-side.
 */

import { apiCall } from './apiClient';

/**
 * Analyze a food label image using backend AI vision.
 * @param {string} imageBase64 - Base64-encoded JPEG image
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns {object} Normalized product data from the label
 */
export async function analyzeLabel(imageBase64, mimeType = 'image/jpeg') {
  console.log('[Ingro Vision] Sending label to backend for AI analysis...');

  const data = await apiCall('/scan/label', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64 }),
  });

  // Backend returns the parsed product data already
  return normalizeVisionResponse(data);
}

/**
 * Normalize backend vision response into frontend data model.
 */
function normalizeVisionResponse(raw) {
  // Backend may return ingredients already parsed or as text
  const ingredientsList = Array.isArray(raw.ingredients)
    ? raw.ingredients.map(i => typeof i === 'string' ? i : i.name || i.id || '')
    : [];

  const ingredientsText = raw.ingredients_text || ingredientsList.join(', ') || '';

  const ingredients = ingredientsList.map((name, i) => ({
    id: `ai_${i}`,
    name: typeof name === 'string' ? name.trim() : '',
    rank: i + 1,
    percent: estimatePercent(i, ingredientsList.length),
    vegan: true,
    vegetarian: true,
    isAdditive: isLikelyAdditive(typeof name === 'string' ? name.trim() : ''),
  }));

  const additives = (raw.additives || []).map(add => ({
    id: add.id || '',
    name: add.name || '',
    risk: add.risk || 'unknown',
  }));

  const nutri = raw.nutrition || {};

  return {
    barcode: raw.barcode || '',
    name: raw.product_name || raw.name || 'Scanned Product',
    brand: raw.brand || '',
    imageUrl: raw.image_url || null,
    quantity: raw.quantity || raw.serving_size || '',
    packaging: '',
    categories: [],
    labels: [],
    ingredients,
    ingredientsList: ingredientsList.map(i => typeof i === 'string' ? i : ''),
    ingredientsText,
    additives,
    nutriscore: (raw.nutriscore || '').toUpperCase(),
    novaGroup: raw.nova_group || estimateNovaGroup(ingredientsList),
    ecoScore: '',
    nutrition: {
      energyKcal: parseFloat(nutri.energy_kcal) || 0,
      energyKj: parseFloat(nutri.energy_kj) || 0,
      fat: parseFloat(nutri.fat) || 0,
      saturatedFat: parseFloat(nutri.saturated_fat) || 0,
      carbohydrates: parseFloat(nutri.carbohydrates) || 0,
      sugars: parseFloat(nutri.sugars) || 0,
      fiber: parseFloat(nutri.fiber) || 0,
      proteins: parseFloat(nutri.proteins) || 0,
      salt: parseFloat(nutri.salt) || 0,
      sodium: parseFloat(nutri.sodium || 0) || 0,
    },
    hasNutritionData: Object.values(nutri).some(v => parseFloat(v) > 0),
    source: 'ai_vision',
    confidence: raw.confidence || 'medium',
  };
}

function estimatePercent(index, total) {
  if (total === 0) return 0;
  const estimates = [40, 20, 12, 8, 5, 4, 3, 2, 1.5, 1];
  if (index < estimates.length) return estimates[index];
  return Math.max(0.5, 1 - index * 0.1);
}

function isLikelyAdditive(name) {
  const lower = name.toLowerCase();
  if (/^e\d{3,4}[a-z]?$/i.test(lower)) return true;
  const additiveKeywords = [
    'msg', 'monosodium glutamate', 'citric acid', 'ascorbic acid',
    'sodium benzoate', 'potassium sorbate', 'sodium nitrite',
    'sodium nitrate', 'bha', 'bht', 'tartrazine', 'sunset yellow',
    'allura red', 'ponceau', 'brilliant blue', 'indigo carmine',
    'xanthan gum', 'carrageenan', 'soy lecithin', 'emulsifier',
    'stabilizer', 'stabiliser', 'thickener', 'preservative',
    'artificial flavour', 'artificial flavor', 'nature identical',
    'humectant', 'anti-caking', 'raising agent', 'acidity regulator',
  ];
  return additiveKeywords.some(kw => lower.includes(kw));
}

function estimateNovaGroup(ingredients) {
  if (!ingredients || ingredients.length === 0) return 0;
  const lower = ingredients.map(i => (typeof i === 'string' ? i : '').toLowerCase());
  const additiveCount = lower.filter(i => isLikelyAdditive(i)).length;
  if (additiveCount > 5 || ingredients.length > 15) return 4;
  if (additiveCount > 2 || ingredients.length > 10) return 3;
  const processedIngredients = ['sugar', 'salt', 'oil', 'butter', 'flour', 'cream'];
  const processedCount = lower.filter(i => processedIngredients.some(p => i.includes(p))).length;
  if (processedCount > 0 && ingredients.length <= 5) return 2;
  return 1;
}
