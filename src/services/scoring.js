/**
 * Ingredient Scanner — Scoring Engine
 *
 * Rates a product from 0.0 to 5.0 based on:
 *  - Nutri-Score (25%)
 *  - NOVA ultra-processing level (20%)
 *  - Additive quality (20%)
 *  - Nutritional density (20%)
 *  - Ingredient list quality (15%)
 */

export function calculateScore(product) {
  const scores = {};

  // 1. Nutri-Score (0–25 pts → 25% weight)
  scores.nutriscore = scoreNutriscore(product.nutriscore);
  const nutriscorePts = scores.nutriscore * 0.25;

  // 2. NOVA processing level (0–20 pts → 20% weight)
  scores.nova = scoreNova(product.novaGroup);
  const novaPts = scores.nova * 0.20;

  // 3. Additive score (0–20 pts → 20% weight)
  scores.additives = scoreAdditives(product.additives);
  const additivePts = scores.additives * 0.20;

  // 4. Nutritional density (0–20 pts → 20% weight)
  scores.nutrition = scoreNutrition(product.nutrition);
  const nutritionPts = scores.nutrition * 0.20;

  // 5. Ingredient list quality (0–15 pts → 15% weight)
  scores.ingredients = scoreIngredients(product);
  const ingredientPts = scores.ingredients * 0.15;

  const rawTotal = nutriscorePts + novaPts + additivePts + nutritionPts + ingredientPts;

  // Normalize to 0–5
  const rating = Math.round((rawTotal / 100) * 50) / 10;
  const clamped = Math.max(0, Math.min(5, rating));

  return {
    rating: clamped,
    raw: rawTotal,
    breakdown: scores,
    label: getRatingLabel(clamped),
    color: getRatingColor(clamped),
  };
}

/**
 * Score Nutri-Score grade: A=25, B=20, C=13, D=6, E=0, unknown=12
 */
function scoreNutriscore(grade) {
  const map = { A: 25, B: 20, C: 13, D: 6, E: 0 };
  return map[grade] !== undefined ? map[grade] : 12;
}

/**
 * Score NOVA group: 1=20 (unprocessed), 2=15 (culinary ingredients),
 * 3=8 (processed), 4=0 (ultra-processed), unknown=10
 */
function scoreNova(group) {
  const map = { 1: 20, 2: 15, 3: 8, 4: 0 };
  return map[group] !== undefined ? map[group] : 10;
}

/**
 * Score additives: penalize for high-risk, moderately for moderate-risk.
 * Base 20 pts, -2 per high-risk additive, -1 per moderate, -0.5 per low, min 0.
 */
function scoreAdditives(additives) {
  if (!additives || additives.length === 0) return 20; // No additives = perfect
  let penalty = 0;
  for (const add of additives) {
    if (add.risk === 'high') penalty += 2;
    else if (add.risk === 'moderate') penalty += 1;
    else if (add.risk === 'low') penalty += 0.5;
  }
  return Math.max(0, 20 - penalty);
}

/**
 * Score nutritional profile based on per-100g values.
 * Penalizes high sugar, salt, saturated fat; rewards fiber and protein.
 */
function scoreNutrition(n) {
  if (!n) return 10; // neutral if no data

  let points = 20;

  // Sugar: ≤5g = perfect, >22.5g = bad
  if (n.sugars > 22.5) points -= 6;
  else if (n.sugars > 11) points -= 3;
  else if (n.sugars > 5) points -= 1;

  // Saturated fat: ≤1.5g good, >5g bad
  if (n.saturatedFat > 5) points -= 4;
  else if (n.saturatedFat > 3) points -= 2;

  // Salt: ≤0.3g good, >1.5g bad
  if (n.salt > 1.5) points -= 4;
  else if (n.salt > 0.7) points -= 2;

  // Fiber: ≥3g = bonus
  if (n.fiber >= 6) points += 3;
  else if (n.fiber >= 3) points += 1.5;

  // Protein: ≥12g = bonus (for solid foods)
  if (n.proteins >= 20) points += 2;
  else if (n.proteins >= 12) points += 1;

  // Energy density: >1000 kcal/100g = very energy-dense
  if (n.energyKcal > 500) points -= 1;
  if (n.energyKcal > 300 && n.fiber < 2) points -= 1;

  return Math.max(0, Math.min(20, points));
}

