/**
 * Ingro API — product lookup service.
 * All calls go through the backend proxy at api/ingro on objectifylab.com.
 */

import { apiCall } from './apiClient';

/**
 * Look up a product by barcode via the backend (which proxies Open Food Facts).
 * @param {string} barcode - EAN-13, EAN-8, UPC-A, or UPC-E barcode
 * @returns {object|null} Normalized product data, or null if not found
 */
export async function fetchProduct(barcode) {
  console.log('[Ingro API] Looking up barcode via backend:', barcode);
  
  const data = await apiCall('/scan/barcode', {
    method: 'POST',
    body: JSON.stringify({ barcode }),
  });

  // Backend returns { found: false } for products not in Open Food Facts
  if (!data.found && data.found !== undefined) {
    console.log('[Ingro API] Product not found in OFF:', barcode);
    return null;
  }

  // If found is not present, it's a successful product lookup — normalize the response
  return normalizeBackendResponse(data);
}

/**
 * Analyze a food label image via the backend (which handles AI vision).
 * @param {string} imageBase64 - Base64-encoded JPEG image
 * @returns {object} Normalized product data from label analysis
 */
export async function analyzeLabel(imageBase64) {
  console.log('[Ingro API] Sending label image via backend...');

  const data = await apiCall('/scan/label', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64 }),
  });

  // Backend's vision endpoint returns normalized product data already
  return normalizeBackendResponse({
    ...data,
    source: 'ai_vision',
    confidence: data.confidence || 'medium',
  });
}

/**
 * Normalize backend response (snake_case) to frontend data model (camelCase).
 * The backend returns: ingredients_text, image_url, nova_group, energy_kcal, etc.
 * The frontend expects: ingredientsText, imageUrl, novaGroup, energyKcal, etc.
 */
function normalizeBackendResponse(raw) {
  // Fix ingredients: backend returns ingredients array directly
  const ingredients = (raw.ingredients || []).map((ing, i) => ({
    id: ing.id || `ing_${i}`,
    name: ing.name || ing.id || '',
    rank: ing.rank || i + 1,
    percent: ing.percent || ing.percent_estimate || 0,
    vegan: ing.vegan !== false,
    vegetarian: ing.vegetarian !== false,
    isAdditive: (ing.is_additive) || (ing.id || '').startsWith('en:e'),
  }));

  const ingredientsText = raw.ingredients_text || '';
  const ingredientsList = ingredientsText
    ? ingredientsText.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    : [];

  // Fix additives: backend returns [{id, name, risk}]
  const additives = (raw.additives || []).map(add => ({
    id: add.id || '',
    name: add.name || '',
    risk: add.risk || getAdditiveRiskLevel(add.id || ''),
  }));

  // Fix nutrition: backend uses energy_kcal, saturated_fat, etc.
  const nutri = raw.nutrition || {};
  const nutrition = {
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
  };

  return {
    barcode: raw.barcode || '',
    name: raw.name || 'Unknown Product',
    brand: raw.brand || '',
    imageUrl: raw.image_url || null,
    quantity: raw.quantity || '',
    packaging: raw.packaging || '',
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    labels: Array.isArray(raw.labels) ? raw.labels : [],
    ingredients,
    ingredientsList,
    ingredientsText,
    additives,
    nutriscore: (raw.nutriscore || '').toUpperCase(),
    novaGroup: raw.nova_group || 0,
    ecoScore: (raw.eco_score || raw.ecoScore || '').toUpperCase(),
    nutrition,
    hasNutritionData: Object.values(nutrition).filter(v => v > 0).length > 0,
    source: raw.source || 'open_food_facts',
    confidence: raw.confidence || null,
  };
}

