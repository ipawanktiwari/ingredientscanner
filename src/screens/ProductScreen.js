import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchProduct, getAdditiveExplanation, detectAllergens } from '../services/api';
import { calculateScore, generateIngredientAwareness } from '../services/scoring';
import { saveToHistory } from '../utils/storage';
import RatingBadge from '../components/RatingBadge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductScreen({ route, navigation }) {
  const { barcode, barcodeType } = route.params;
  const [product, setProduct] = useState(null);
  const [score, setScore] = useState(null);
  const [awareness, setAwareness] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('additives'); // additives, ingredients

  useEffect(() => {
    loadProduct();
  }, [barcode]);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProduct(barcode);
      if (!data) {
        setError('product_not_found');
        return;
      }

      setProduct(data);

      const rating = calculateScore(data);
      setScore(rating);

      const excerpts = generateIngredientAwareness(data);
      setAwareness(excerpts);

      const detected = detectAllergens(data);
      setAllergens(detected);

      // Save to history
      await saveToHistory({ ...data, rating: rating.rating, ratingLabel: rating.label });
    } catch (err) {
      setError('Network error. Check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={styles.loadingText}>Looking up product...</Text>
          <Text style={styles.barcodeText}>Barcode: {barcode}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    const isNotFound = error === 'product_not_found';
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name={isNotFound ? 'search-off' : 'wifi-off'} size={64} color="#666" />
          <Text style={styles.errorTitle}>{isNotFound ? 'Product Not Found' : 'Connection Issue'}</Text>
          <Text style={styles.errorText}>
            {isNotFound
              ? 'This barcode was not found in our database. Open Food Facts may not have this product yet, especially for local/regional items.'
              : error}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const likes = getWhatYouLike(product, score);
  const watches = getWhatToWatch(product, score);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header: product image + name */}
        <View style={styles.headerCard}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <MaterialIcons name="image-not-supported" size={48} color="#555" />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.brand ? (
              <Text style={styles.brandName}>{product.brand}</Text>
            ) : null}
            {product.quantity ? (
              <Text style={styles.quantity}>{product.quantity}</Text>
            ) : null}
          </View>
        </View>

        {/* Score badge — centered, prominent */}
        <View style={styles.scoreCard}>
          <RatingBadge
            rating={score.rating}
            label={score.label}
            size="large"
          />
        </View>

        {/* Nutrition overview */}
        {hasNutritionData(product) && renderNutritionOverview(product)}

        {/* What You'll Like */}
        {likes.length > 0 && (
          <View style={styles.likesCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.likesTitle}>What You'll Like  😊</Text>
            </View>
            {likes.map((item, i) => (
              <View key={i} style={styles.likeRow}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.likeLabel}>{item.label}</Text>
                <Text style={styles.likeValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* What to Watch */}
        {watches.length > 0 && (
          <View style={styles.watchCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.watchTitle}>What to Watch  ⚠️</Text>
            </View>
            {watches.map((item, i) => (
              <View key={i} style={styles.watchRow}>
                <Text style={styles.watchIcon}>⚠️</Text>
                <Text style={styles.watchLabel}>{item.label}</Text>
                <Text style={styles.watchValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Allergen warnings */}
        {allergens.length > 0 && (
          <View style={styles.allergenCard}>
            <MaterialIcons name="warning" size={20} color="#FF9800" />
            <Text style={styles.allergenTitle}>May contain allergens:</Text>
            <Text style={styles.allergenList}>
              {allergens.map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}
            </Text>
          </View>
        )}

        {/* Tabs: Additives / Ingredients */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'additives' && styles.activeTab]}
            onPress={() => setSelectedTab('additives')}
          >
            <Text style={[styles.tabIcon]}>
              {selectedTab === 'additives' ? '🔧' : '🔧'}
            </Text>
            <Text
              style={[
                styles.tabText,
                selectedTab === 'additives' && styles.activeTabText,
              ]}
            >
              Additives ({product.additives ? product.additives.length : 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'ingredients' && styles.activeTab]}
            onPress={() => setSelectedTab('ingredients')}
          >
            <Text style={[styles.tabIcon]}>
              {selectedTab === 'ingredients' ? '🥣' : '🥣'}
            </Text>
            <Text
              style={[
                styles.tabText,
                selectedTab === 'ingredients' && styles.activeTabText,
              ]}
            >
              Ingredients ({product.ingredients ? product.ingredients.length : 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content */}
        {selectedTab === 'additives' && renderAdditivesTab(product)}
        {selectedTab === 'ingredients' && renderIngredients(product)}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Check if we have enough nutrition data to show the overview.
 */
function hasNutritionData(product) {
  const n = product.nutrition;
  return n && (n.energyKcal > 0 || n.fat > 0 || n.proteins > 0 || n.fiber > 0 || n.sugars > 0);
}

/**
 * Nutrition overview: key stats in a clean card.
 */
function renderNutritionOverview(product) {
  const n = product.nutrition;
  const rows = [
    { icon: '🔥', label: 'Energy', value: `${n.energyKcal.toFixed(0)} kcal` },
    { icon: '🧈', label: 'Total Fat', value: `${n.fat.toFixed(1)} g` },
  ];

  return (
    <View style={styles.nutritionCard}>
      {rows.map((row, i) => (
        <View key={i} style={styles.nutritionRow}>
          <Text style={styles.nutritionIcon}>{row.icon}</Text>
          <Text style={styles.nutritionLabel}>{row.label}</Text>
          <Text style={styles.nutritionValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Determine positive highlights based on nutrition and processing data.
 */
function getWhatYouLike(product, score) {
  const likes = [];
  const n = product.nutrition;

  if (n && n.proteins >= 12) {
    likes.push({ label: 'Protein', value: `${n.proteins.toFixed(1)} g` });
  }
  if (n && n.fiber >= 3) {
    likes.push({ label: 'Dietary Fiber', value: `${n.fiber.toFixed(1)} g` });
  }
  if (n && n.sugars <= 5) {
    likes.push({ label: 'Total Sugars', value: `${n.sugars.toFixed(1)} g` });
  }
  if (n && n.saturatedFat >= 0 && n.saturatedFat <= 1.5) {
    likes.push({ label: 'Saturated Fat', value: `${n.saturatedFat.toFixed(1)} g` });
  }
  if (n && n.salt >= 0 && n.salt <= 0.3) {
    likes.push({ label: 'Salt', value: `${n.salt.toFixed(2)} g` });
  }
  if (product.novaGroup === 1 || product.novaGroup === 2) {
    likes.push({ label: 'Processing', value: product.novaGroup === 1 ? 'Minimal' : 'Low' });
  }
  if (!product.additives || product.additives.length === 0) {
    likes.push({ label: 'Additives', value: 'None added' });
  }
  if (product.ingredients && product.ingredients.length <= 5) {
    likes.push({ label: 'Ingredients', value: `${product.ingredients.length} items` });
  }
  if (n && n.transFat !== undefined && n.transFat === 0) {
    likes.push({ label: 'Trans Fat', value: '0 g' });
  }

  // Cap at 5 items max for readability
  return likes.slice(0, 5);
}

/**
 * Determine concerns based on nutrition and processing data.
 */
function getWhatToWatch(product, score) {
  const watches = [];
  const n = product.nutrition;

  if (n && n.sugars > 22.5) {
    watches.push({ label: 'Total Sugars', value: `${n.sugars.toFixed(1)} g` });
  } else if (n && n.sugars > 11) {
    watches.push({ label: 'Total Sugars', value: `${n.sugars.toFixed(1)} g` });
  }
  if (n && n.saturatedFat > 5) {
    watches.push({ label: 'Saturated Fat', value: `${n.saturatedFat.toFixed(1)} g` });
  }
  if (n && n.salt > 1.5) {
    watches.push({ label: 'Salt', value: `${n.salt.toFixed(2)} g` });
  }
  if (n && n.energyKcal > 500) {
    watches.push({ label: 'Energy Density', value: `${n.energyKcal.toFixed(0)} kcal` });
  }
  if (product.novaGroup === 4) {
    watches.push({ label: 'Processing', value: 'Ultra-processed' });
  }
  if (product.additives && product.additives.length > 5) {
    watches.push({ label: 'Additives', value: `${product.additives.length} added` });
  }
  if (product.ingredients && product.ingredients.length > 10) {
    watches.push({ label: 'Ingredients', value: `${product.ingredients.length} items` });
  }

  // Check first ingredients for sugar/fat
  if (product.ingredients && product.ingredients.length >= 3) {
    const firstThree = product.ingredients.slice(0, 3).map((i) => (i.name || '').toLowerCase());
    const hasSugar = firstThree.some((n) =>
      ['sugar', 'glucose', 'fructose', 'syrup', 'sucrose'].some((s) => n.includes(s))
    );
    if (hasSugar) {
      watches.push({ label: '#1 Ingredient', value: 'Sugar-based' });
    }
  }

  // Cap at 5 items
  return watches.slice(0, 5);
}

/**
 * Additives tab — shows each additive with color-coded concern level.
 */
function renderAdditivesTab(product) {
  if (!product.additives || product.additives.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.noDataText}>
          {product.ingredients && product.ingredients.length > 0
            ? 'No additives detected — this product uses only whole-food ingredients!  👍'
            : 'Additive analysis not available.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {product.additives.map((add, i) => {
        const { dotColor, levelLabel, levelColor } = getConcernLevel(add.risk);
        return (
          <React.Fragment key={add.id || i}>
            {i > 0 && <View style={styles.additiveDivider} />}
            <TouchableOpacity style={styles.additiveRow} activeOpacity={0.7}>
              <View style={[styles.concernDot, { backgroundColor: dotColor }]} />
              <View style={styles.additiveInfo}>
                <Text style={styles.additiveName}>{add.name}</Text>
                <Text style={[styles.concernLabel, { color: levelColor }]}>
                  {levelLabel}
                </Text>
              </View>
              <MaterialIcons name="keyboard-arrow-down" size={22} color="#666" />
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

/**
 * Map additive risk level to display colors and labels.
 */
function getConcernLevel(risk) {
  switch (risk) {
    case 'high':
      return {
        dotColor: '#F44336',
        levelLabel: 'High Concern',
        levelColor: '#E57373',
      };
    case 'moderate':
      return {
        dotColor: '#F2A94F',
        levelLabel: 'Minimal Concern',
        levelColor: '#CC7235',
      };
    case 'low':
      return {
        dotColor: '#69B36B',
        levelLabel: 'Generally Safe',
        levelColor: '#66A76B',
      };
    default:
      return {
        dotColor: '#888',
        levelLabel: 'Unknown',
        levelColor: '#888',
      };
  }
}

/**
 * Ingredients tab — full ingredient list.
 */
function renderIngredients(product) {
  if (!product.ingredients || product.ingredients.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.noDataText}>Ingredient list not available for this product.</Text>
      </View>
    );
  }
  return (
    <View style={styles.tabContent}>
      <View style={styles.ingredientListHeader}>
        <Text style={styles.ingredientListLabel}>
          {product.ingredients.length} ingredient{product.ingredients.length !== 1 ? 's' : ''}
        </Text>
        {product.ingredientsText ? (
          <Text style={styles.ingredientListFull}>{product.ingredientsText}</Text>
        ) : null}
      </View>
      {product.ingredients.map((ing, i) => (
        <View key={ing.id || i} style={styles.ingredientRow}>
          <Text style={styles.ingredientRank}>#{i + 1}</Text>
          <View style={styles.ingredientInfo}>
            <Text style={styles.ingredientName}>{ing.name}</Text>
            <Text style={styles.ingredientPercent}>
              ~{ing.percent}% estimated
            </Text>
          </View>
          {ing.isAdditive && (
            <View style={styles.additiveTag}>
              <Text style={styles.additiveTagText}>Additive</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 16,
  },
  barcodeText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#00E5FF',
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },

  // Header
  headerCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  productImage: {
    width: 90,
    height: 120,
    borderRadius: 8,
  },
  noImage: {
    width: 90,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  productName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  brandName: {
    color: '#00E5FF',
    fontSize: 14,
    marginBottom: 2,
  },
  quantity: {
    color: '#888',
    fontSize: 13,
  },

  // Score badge — centered
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },

  // Nutrition overview
  nutritionCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    padding: 14,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  nutritionIcon: {
    fontSize: 16,
    width: 28,
  },
  nutritionLabel: {
    color: '#b0b0b0',
    fontSize: 14,
    flex: 1,
  },
  nutritionValue: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
  },

  // What You'll Like
  likesCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#0d2618',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a4a2a',
    padding: 14,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  likesTitle: {
    color: '#6FCF97',
    fontSize: 15,
    fontWeight: '700',
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  checkIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  likeLabel: {
    color: '#b0d0b0',
    fontSize: 13,
    flex: 1,
  },
  likeValue: {
    color: '#6FCF97',
    fontSize: 13,
    fontWeight: '600',
  },

  // What to Watch
  watchCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#2a1a0a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4a2a1a',
    padding: 14,
  },
  watchTitle: {
    color: '#FFB74D',
    fontSize: 15,
    fontWeight: '700',
  },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  watchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  watchLabel: {
    color: '#d0b090',
    fontSize: 13,
    flex: 1,
  },
  watchValue: {
    color: '#FFB74D',
    fontSize: 13,
    fontWeight: '600',
  },

  // Allergens
  allergenCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#2a1f0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a3a1a',
    gap: 6,
  },
  allergenTitle: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  allergenList: {
    color: '#e0a040',
    fontSize: 13,
    fontWeight: '500',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#4F2C96',
  },
  tabIcon: {
    fontSize: 14,
  },
  tabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },

  // Tab content (shared)
  tabContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 32,
  },
  noDataText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
    lineHeight: 20,
  },

  // Additives tab
  additiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 6,
  },
  additiveDivider: {
    height: 0,
  },
  concernDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  additiveInfo: {
    flex: 1,
  },
  additiveName: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '500',
  },
  concernLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Ingredients tab
  ingredientListHeader: {
    marginBottom: 14,
  },
  ingredientListLabel: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  ingredientListFull: {
    color: '#b0b0b0',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  ingredientRank: {
    color: '#555',
    fontSize: 12,
    fontWeight: '700',
    width: 28,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  ingredientPercent: {
    color: '#666',
    fontSize: 11,
    marginTop: 1,
  },
  additiveTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#3a3a1a',
    borderRadius: 6,
  },
  additiveTagText: {
    color: '#cca000',
    fontSize: 10,
    fontWeight: '700',
  },
});
