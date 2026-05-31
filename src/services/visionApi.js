/**
 * AI Vision API service
 * Sends product label images to mimo-v2.5-pro (multimodal) via Command Code
 * Extracts ingredients, nutrition, and additives from label photos
 */

import Config, { getApiKey } from '../config';

const VISION_PROMPT = `You are a food label analyzer. Look at this image of a food product label/ingredient list.

Extract the following information and return it as a valid JSON object (no markdown, no code blocks, just raw JSON):

{
  "productName": "product name if visible, otherwise empty string",
  "brand": "brand name if visible, otherwise empty string",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "ingredientsText": "full raw ingredients text as written on label",
  "nutrition": {
    "energyKcal": number or 0,
    "fat": number or 0,
    "saturatedFat": number or 0,
    "carbohydrates": number or 0,
    "sugars": number or 0,
    "fiber": number or 0,
    "proteins": number or 0,
    "salt": number or 0
  },
  "servingSize": "serving size if visible, otherwise empty string",
  "confidence": "high" | "medium" | "low"
}

Rules:
- nutrition values are per 100g (convert if per serving is shown)
- if a value is not visible, use 0
- extract ALL ingredients, even if the list is long
- confidence is "high" if text is clear, "medium" if slightly blurry, "low" if hard to read
- return ONLY the JSON object, nothing else`;

/**
 * Analyze a food label image using AI vision
 * @param {string} imageBase64 - Base64-encoded image data
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @returns {object} Parsed product data from the label
 */
export async function analyzeLabel(imageBase64, mimeType = 'image/jpeg') {
  const apiKey = await getApiKey();

  if (!apiKey) {
    throw new Error('API key not set. Go to Settings to configure your Command Code API key.');
  }

  const url = `${Config.COMMAND_CODE.BASE_URL}/chat/completions`;

  const body = {
    model: Config.COMMAND_CODE.MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: VISION_PROMPT,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
    temperature: 0.1, // Low temp for consistent extraction
  };

  console.log('[Ingro Vision] Sending image to AI...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Config.COMMAND_CODE.TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Vision API error ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from vision model');
    }

    console.log('[Ingro Vision] Raw response:', content.substring(0, 200));

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse JSON from vision response');
      }
    }

    return normalizeVisionResult(parsed);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Vision analysis timed out. Try again with a clearer photo.');
    }
    throw err;
  }
}

/**
 * Normalize the AI response into our app's data model
 */
function normalizeVisionResult(raw) {
  const ingredientsList = (raw.ingredients || []).filter(Boolean);
  const ingredientsText = raw.ingredientsText || ingredientsList.join(', ');

  // Build ingredients array with rank and additive detection
  const ingredients = ingredientsList.map((name, i) => ({
    id: `ai_${i}`,
    name: name.trim(),
    rank: i + 1,
    percent: estimatePercent(i, ingredientsList.length),
    vegan: true, // Default, we can't determine from label alone
    vegetarian: true,
    isAdditive: isLikelyAdditive(name.trim()),
  }));

  // Detect additives from ingredient names
  const additives = ingredientsList
    .filter((name) => isLikelyAdditive(name))
    .map((name) => ({
      id: extractAdditiveCode(name),
      name: name.trim(),
      risk: getAdditiveRiskLevel(extractAdditiveCode(name)),
    }));

  const nutri = raw.nutrition || {};

  return {
    barcode: '', // No barcode from label scan
    name: raw.productName || 'Scanned Product',
    brand: raw.brand || '',
    imageUrl: null,
    quantity: raw.servingSize || '',
    packaging: '',
    categories: [],
    labels: [],
    ingredients,
    ingredientsList,
    ingredientsText,
    additives,
    nutriscore: '',
    novaGroup: estimateNovaGroup(ingredientsList),
    ecoScore: '',
    nutrition: {
      energyKcal: parseFloat(nutri.energyKcal) || 0,
      energyKj: parseFloat(nutri.energyKj) || 0,
      fat: parseFloat(nutri.fat) || 0,
      saturatedFat: parseFloat(nutri.saturatedFat) || 0,
      carbohydrates: parseFloat(nutri.carbohydrates) || 0,
      sugars: parseFloat(nutri.sugars) || 0,
      fiber: parseFloat(nutri.fiber) || 0,
      proteins: parseFloat(nutri.proteins) || 0,
      salt: parseFloat(nutri.salt) || 0,
      sodium: parseFloat(nutri.sodium) || 0,
    },
    hasNutritionData: Object.values(nutri).some((v) => v > 0),
    source: 'ai_vision',
    confidence: raw.confidence || 'medium',
  };
}

/**
 * Estimate ingredient percent by position (ingredients are listed in descending order)
 */
function estimatePercent(index, total) {
  if (total === 0) return 0;
  // First ingredient is ~40%, decreasing exponentially
  const estimates = [40, 20, 12, 8, 5, 4, 3, 2, 1.5, 1];
  if (index < estimates.length) return estimates[index];
  return Math.max(0.5, 1 - (index * 0.1));
}

/**
 * Check if an ingredient name looks like an additive
 */
function isLikelyAdditive(name) {
  const lower = name.toLowerCase();
  // E-number pattern
  if (/^e\d{3,4}[a-z]?$/i.test(lower)) return true;
  // Common additive names
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
  return additiveKeywords.some((kw) => lower.includes(kw));
}

/**
 * Extract additive code from name (e.g., "E102" from "E102 Tartrazine")
 */
function extractAdditiveCode(name) {
  const match = name.match(/^(E\d{3,4}[a-z]?)/i);
  if (match) return match[1].toUpperCase();
  return name; // Use full name as ID if no E-code
}

/**
 * Estimate NOVA group from ingredient list
 */