/**
 * Map additive codes to a rough risk level.
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
    'E385', 'E407', 'E407A',
    'E413', 'E416', 'E425',
    'E431', 'E432', 'E433', 'E434', 'E435', 'E436',
    'E510', 'E513', 'E527', 'E553B',
    'E620', 'E621', 'E622', 'E623', 'E624', 'E625',
    'E924', 'E925', 'E926', 'E927', 'E928', 'E951', 'E952', 'E954',
  ]);

  const moderateRisk = new Set([
    'E100', 'E101', 'E120', 'E141', 'E143', 'E150A', 'E150B',
    'E153', 'E160A', 'E160B', 'E160C', 'E160D', 'E160E',
    'E161', 'E162', 'E163', 'E170', 'E171', 'E172', 'E174',
    'E200', 'E201', 'E202', 'E203',
    'E230', 'E231', 'E232', 'E233', 'E234', 'E235', 'E236', 'E239',
    'E240', 'E242', 'E260', 'E261', 'E262', 'E263', 'E270', 'E280', 'E281', 'E282', 'E283',
    'E290', 'E296', 'E297',
    'E300', 'E301', 'E302', 'E304', 'E306', 'E307', 'E308', 'E309',
    'E315', 'E316', 'E322', 'E325', 'E326', 'E327', 'E330', 'E331', 'E332', 'E333', 'E334',
    'E335', 'E336', 'E337', 'E338', 'E339', 'E340', 'E341', 'E342', 'E343',
    'E350', 'E351', 'E352', 'E353', 'E354', 'E355', 'E356', 'E357', 'E363',
    'E400', 'E401', 'E402', 'E403', 'E404', 'E405', 'E406',
    'E410', 'E412', 'E414', 'E415',
    'E420', 'E421', 'E422', 'E440', 'E444', 'E445',
    'E450', 'E451', 'E452', 'E460', 'E461', 'E462', 'E463', 'E464', 'E465', 'E466', 'E468', 'E469',
    'E470A', 'E470B', 'E471', 'E472', 'E473', 'E474', 'E475', 'E476', 'E477', 'E479B',
    'E481', 'E482', 'E483', 'E491', 'E492', 'E493', 'E494', 'E495',
    'E500', 'E501', 'E503', 'E504',
    'E507', 'E508', 'E509', 'E511', 'E514', 'E515', 'E516', 'E517',
    'E518', 'E519', 'E520', 'E521', 'E522', 'E523', 'E524', 'E525',
    'E526', 'E529', 'E530', 'E535', 'E536', 'E538', 'E541', 'E542',
    'E545', 'E551', 'E552', 'E553A', 'E554', 'E555', 'E556', 'E558',
    'E559', 'E570', 'E574', 'E575', 'E576', 'E577', 'E578',
    'E579', 'E585', 'E586',
    'E900', 'E901', 'E902', 'E903', 'E904', 'E905', 'E907',
    'E912', 'E914', 'E920', 'E921', 'E922', 'E923',
    'E950', 'E951', 'E952', 'E953', 'E954', 'E955', 'E957',
    'E959', 'E960', 'E961', 'E962', 'E963', 'E965', 'E966',
    'E967', 'E968', 'E969', 'E999',
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

/**
 * Get a human-readable explanation for a given additive code.
 */
