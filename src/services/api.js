import Config from '../config';

const BASE_URL = Config.OPEN_FOOD_FACTS.BASE_URL;

/**
 * Look up a product by its barcode number with retry logic.
 * @param {string} barcode - EAN-13, EAN-8, UPC-A, or UPC-E barcode
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {object} Parsed product data with ingredients, nutrition, scores
 */
export async function fetchProduct(barcode, retries = Config.APP.MAX_RETRIES) {
  const url = `${BASE_URL}/product/${barcode}.json`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log('[Ingro API] Fetching:', url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Config.OPEN_FOOD_FACTS.TIMEOUT_MS);
      const response = await fetch(url, {
        headers: { 'User-Agent': Config.OPEN_FOOD_FACTS.USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('[Ingro API] Response status:', response.status);

      if (response.status === 429) {
        // Rate limited — wait and retry
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error('Too many requests. Please wait a moment and try again.');
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();

      if (json.status !== 1) {
        return null; // Product not found
      }

      return parseProduct(json.product);
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Normalize the raw API response into our app's data model.
 */
function parseProduct(raw) {
  const productName = raw.product_name || raw.product_name_en || 'Unknown Product';
  const brand = raw.brands || '';
  // Fix image URL — Open Food Facts sometimes returns relative paths
  let imageUrl = raw.image_url || raw.image_small_url || null;
  if (imageUrl && imageUrl.startsWith('//')) {
    imageUrl = 'https:' + imageUrl;
  } else if (imageUrl && imageUrl.startsWith('/')) {
    imageUrl = 'https://world.openfoodfacts.org' + imageUrl;
  }

  // --- Ingredients ---
  const ingredients = (raw.ingredients || []).map((ing) => ({
    id: ing.id,
    name: ing.text || ing.id,
    rank: ing.rank || 100,
    percent: ing.percent_estimate || 0,
    vegan: ing.vegan !== 'no',
    vegetarian: ing.vegetarian !== 'no',
    isAdditive: (ing.id || '').startsWith('en:e'),
  }));

  const ingredientsText = raw.ingredients_text || raw.ingredients_text_en || '';
  const ingredientsList = ingredientsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // --- Additives ---
  const additives = (raw.additives || []).map((add) => ({
    id: add.id || add.code || '',
    name: add.name || add.text || '',
    risk: getAdditiveRiskLevel(add.id || add.code || ''),
  }));

  // --- Nutri-Score ---
  const nutriscore = (raw.nutriscore_grade || raw.nutrition_grades || '').toUpperCase();

  // --- NOVA group ---
  const novaGroup = raw.nova_group || 0; // 1-4

  // --- Nutrition ---
  const nutri = raw.nutriments || {};

  // --- Eco-score ---
  const ecoScore = (raw.ecoscore_grade || '').toUpperCase();

  return {
    barcode: raw.code || '',
    name: productName,
    brand,
    imageUrl,
    quantity: raw.quantity || '',
    packaging: raw.packaging || '',
    categories: (raw.categories || '').split(',').map((c) => c.trim()).filter(Boolean),
    labels: (raw.labels || '').split(',').map((l) => l.trim()).filter(Boolean),
    ingredients,
    ingredientsList,
    ingredientsText,
    additives,
    nutriscore,
    novaGroup,
    ecoScore,
    nutrition: {
      energyKcal: parseFloat(nutri['energy-kcal_100g']) || 0,
      energyKj: parseFloat(nutri['energy_100g']) || 0,
      fat: parseFloat(nutri['fat_100g']) || 0,
      saturatedFat: parseFloat(nutri['saturated-fat_100g']) || 0,
      carbohydrates: parseFloat(nutri['carbohydrates_100g']) || 0,
      sugars: parseFloat(nutri['sugars_100g']) || 0,
      fiber: parseFloat(nutri['fiber_100g']) || 0,
      proteins: parseFloat(nutri['proteins_100g']) || 0,
      salt: parseFloat(nutri['salt_100g']) || 0,
      sodium: parseFloat(nutri['sodium_100g']) || 0,
    },
    // Flag whether this has enough data for a reliable score
    hasNutritionData: Object.values(nutri).filter((v) => v != null).length > 0,
    source: 'open_food_facts',
  };
}

/**
 * Map additive codes to a rough risk level.
 * Sources: EFSA, FDA, Codex Alimentarius
 */
function getAdditiveRiskLevel(code) {
  const codeUpper = (code || '').toUpperCase().replace(/^EN:E/, 'E');

  // Known harmful / high-risk additives
  const highRisk = new Set([
    'E102', 'E104', 'E110', 'E123', 'E124', 'E127', 'E129',
    'E131', 'E133', 'E142', 'E150C', 'E150D',
    'E151', 'E154', 'E155', 'E173', 'E180',
    'E210', 'E211', 'E212', 'E213', 'E214', 'E215',
    'E216', 'E217', 'E218', 'E219',
    'E220', 'E221', 'E222', 'E223', 'E224', 'E225', 'E226', 'E227', 'E228',
    'E249', 'E250', 'E251', 'E252',
    'E310', 'E311', 'E312', 'E320', 'E321',
    'E385',
    'E407', 'E407A',
    'E413', 'E416',
    'E425',
    'E431', 'E432', 'E433', 'E434', 'E435', 'E436',
    'E510', 'E513', 'E527',
    'E553B',
    'E620', 'E621', 'E622', 'E623', 'E624', 'E625',
    'E924', 'E925', 'E926', 'E927', 'E928', 'E951', 'E952', 'E954',
  ]);

  // Moderate concern additives
  const moderateRisk = new Set([
    'E100', 'E101', 'E120', 'E141', 'E143', 'E150A', 'E150B',
    'E153', 'E160A', 'E160B', 'E160C', 'E160D', 'E160E',
    'E161', 'E162', 'E163',
    'E170', 'E171', 'E172', 'E174',
    'E200', 'E201', 'E202', 'E203',
    'E230', 'E231', 'E232', 'E233', 'E234', 'E235', 'E236', 'E239',
    'E240', 'E242',
    'E260', 'E261', 'E262', 'E263', 'E270', 'E280', 'E281', 'E282', 'E283',
    'E290',
    'E296', 'E297',
    'E300', 'E301', 'E302', 'E304', 'E306', 'E307', 'E308', 'E309',
    'E315', 'E316', 'E322',
    'E325', 'E326', 'E327', 'E330', 'E331', 'E332', 'E333', 'E334',
    'E335', 'E336', 'E337', 'E338', 'E339', 'E340', 'E341', 'E342', 'E343',
    'E350', 'E351', 'E352', 'E353', 'E354', 'E355', 'E356', 'E357',
    'E363',
    'E400', 'E401', 'E402', 'E403', 'E404', 'E405', 'E406',
    'E410', 'E412', 'E414', 'E415',
    'E420', 'E421', 'E422',
    'E440',
    'E444', 'E445',
    'E450', 'E451', 'E452', 'E460', 'E461', 'E462', 'E463', 'E464',
    'E465', 'E466', 'E468', 'E469',
    'E470A', 'E470B', 'E471', 'E472', 'E473', 'E474', 'E475', 'E476',
    'E477', 'E479B',
    'E481', 'E482', 'E483', 'E491', 'E492', 'E493', 'E494', 'E495',
    'E500', 'E501', 'E503', 'E504',
    'E507', 'E508', 'E509', 'E511', 'E514', 'E515', 'E516', 'E517',
    'E518', 'E519', 'E520', 'E521', 'E522', 'E523', 'E524', 'E525',
    'E526', 'E529', 'E530', 'E535', 'E536', 'E538', 'E541', 'E542',
    'E545', 'E551', 'E552', 'E553A', 'E554', 'E555', 'E556', 'E558',
    'E559', 'E570', 'E574', 'E575', 'E576', 'E577', 'E578',
    'E579', 'E585', 'E586',
    'E620', 'E621', 'E622', 'E623', 'E624', 'E625', 'E626', 'E627',
    'E628', 'E629', 'E630', 'E631', 'E632', 'E633', 'E634', 'E635',
    'E640',
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
    'E102': 'Tartrazine — synthetic yellow dye. Linked to hyperactivity in some studies. Avoid if sensitive.',
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
    'E150b': 'Caustic sulphite caramel — processed caramel colour.',
    'E150c': 'Ammonia caramel — processed colour. Potential contaminant 4-MEI concerns.',
    'E150d': 'Sulphite ammonia caramel — common in colas. Contains 4-MEI, possible carcinogen.',
    'E151': 'Brilliant Black BN — synthetic black. May cause intolerance in some.',
    'E153': 'Carbon black / Vegetable carbon — black colour. Generally safe.',
    'E154': 'Brown FK — synthetic brown. Banned in several countries.',
    'E155': 'Brown HT — synthetic brown. May cause intolerance.',
    'E160a': 'Beta-carotene — natural provitamin A. Safe, also a nutrient.',
    'E160c': 'Paprika extract / Capsanthin — natural colour. Safe.',
    'E161': 'Lutein — natural plant pigment. Safe, beneficial for eye health.',
    'E162': 'Beetroot Red (Betanin) — natural red from beets. Safe.',
    'E163': 'Anthocyanins — natural colours from fruits. Safe, antioxidant.',
    'E170': 'Calcium carbonate — mineral, safe at food levels.',
    'E171': 'Titanium dioxide — whitener, EU banned in 2022 over genotoxicity concerns.',
    'E172': 'Iron oxides — natural mineral colours. Generally safe.',
    'E173': 'Aluminium — metallic colour. Potential neurotoxin, avoid.',
    'E174': 'Silver — metallic colour. Generally safe in tiny amounts.',
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
    'E304': 'Ascorbyl palmitate — Vitamin C fat-soluble form. Safe.',
    'E306': 'Tocopherols (Vitamin E) — natural antioxidant. Safe, beneficial.',
    'E307': 'Alpha-tocopherol — synthetic Vitamin E. Safe.',
    'E310': 'Propyl gallate — antioxidant. Possible carcinogen concerns.',
    'E311': 'Octyl gallate — antioxidant. Limited safety data.',
    'E312': 'Dodecyl gallate — antioxidant. Limited safety data.',
    'E315': 'Erythorbic acid — antioxidant. Generally safe.',
    'E316': 'Sodium erythorbate — antioxidant. Generally safe.',
    'E320': 'BHA (Butylated hydroxyanisole) — synthetic antioxidant. Possible carcinogen, IARC Group 2B.',
    'E321': 'BHT (Butylated hydroxytoluene) — synthetic antioxidant. Controversial, some studies show harm.',
    'E322': 'Lecithin (usually soy) — emulsifier. Generally safe.',
    'E325': 'Sodium lactate — acidity regulator. Safe.',
    'E326': 'Potassium lactate — preservative. Safe.',
    'E327': 'Calcium lactate — acidity regulator, calcium source. Safe.',
    'E330': 'Citric acid — natural acid from citrus. Safe.',
    'E331': 'Sodium citrates — acidity regulators. Safe.',
    'E334': 'Tartaric acid — natural acid from grapes. Safe.',
    'E335': 'Sodium tartrate — acidity regulator. Safe.',
    'E338': 'Phosphoric acid — acid in colas. May affect calcium absorption in excess.',
    'E339': 'Sodium phosphates — mineral salts. Generally safe in moderation.',
    'E340': 'Potassium phosphates — mineral salts. Generally safe.',
    'E341': 'Calcium phosphates — mineral salts, calcium source. Safe.',
    'E350': 'Sodium malate — acidity regulator. Safe.',
    'E352': 'Calcium malate — acidity regulator. Safe.',
    'E355': 'Adipic acid — acidity regulator. Generally safe.',
    'E363': 'Succinic acid — natural acid. Safe.',
    'E385': 'Calcium disodium EDTA — preservative. Can chelate minerals, moderate concern.',
    'E400': 'Alginic acid — thickener from seaweed. Safe.',
    'E401': 'Sodium alginate — thickener from seaweed. Safe.',
    'E402': 'Potassium alginate — thickener. Safe.',
    'E403': 'Ammonium alginate — thickener. Safe.',
    'E404': 'Calcium alginate — thickener. Safe.',
    'E405': 'Propylene glycol alginate — thickener. Generally safe.',
    'E406': 'Agar — thickener from seaweed. Safe.',
    'E407': 'Carrageenan — thickener from seaweed. Some studies link to GI inflammation.',
    'E410': 'Locust bean gum — thickener from carob. Safe.',
    'E412': 'Guar gum — thickener from legumes. Safe.',
    'E413': 'Tragacanth gum — thickener. Moderate concern for allergic reactions.',
    'E414': 'Acacia gum (Gum Arabic) — thickener. Safe.',
    'E415': 'Xanthan gum — fermented thickener. Generally safe.',
    'E416': 'Karaya gum — thickener. Potential allergen.',
    'E420': 'Sorbitol — sugar alcohol sweetener. Can cause digestive upset in excess.',
    'E421': 'Mannitol — sugar alcohol. Can cause laxative effect.',
    'E422': 'Glycerol (glycerin) — humectant. Safe.',
    'E425': 'Konjac gum — thickener. Can swell and cause choking if not prepared properly.',
    'E431': 'Polyoxyethylene stearate — emulsifier. Limited safety data.',
    'E432': 'Polysorbate 20 — emulsifier. Possible gut barrier effects.',
    'E433': 'Polysorbate 80 — common emulsifier. Some studies suggest gut inflammation.',
    'E440': 'Pectin — thickener from fruit. Safe, beneficial fibre.',
    'E450': 'Diphosphates — raising agents / stabilisers. Generally safe.',
    'E451': 'Triphosphates — stabilisers. Generally safe in moderation.',
    'E452': 'Polyphosphates — stabilisers. Generally safe.',
    'E460': 'Microcrystalline cellulose — fibre/bulking agent. Safe.',
    'E461': 'Methyl cellulose — thickener. Safe.',
    'E463': 'Hydroxypropyl cellulose — thickener. Safe.',
    'E464': 'Hydroxypropyl methylcellulose — thickener, vegan gel. Safe.',
    'E466': 'Carboxymethyl cellulose — thickener. Generally safe.',
    'E468': 'Crosslinked sodium carboxymethyl cellulose — thickener. Generally safe.',
    'E469': 'Enzymatically hydrolysed carboxymethyl cellulose — Generally safe.',
    'E470a': 'Sodium / potassium / calcium salts of fatty acids — emulsifiers. Safe.',
    'E470b': 'Magnesium salts of fatty acids — emulsifiers. Safe.',
    'E471': 'Mono- and diglycerides of fatty acids — emulsifiers. Generally safe.',
    'E472': 'Esters of mono- and diglycerides — emulsifiers. Generally safe.',
    'E473': 'Sucrose esters of fatty acids — emulsifiers. Generally safe.',
    'E474': 'Sucroglycerides — emulsifiers. Generally safe.',
    'E475': 'Polyglycerol esters of fatty acids — emulsifiers. Generally safe.',
    'E476': 'Polyglycerol polyricinoleate (PGPR) — emulsifier used in chocolate. Generally safe.',
    'E477': 'Propylene glycol esters of fatty acids — emulsifiers. Generally safe.',
    'E481': 'Sodium stearoyl lactylate — dough conditioner. Generally safe.',
    'E482': 'Calcium stearoyl lactylate — dough conditioner. Generally safe.',
    'E491': 'Sorbitan monostearate — emulsifier. Generally safe.',
    'E492': 'Sorbitan tristearate — emulsifier. Generally safe.',
    'E500': 'Sodium carbonates — raising agents. Safe.',
    'E501': 'Potassium carbonates — acidity regulators. Safe.',
    'E503': 'Ammonium carbonates — raising agents. Safe.',
    'E504': 'Magnesium carbonates — anti-caking. Safe.',
    'E507': 'Hydrochloric acid — acidity regulator. Safe at food levels.',
    'E508': 'Potassium chloride — salt substitute. Safe.',
    'E509': 'Calcium chloride — firming agent. Safe.',
    'E510': 'Calcium chloride (new) — Generally safe.',
    'E511': 'Magnesium chloride — firming agent. Safe.',
    'E513': 'Sulphuric acid — acidity regulator. Safe at food levels.',
    'E514': 'Sodium sulphates — acidity regulators. Generally safe.',
    'E515': 'Potassium sulphates — mineral salts. Generally safe.',
    'E516': 'Calcium sulphate — coagulant (tofu). Safe.',
    'E517': 'Ammonium sulphate — acidity regulator. Generally safe.',
    'E520': 'Aluminium sulphate — firming agent. Aluminium concerns.',
    'E521': 'Aluminium sodium sulphate — firming agent. Aluminium concerns.',
    'E522': 'Aluminium potassium sulphate — firming agent. Aluminium concerns.',
    'E524': 'Sodium hydroxide — acidity regulator. Safe at food levels.',
    'E525': 'Potassium hydroxide — acidity regulator. Safe.',
    'E526': 'Calcium hydroxide — firming agent. Safe.',
    'E527': 'Ammonium hydroxide — acidity regulator. Safe at food levels.',
    'E529': 'Calcium oxide — acidity regulator. Safe.',
    'E530': 'Magnesium oxide — anti-caking, magnesium source. Safe.',
    'E535': 'Sodium ferrocyanide — anti-caking. Generally safe in tiny amounts.',
    'E536': 'Potassium ferrocyanide — anti-caking. Generally safe.',
    'E541': 'Sodium aluminium phosphate — raising agent. Aluminium concerns.',
    'E551': 'Silicon dioxide — anti-caking. Generally safe.',
    'E552': 'Calcium silicate — anti-caking. Generally safe.',
    'E553a': 'Magnesium silicate / Talc — anti-caking. Inhalation risk (not ingestion).',
    'E553b': 'Talc — anti-caking. Possible contamination concerns.',
    'E554': 'Sodium aluminium silicate — anti-caking. Aluminium concerns.',
    'E555': 'Potassium aluminium silicate — anti-caking. Aluminium concerns.',
    'E556': 'Calcium aluminium silicate — anti-caking. Aluminium concerns.',
    'E558': 'Bentonite — anti-caking. Generally safe.',
    'E559': 'Kaolin (aluminium silicate) — anti-caking. Generally safe.',
    'E570': 'Stearic acid (fatty acid) — glazing agent. Safe.',
    'E574': 'Gluconic acid — acidity regulator. Safe.',
    'E575': 'Glucono delta-lactone — acidity regulator. Safe.',
    'E576': 'Sodium gluconate — sequestrant. Safe.',
    'E577': 'Potassium gluconate — mineral salt. Safe.',
    'E578': 'Calcium gluconate — mineral salt, calcium source. Safe.',
    'E579': 'Ferrous gluconate — iron source (food colouring for olives). Safe.',
    'E585': 'Ferrous lactate — iron source. Safe.',
    'E586': '4-hexylresorcinol — anti-browning. Generally safe.',
    'E620': 'Glutamic acid — flavour enhancer. Generally safe.',
    'E621': 'Monosodium glutamate (MSG) — flavour enhancer. Safe for most people; some report sensitivity.',
    'E622': 'Monopotassium glutamate — flavour enhancer. Similar to MSG.',
    'E623': 'Calcium glutamate — flavour enhancer. Generally safe.',
    'E624': 'Monoammonium glutamate — flavour enhancer. Generally safe.',
    'E625': 'Magnesium glutamate — flavour enhancer. Generally safe.',
    'E626': 'Guanylic acid — flavour enhancer. Generally safe.',
    'E627': 'Disodium guanylate — flavour enhancer. Often paired with MSG. Generally safe.',
    'E630': 'Inosinic acid — flavour enhancer. Generally safe.',
    'E631': 'Disodium inosinate — flavour enhancer. Generally safe.',
    'E635': 'Disodium 5-ribonucleotides — flavour enhancer. Generally safe.',
    'E640': 'Glycine — amino acid, sweetener. Safe.',
    'E900': 'Dimethylpolysiloxane — anti-foaming agent. Generally safe.',
    'E901': 'Beeswax — glazing agent. Safe.',
    'E902': 'Candelilla wax — glazing agent from plant. Safe.',
    'E903': 'Carnauba wax — glazing agent from palm. Safe.',
    'E904': 'Shellac — glazing agent from insect secretion. Safe but not vegan.',
    'E905': 'Microcrystalline wax — glazing agent. Generally safe.',
    'E907': 'Hydrogenated poly-1-decene — glazing agent. Limited data.',
    'E912': 'Montanic acid esters — glazing agent. Generally safe.',
    'E914': 'Oxidised polyethylene wax — glazing agent. Limited data.',
    'E920': 'L-cysteine — dough conditioner (often from feathers/hair). Safe.',
    'E921': 'L-cystine — dough conditioner. Generally safe.',
    'E924': 'Potassium bromate — flour bleaching agent. Banned in EU, UK, Canada; possible carcinogen.',
    'E925': 'Chlorine — flour bleaching. Limited safety data.',
    'E926': 'Chlorine dioxide — flour bleaching. Generally safe at food levels.',
    'E927': 'Azodicarbonamide — flour bleaching. Banned in EU, concerns about breakdown to urethane.',
    'E928': 'Benzoyl peroxide — flour bleaching. Generally safe at food levels.',
    'E950': 'Acesulfame K — artificial sweetener. Generally safe approved.',
    'E951': 'Aspartame — artificial sweetener. IARC Group 2B (possibly carcinogenic). Controversial.',
    'E952': 'Cyclamic acid / Cyclamates — artificial sweetener. Banned in US.',
    'E953': 'Isomalt — sugar alcohol sweetener. Safe, may cause digestive upset.',
    'E954': 'Saccharin — artificial sweetener. Oldest artificial sweetener, generally safe.',
    'E955': 'Sucralose — artificial sweetener from sugar. Generally safe.',
    'E957': 'Thaumatin — natural sweetener from plant. Safe.',
    'E959': 'Neohesperidin DC — intense sweetener. Generally safe.',
    'E960': 'Steviol glycosides (Stevia) — natural plant sweetener. Safe.',
    'E961': 'Neotame — artificial sweetener. Generally safe.',
    'E962': 'Aspartame-acesulfame salt — combo sweetener. See E951 concerns.',
    'E963': 'Tagatose — low-calorie sugar. Generally safe.',
    'E965': 'Maltitol — sugar alcohol. Lower glycemic but can cause digestive upset.',
    'E966': 'Lactitol — sugar alcohol. Generally safe.',
    'E967': 'Xylitol — natural sugar alcohol. Good for teeth, toxic to dogs. Safe for humans.',
    'E968': 'Erythritol — sugar alcohol. Best digestive tolerance, generally safe.',
    'E969': 'Advantame — intense sweetener. Generally safe.',
    'E999': 'Quillaia extract — foaming agent. Generally safe.',
    'E1100': 'Invertase — enzyme. Safe.',
    'E1101': 'Protease — enzyme. Safe.',
    'E1103': 'Invertase — enzyme. Safe.',
    'E1105': 'Lysozyme — preservative from egg. Generally safe but allergen.',
    'E1200': 'Polydextrose — bulking fibre. Safe.',
    'E1201': 'Polyvinylpyrrolidone — stabiliser. Generally safe.',
    'E1202': 'Polyvinylpolypyrrolidone — stabiliser. Generally safe.',
    'E1203': 'Polyvinyl alcohol — coating agent. Generally safe at food levels.',
    'E1204': 'Pullulan — film-forming agent. Generally safe.',
    'E1400': 'Dextrin — stabiliser. Safe.',
    'E1404': 'Oxidized starch — thickener. Generally safe.',
    'E1410': 'Monostarch phosphate — thickener. Generally safe.',
    'E1412': 'Distarch phosphate — thickener. Generally safe.',
    'E1414': 'Acetylated distarch phosphate — thickener. Generally safe.',
    'E1420': 'Acetylated starch — thickener. Generally safe.',
    'E1422': 'Acetylated distarch adipate — thickener. Generally safe.',
    'E1440': 'Hydroxypropyl starch — thickener. Generally safe.',
    'E1442': 'Hydroxypropyl distarch phosphate — thickener. Generally safe.',
    'E1450': 'Starch sodium octenyl succinate — thickener. Generally safe.',
    'E1451': 'Acetylated oxidised starch — thickener. Generally safe.',
    'E1452': 'Starch aluminium octenyl succinate — thickener. Aluminium concern.',
    'E1505': 'Triethyl citrate — foam stabiliser. Generally safe.',
    'E1510': 'Ethanol — solvent. Safe at food levels.',
    'E1517': 'Glyceryl diacetate (diacetin) — solvent. Generally safe.',
    'E1518': 'Glyceryl triacetate (triacetin) — humectant. Generally safe.',
    'E1519': 'Benzyl alcohol — preservative. Generally safe at food levels.',
    'E1520': 'Propylene glycol — humectant, solvent. Generally safe at food levels.',
    'E1521': 'Polyethylene glycol — antifoaming agent. Generally safe.',
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

  return [...new Set(warnings)]; // deduplicate
}
