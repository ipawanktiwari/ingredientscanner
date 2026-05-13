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
import IngredientCard from '../components/IngredientCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductScreen({ route, navigation }) {
  const { barcode, barcodeType } = route.params;
  const [product, setProduct] = useState(null);
  const [score, setScore] = useState(null);
  const [awareness, setAwareness] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('summary'); // summary, ingredients, additives

  useEffect(() => {
    loadProduct();
  }, [barcode]);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProduct(barcode);
      if (!data) {
        setError('Product not found in database. Try scanning the barcode again or check the product is registered in Open Food Facts.');
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
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="search-off" size={64} color="#666" />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorText}>{error}</Text>
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

        {/* Rating section */}
        <View style={styles.ratingCard}>
          <RatingBadge
            rating={score.rating}
            label={score.label}
            size="large"
          />
          <View style={styles.breakdown}>
            {Object.entries(score.breakdown || {}).map(([key, val]) => {
              const names = {
                nutriscore: 'Nutri-Score',
                nova: 'Processing',
                additives: 'Additives',
                nutrition: 'Nutrition',
                ingredients: 'Ingredients',
              };
              return (
                <View key={key} style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>{names[key] || key}</Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownFill,
                        { width: `${Math.round((val / 25) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownValue}>{Math.round(val)}</Text>
                </View>
              );
            })}
          </View>
        </View>

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

        {/* Tabs: Summary / Ingredients / Additives */}
        <View style={styles.tabBar}>
          {['summary', 'ingredients', 'additives'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.activeTab]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.activeTabText,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {selectedTab === 'summary' && renderSummary(awareness, product)}
        {selectedTab === 'ingredients' && renderIngredients(product)}
        {selectedTab === 'additives' && renderAdditives(product)}
      </ScrollView>
    </SafeAreaView>
  );
}

function renderSummary(awareness, product) {
  if (!awareness || awareness.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.noDataText}>No awareness data available.</Text>
      </View>
    );
  }
  return (
    <View style={styles.tabContent}>
      {awareness.map((item, i) => (
        <View key={i} style={styles.awarenessCard}>
          <View style={styles.awarenessHeader}>
            <Text style={styles.awarenessIcon}>{item.icon}</Text>
            <Text style={styles.awarenessTitle}>{item.title}</Text>
          </View>
          <Text style={styles.awarenessDetail}>{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}

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

function renderAdditives(product) {
  if (!product.additives || product.additives.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.noDataText}>
          {product.ingredients && product.ingredients.length > 0
            ? 'No additives detected — this product uses only whole-food ingredients! 👍'
            : 'Additive analysis not available.'}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.tabContent}>
      <Text style={styles.additivesCount}>
        {product.additives.length} additive{product.additives.length !== 1 ? 's' : ''} found
      </Text>
      {product.additives.map((add, i) => (
        <IngredientCard
          key={add.id || i}
          additive={add}
          explanation={getAdditiveExplanation(add.id)}
          index={i}
        />
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
  // Rating
  ratingCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    alignItems: 'center',
  },
  breakdown: {
    flex: 1,
    marginLeft: 20,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    color: '#aaa',
    fontSize: 11,
    width: 70,
    fontWeight: '500',
  },
  breakdownBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#2a2a4e',
    borderRadius: 3,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 3,
  },
  breakdownValue: {
    color: '#ccc',
    fontSize: 11,
    width: 20,
    textAlign: 'right',
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
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#2a2a5e',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
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
  // Awareness cards (summary)
  awarenessCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  awarenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  awarenessIcon: {
    fontSize: 18,
  },
  awarenessTitle: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '700',
  },
  awarenessDetail: {
    color: '#b0b0b0',
    fontSize: 13,
    lineHeight: 18,
  },
  // Ingredient list
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
  // Additives
  additivesCount: {
    color: '#888',
    fontSize: 13,
    marginBottom: 10,
  },
});