/**
 * Score ingredient list quality.
 * Penalizes: long ingredient lists, many additives, long ingredient names.
 * Rewards: short list, recognized ingredients, high fruit/veg content.
 */
function scoreIngredients(product) {
  let points = 15;
  const { ingredients, ingredientsList } = product;

  if (!ingredients || ingredients.length === 0) return 7; // no data penalty

  // Short ingredient list = better
  if (ingredients.length <= 3) points += 2;
  else if (ingredients.length <= 5) points += 1;
  else if (ingredients.length <= 10) points -= 1;
  else if (ingredients.length <= 15) points -= 2;
  else points -= 4;

  // Percentage of recognizable whole-food ingredients
  const additiveCount = ingredients.filter((i) => i.isAdditive).length;
  const wholeRatio = 1 - (additiveCount / ingredients.length);
  if (wholeRatio >= 0.8) points += 2;
  else if (wholeRatio <= 0.3) points -= 2;

  // Check for first 3 ingredients being whole foods (sugar/fat/flour heavy penalties)
  const firstThree = ingredients.slice(0, 3).map((i) => (i.name || '').toLowerCase());
  const topSugar = firstThree.some((n) =>
    ['sugar', 'glucose', 'fructose', 'syrup', 'sucrose'].some((s) => n.includes(s))
  );
  const topFat = firstThree.some((n) =>
    ['oil', 'fat', 'shortening', 'butter', 'cream'].some((s) => n.includes(s))
  );
  if (topSugar) points -= 2;
  if (topFat) points -= 1;

  return Math.max(0, Math.min(18, points));
}

function getRatingLabel(rating) {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 3.5) return 'Good';
  if (rating >= 2.5) return 'Average';
  if (rating >= 1.5) return 'Poor';
  return 'Avoid';
}

function getRatingColor(rating) {
  if (rating >= 4.0) return '#4CAF50';    // Green
  if (rating >= 3.0) return '#8BC34A';    // Light green
  if (rating >= 2.0) return '#FFC107';    // Amber
  if (rating >= 1.0) return '#FF9800';    // Orange
  return '#F44336';                        // Red
}

/**
 * Generate ingredient awareness excerpts.
 * Returns a list of short consumer-awareness items.
 */
