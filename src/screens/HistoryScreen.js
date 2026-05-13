import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { getHistory, clearHistory } from '../utils/storage';
import RatingBadge from '../components/RatingBadge';

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    const data = await getHistory();
    setHistory(data);
  };

  const handleClear = () => {
    Alert.alert(
      'Clear History',
      'Remove all scanned product history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => navigation.navigate('Product', { barcode: item.barcode })}
      activeOpacity={0.7}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder}>
          <MaterialIcons name="inventory-2" size={24} color="#555" />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand ? (
          <Text style={styles.itemBrand} numberOfLines={1}>
            {item.brand}
          </Text>
        ) : null}
        <Text style={styles.itemDate}>
          {new Date(item.scannedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <View style={styles.itemRating}>
        <Text style={[styles.ratingNumber, { color: getColor(item.ratingLabel) }]}>
          {item.rating?.toFixed(1)}
        </Text>
        <Text style={[styles.ratingLabelSmall, { color: getColor(item.ratingLabel) }]}>
          {item.ratingLabel}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#555" />
    </TouchableOpacity>
  );

  if (history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="history" size={64} color="#444" />
        <Text style={styles.emptyTitle}>No Scans Yet</Text>
        <Text style={styles.emptyText}>
          Products you scan will appear here so you can review them later.
        </Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.scanButtonText}>Scan a Product</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.barcode}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function getColor(label) {
  const colors = {
    Excellent: '#4CAF50',
    Good: '#8BC34A',
    Average: '#FFC107',
    Poor: '#FF9800',
    Avoid: '#F44336',
  };
  return colors[label] || '#9E9E9E';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  clearText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 12,
    paddingBottom: 32,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  thumb: {
    width: 48,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  thumbPlaceholder: {
    width: 48,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemBrand: {
    color: '#00E5FF',
    fontSize: 12,
    marginTop: 2,
  },
  itemDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  itemRating: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  ratingLabelSmall: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  scanButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#00E5FF',
    borderRadius: 10,
  },
  scanButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});