export function getAdditiveExplanation(code) {
  const db = {
    'E100': 'Curcumin (turmeric) — natural colour, generally safe.',
    'E101': 'Riboflavin (Vitamin B2) — natural colour/supplement, safe.',
    'E102': 'Tartrazine — synthetic yellow dye. Linked to hyperactivity in some studies.',
    'E104': 'Quinoline Yellow — synthetic dye. Banned in several countries, potential allergen.',
    'E110': 'Sunset Yellow FCF — synthetic orange dye. May cause allergic reactions.',
    'E120': 'Cochineal / Carminic acid — natural red from insects. Safe but not vegan.',
    'E123': 'Amaranth — synthetic red dye. Banned in the US, potential carcinogen concerns.',
    'E124': 'Ponceau 4R — synthetic red. May trigger asthma in sensitive individuals.',
    'E127': 'Erythrosine — synthetic red. Linked to thyroid effects in animal studies.',
    'E129': 'Allura Red AC — common synthetic red. Some studies suggest hyperactivity link.',
    'E131': 'Patent Blue V — synthetic blue. May cause allergic reactions.',
    'E133': 'Brilliant Blue FCF — synthetic blue. Generally considered low-risk.',
    'E142': 'Green S — synthetic green. Limited safety data.',
    'E150a': 'Plain caramel — food coloring from heated sugar. Generally safe.',
    'E150c': 'Ammonia caramel — processed colour. Potential contaminant 4-MEI concerns.',
    'E150d': 'Sulphite ammonia caramel — common in colas. Contains 4-MEI, possible carcinogen.',
    'E151': 'Brilliant Black BN — synthetic black. May cause intolerance in some.',
    'E153': 'Carbon black / Vegetable carbon — black colour. Generally safe.',
    'E155': 'Brown HT — synthetic brown. May cause intolerance.',
    'E160a': 'Beta-carotene — natural provitamin A. Safe, also a nutrient.',
    'E160b': 'Annatto — natural orange-red from achiote seeds. Generally safe.',
    'E160c': 'Paprika extract / Capsanthin — natural colour. Safe.',
    'E162': 'Beetroot Red (Betanin) — natural red from beets. Safe.',
    'E163': 'Anthocyanins — natural colours from fruits. Safe, antioxidant.',
    'E170': 'Calcium carbonate — mineral, safe at food levels.',
    'E171': 'Titanium dioxide — whitener, EU banned in 2022 over genotoxicity concerns.',
    'E172': 'Iron oxides — natural mineral colours. Generally safe.',
    'E173': 'Aluminium — metallic colour. Potential neurotoxin, avoid.',
    'E200': 'Sorbic acid — preservative. Generally safe.',
    'E202': 'Potassium sorbate — common preservative. Generally safe.',
    'E210': 'Benzoic acid — preservative. May form benzene with vitamin C.',
    'E211': 'Sodium benzoate — common preservative. May form benzene with ascorbic acid.',
    'E220': 'Sulphur dioxide — preservative. Can trigger asthma in sensitive people.',
    'E249': 'Potassium nitrite — curing agent. Can form nitrosamines (carcinogens).',
    'E250': 'Sodium nitrite — curing agent in processed meats. WHO Group 2A carcinogen.',
    'E251': 'Sodium nitrate — preservative in meats. Can form nitrosamines.',
    'E252': 'Potassium nitrate — curing agent. Similar concerns as E251.',
    'E260': 'Acetic acid (vinegar) — natural preservative. Safe.',
    'E270': 'Lactic acid — natural acid. Safe, found in yoghurt.',
    'E280': 'Propionic acid — preservative in baked goods. Generally safe.',
    'E290': 'Carbon dioxide — carbonation. Safe.',
    'E296': 'Malic acid — natural acid from apples. Safe.',
    'E300': 'Ascorbic acid (Vitamin C) — antioxidant nutrient. Safe, beneficial.',
    'E301': 'Sodium ascorbate — Vitamin C derivative. Safe.',
    'E302': 'Calcium ascorbate — Vitamin C source. Safe.',
    'E304': 'Ascorbyl palmitate — Vitamin C fat-soluble form. Safe.',
    'E306': 'Tocopherols (Vitamin E) — natural antioxidant. Safe, beneficial.',
    'E307': 'Alpha-tocopherol — synthetic Vitamin E. Safe.',
    'E310': 'Propyl gallate — antioxidant. Possible carcinogen concerns.',
    'E315': 'Erythorbic acid — antioxidant. Generally safe.',
    'E316': 'Sodium erythorbate — antioxidant. Generally safe.',
    'E320': 'BHA (Butylated hydroxyanisole) — synthetic antioxidant. IARC Group 2B.',
    'E321': 'BHT (Butylated hydroxytoluene) — synthetic antioxidant. Controversial.',
    'E322': 'Lecithin (usually soy) — emulsifier. Generally safe.',
    'E325': 'Sodium lactate — acidity regulator. Safe.',
    'E326': 'Potassium lactate — preservative. Safe.',
    'E327': 'Calcium lactate — acidity regulator, calcium source. Safe.',
    'E330': 'Citric acid — natural acid from citrus. Safe.',
    'E331': 'Sodium citrates — acidity regulators. Safe.',
    'E334': 'Tartaric acid — natural acid from grapes. Safe.',
    'E338': 'Phosphoric acid — acid in colas. May affect calcium absorption in excess.',
    'E339': 'Sodium phosphates — mineral salts. Generally safe in moderation.',
    'E340': 'Potassium phosphates — mineral salts. Generally safe.',
    'E341': 'Calcium phosphates — mineral salts, calcium source. Safe.',
    'E400': 'Alginic acid — thickener from seaweed. Safe.',
    'E401': 'Sodium alginate — thickener from seaweed. Safe.',
    'E406': 'Agar — thickener from seaweed. Safe.',
    'E407': 'Carrageenan — thickener from seaweed. Some studies link to GI inflammation.',
    'E410': 'Locust bean gum — thickener from carob. Safe.',
    'E412': 'Guar gum — thickener from legumes. Safe.',
    'E414': 'Acacia gum (Gum Arabic) — thickener. Safe.',
    'E415': 'Xanthan gum — fermented thickener. Generally safe.',
    'E420': 'Sorbitol — sugar alcohol sweetener. Can cause digestive upset in excess.',
    'E421': 'Mannitol — sugar alcohol. Can cause laxative effect.',
    'E422': 'Glycerol (glycerin) — humectant. Safe.',
    'E433': 'Polysorbate 80 — common emulsifier. Some studies suggest gut inflammation.',
    'E440': 'Pectin — thickener from fruit. Safe, beneficial fibre.',
    'E450': 'Diphosphates — raising agents / stabilisers. Generally safe.',
    'E451': 'Triphosphates — stabilisers. Generally safe in moderation.',
    'E452': 'Polyphosphates — stabilisers. Generally safe.',
    'E460': 'Microcrystalline cellulose — fibre/bulking agent. Safe.',
    'E461': 'Methyl cellulose — thickener. Safe.',
    'E464': 'Hydroxypropyl methylcellulose — thickener, vegan gel. Safe.',
    'E466': 'Carboxymethyl cellulose — thickener. Generally safe.',
    'E471': 'Mono- and diglycerides of fatty acids — emulsifiers. Generally safe.',
    'E472': 'Esters of mono- and diglycerides — emulsifiers. Generally safe.',
    'E476': 'Polyglycerol polyricinoleate (PGPR) — emulsifier used in chocolate. Generally safe.',
    'E481': 'Sodium stearoyl lactylate — dough conditioner. Generally safe.',
    'E500': 'Sodium carbonates — raising agents. Safe.',
    'E503': 'Ammonium carbonates — raising agents. Safe.',
    'E508': 'Potassium chloride — salt substitute. Safe.',
    'E509': 'Calcium chloride — firming agent. Safe.',
    'E551': 'Silicon dioxide — anti-caking. Generally safe.',
    'E621': 'Monosodium glutamate (MSG) — flavour enhancer. Safe for most people.',
    'E627': 'Disodium guanylate — flavour enhancer. Often paired with MSG.',
    'E631': 'Disodium inosinate — flavour enhancer. Generally safe.',
    'E635': 'Disodium 5-ribonucleotides — flavour enhancer. Generally safe.',
    'E901': 'Beeswax — glazing agent. Safe.',
    'E903': 'Carnauba wax — glazing agent from palm. Safe.',
    'E904': 'Shellac — glazing agent from insect secretion. Safe but not vegan.',
    'E920': 'L-cysteine — dough conditioner (often from feathers/hair). Safe.',
    'E950': 'Acesulfame K — artificial sweetener. Generally safe approved.',
    'E951': 'Aspartame — artificial sweetener. IARC Group 2B (possibly carcinogenic).',
    'E952': 'Cyclamic acid / Cyclamates — artificial sweetener. Banned in US.',
    'E954': 'Saccharin — artificial sweetener. Oldest artificial sweetener, generally safe.',
    'E955': 'Sucralose — artificial sweetener from sugar. Generally safe.',
    'E960': 'Steviol glycosides (Stevia) — natural plant sweetener. Safe.',
    'E967': 'Xylitol — natural sugar alcohol. Good for teeth, safe for humans.',
    'E968': 'Erythritol — sugar alcohol. Best digestive tolerance, generally safe.',
  };

  const codeUpper = (code || '').toUpperCase().replace(/^EN:E/, 'E');
  return db[codeUpper] || `Additive ${code}. Check official sources (EFSA/FDA) for full safety profile.`;
}