export function generateIngredientAwareness(product) {
  const excerpts = [];

  // 1. NOVA classification
  const novaMsg = {
    0: 'Processing level data unavailable.',
    1: '✅ Unprocessed or minimally processed — whole food with no industrial additives.',
    2: 'ℹ️ Processed culinary ingredients — oils, butter, sugar. Fine in moderate amounts.',
    3: '⚠️ Processed food — some industrial ingredients present. Check the label.',
    4: '🚨 Ultra-processed — multiple industrial additives. High in sugar/fat/salt. Best limited.',
  };
  excerpts.push({
    type: 'processing',
    icon: product.novaGroup === 4 ? '🚨' : product.novaGroup >= 3 ? '⚠️' : '✅',
    title: 'Processing Level',
    detail: novaMsg[product.novaGroup] || novaMsg[0],
  });

  // 2. Nutri-Score
  if (product.nutriscore) {
    const ns = {
      A: '✅ Excellent nutritional quality — low in sugar, saturated fat, and salt.',
      B: '👍 Good nutritional profile — a reasonable choice.',
      C: 'ℹ️ Average — moderate sugar, fat, or salt. Consume mindfully.',
      D: '⚠️ Poor — high in sugar, saturated fat, or salt. Limit intake.',
      E: '🚨 Lowest nutritional quality — very high in one or more negative nutrients.',
    };
    excerpts.push({
      type: 'nutrition',
      icon: product.nutriscore === 'A' || product.nutriscore === 'B' ? '✅' : product.nutriscore === 'C' ? 'ℹ️' : '⚠️',
      title: `Nutri-Score ${product.nutriscore}`,
      detail: ns[product.nutriscore] || '',
    });
  }

  // 3. Additive summary
  const highRiskAdds = product.additives.filter((a) => a.risk === 'high');
  if (highRiskAdds.length > 0) {
    excerpts.push({
      type: 'warning',
      icon: '🚨',
      title: `High-Risk Additives (${highRiskAdds.length})`,
      detail: highRiskAdds.map((a) => `${a.name} (${a.id})`).join(', ') +
        ' — These additives have known health concerns. Check individual entries for details.',
    });
  }

  const moderateAdds = product.additives.filter((a) => a.risk === 'moderate');
  if (moderateAdds.length > 0 && highRiskAdds.length === 0) {
    excerpts.push({
      type: 'caution',
      icon: '⚠️',
      title: `Moderate-Concern Additives (${moderateAdds.length})`,
      detail: `${moderateAdds.length} additive(s) with moderate safety profiles found. Generally acceptable but worth being aware of.`,
    });
  }

  // 4. Sugar alert
  if (product.nutrition && product.nutrition.sugars > 22.5) {
    excerpts.push({
      type: 'warning',
      icon: '🍬',
      title: 'High Sugar',
      detail: `${product.nutrition.sugars}g sugar per 100g — considered high (>22.5g/100g). The WHO recommends <25g free sugars daily.`,
    });
  } else if (product.nutrition && product.nutrition.sugars > 11) {
    excerpts.push({
      type: 'caution',
      icon: '🍬',
      title: 'Moderate Sugar',
      detail: `${product.nutrition.sugars}g sugar per 100g — medium level (5–22.5g/100g). Check serving sizes.`,
    });
  }

  // 5. Salt alert
  if (product.nutrition && product.nutrition.salt > 1.5) {
    excerpts.push({
      type: 'warning',
      icon: '🧂',
      title: 'High Salt',
      detail: `${product.nutrition.salt}g salt per 100g — high (>1.5g/100g). Excessive salt intake is linked to hypertension.`,
    });
  }

  // 6. Saturated fat alert
  if (product.nutrition && product.nutrition.saturatedFat > 5) {
    excerpts.push({
      type: 'warning',
      icon: '🫧',
      title: 'High Saturated Fat',
      detail: `${product.nutrition.saturatedFat}g saturated fat per 100g — high (>5g/100g). Limit to <10% of daily calories per WHO.`,
    });
  }

  // 7. Positive: good fiber
  if (product.nutrition && product.nutrition.fiber >= 6) {
    excerpts.push({
      type: 'positive',
      icon: '🌾',
      title: 'Excellent Fiber Source',
      detail: `${product.nutrition.fiber}g fiber per 100g — high fiber. Supports digestive health.`,
    });
  }

  // 8. Ingredient count insight
  if (product.ingredients && product.ingredients.length > 15) {
    excerpts.push({
      type: 'caution',
      icon: '📋',
      title: 'Long Ingredient List',
      detail: `${product.ingredients.length} ingredients — long lists often indicate more processing. Simple foods have shorter ingredient lists.`,
    });
  }

  // 9. First ingredient check
  if (product.ingredients && product.ingredients.length > 0) {
    const first = product.ingredients[0];
    const firstName = (first.name || '').toLowerCase();
    if (['sugar', 'glucose-fructose syrup', 'glucose syrup', 'fructose'].includes(firstName)) {
      excerpts.push({
        type: 'warning',
        icon: '🍬',
        title: 'Sugar is #1 Ingredient',
        detail: `The primary ingredient is "${first.name}" — meaning this product contains more sugar than any other ingredient.`,
      });
    } else if (['enriched wheat flour', 'white flour', 'refined wheat flour', 'maida'].includes(firstName)) {
      excerpts.push({
        type: 'caution',
        icon: '🌾',
        title: 'Refined Flour is #1',
        detail: `"${first.name}" is the top ingredient. Refined flours lack fibre and nutrients compared to whole grains.`,
      });
    }
  }

  // Always add a general tip
  if (excerpts.length < 3) {
    excerpts.push({
      type: 'tip',
      icon: '💡',
      title: 'Consumer Tip',
      detail: 'Fewer ingredients generally means less processing. If you don\'t recognise an ingredient, it\'s worth looking up.',
    });
  }

  return excerpts;
}