function estimateNovaGroup(ingredients) {
  if (!ingredients || ingredients.length === 0) return 0;
  const lower = ingredients.map((i) => i.toLowerCase());

  // NOVA 4 indicators: many additives, long list, industrial ingredients
  const additiveCount = lower.filter((i) => isLikelyAdditive(i)).length;
  if (additiveCount > 5 || ingredients.length > 15) return 4;
  if (additiveCount > 2 || ingredients.length > 10) return 3;

  // NOVA 2: processed culinary ingredients (oil, butter, sugar, salt)
  const processedIngredients = ['sugar', 'salt', 'oil', 'butter', 'flour', 'cream'];
  const processedCount = lower.filter((i) =>
    processedIngredients.some((p) => i.includes(p))
  ).length;
  if (processedCount > 0 && ingredients.length <= 5) return 2;

  // NOVA 1: unprocessed or minimally processed
  return 1;
}

/**
 * Map additive codes to risk levels (shared with api.js)
 */
function getAdditiveRiskLevel(code) {
  const codeUpper = (code || '').toUpperCase().replace(/^EN:E/, 'E');

  const highRisk = new Set([
    'E102', 'E104', 'E110', 'E123', 'E124', 'E127', 'E129',
    'E131', 'E133', 'E142', 'E150C', 'E150D',
    'E151', 'E154', 'E155', 'E173', 'E180',
    'E210', 'E211', 'E212', 'E213', 'E214', 'E215',
    'E216', 'E217', 'E218', 'E219',
    'E220', 'E221', 'E222', 'E223', 'E224', 'E225', 'E226', 'E227', 'E228',
    'E249', 'E250', 'E251', 'E252',
    'E310', 'E311', 'E312', 'E320', 'E321',
    'E385', 'E407', 'E407A', 'E413', 'E416', 'E425',
    'E431', 'E432', 'E433', 'E434', 'E435', 'E436',
    'E510', 'E513', 'E527', 'E553B',
    'E620', 'E621', 'E622', 'E623', 'E624', 'E625',
    'E924', 'E925', 'E926', 'E927', 'E928', 'E951', 'E952', 'E954',
  ]);

  const moderateRisk = new Set([
    'E100', 'E101', 'E120', 'E141', 'E143', 'E150A', 'E150B',
    'E153', 'E160A', 'E160B', 'E160C', 'E160D', 'E160E',
    'E170', 'E171', 'E172', 'E174',
    'E200', 'E201', 'E202', 'E203',
    'E230', 'E231', 'E232', 'E233', 'E234', 'E235', 'E236', 'E239',
    'E260', 'E261', 'E262', 'E263', 'E270', 'E280', 'E281', 'E282', 'E283',
    'E290', 'E296', 'E297',
    'E300', 'E301', 'E302', 'E304', 'E306', 'E307', 'E308', 'E309',
    'E315', 'E316', 'E322', 'E325', 'E326', 'E327', 'E330', 'E331', 'E332',
    'E333', 'E334', 'E335', 'E336', 'E337', 'E338', 'E339', 'E340', 'E341',
    'E342', 'E343', 'E350', 'E351', 'E352', 'E353', 'E354', 'E355', 'E356',
    'E357', 'E363',
    'E400', 'E401', 'E402', 'E403', 'E404', 'E405', 'E406',
    'E410', 'E412', 'E414', 'E415', 'E420', 'E421', 'E422', 'E440', 'E444',
    'E445', 'E450', 'E451', 'E452', 'E460', 'E461', 'E462', 'E463', 'E464',
    'E465', 'E466', 'E468', 'E469',
    'E470A', 'E470B', 'E471', 'E472', 'E473', 'E474', 'E475', 'E476',
    'E477', 'E479B', 'E481', 'E482', 'E483', 'E491', 'E492', 'E493',
    'E494', 'E495', 'E500', 'E501', 'E503', 'E504', 'E507', 'E508', 'E509',
    'E511', 'E514', 'E515', 'E516', 'E517', 'E518', 'E519', 'E520', 'E521',
    'E522', 'E523', 'E524', 'E525', 'E526', 'E529', 'E530', 'E535', 'E536',
    'E538', 'E541', 'E542', 'E545', 'E551', 'E552', 'E553A', 'E554', 'E555',
    'E556', 'E558', 'E559', 'E570', 'E574', 'E575', 'E576', 'E577', 'E578',
    'E579', 'E585', 'E586',
    'E620', 'E621', 'E622', 'E623', 'E624', 'E625', 'E626', 'E627',
    'E628', 'E629', 'E630', 'E631', 'E632', 'E633', 'E634', 'E635', 'E640',
    'E900', 'E901', 'E902', 'E903', 'E904', 'E905', 'E907',
    'E912', 'E914', 'E920', 'E921', 'E950', 'E951', 'E952', 'E953',
    'E954', 'E955', 'E957', 'E959', 'E960', 'E961', 'E962', 'E963',
    'E965', 'E966', 'E967', 'E968', 'E969', 'E999',
    'E1100', 'E1101', 'E1102', 'E1103', 'E1104', 'E1105',
    'E1200', 'E1201', 'E1202', 'E1203', 'E1204',
    'E1400', 'E1401', 'E1402', 'E1403', 'E1404',
    'E1410', 'E1412', 'E1413', 'E1414',
    'E1420', 'E1421', 'E1422', 'E1440', 'E1442',
    'E1450', 'E1451', 'E1452',
    'E1505', 'E1510', 'E1517', 'E1518', 'E1519',
    'E1520', 'E1521',
  ]);

  if (highRisk.has(codeUpper)) return 'high';
  if (moderateRisk.has(codeUpper)) return 'moderate';
  if (codeUpper.startsWith('E')) return 'low';
  return 'unknown';
}