/**
 * Get allergen warnings from ingredient list.
 */
export function detectAllergens(product) {
  const allergenIngredients = {
    'milk': ['milk', 'cream', 'butter', 'cheese', 'whey', 'casein', 'lactose', 'dairy'],
    'eggs': ['egg', 'eggs', 'albumin', 'lecithin', 'ovalbumin'],
    'peanuts': ['peanut', 'peanuts', 'groundnut'],
    'tree nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia'],
    'soy': ['soy', 'soya', 'tofu', 'tempeh', 'soy lecithin', 'soybean'],
    'wheat/gluten': ['wheat', 'flour', 'gluten', 'semolina', 'spelt', 'barley', 'rye', 'oats', 'triticale'],
    'fish': ['fish', 'cod', 'salmon', 'tuna', 'sardine', 'anchovy'],
    'shellfish': ['shrimp', 'prawn', 'crab', 'lobster', 'mussel', 'clam', 'oyster', 'scallop', 'crustacean'],
    'sesame': ['sesame', 'til', 'tahini'],
    'sulphites': ['sulphite', 'sulfite', 'sulphur dioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228'],
  };

  const text = (product.ingredientsText || '').toLowerCase();
  const warnings = [];

  for (const [allergen, keywords] of Object.entries(allergenIngredients)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        warnings.push(allergen);
        break;
      }
    }
  }

  return warnings;
}
