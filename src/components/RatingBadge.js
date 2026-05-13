import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const COLORS = {
  'Excellent': '#4CAF50',
  'Good': '#8BC34A',
  'Average': '#FFC107',
  'Poor': '#FF9800',
  'Avoid': '#F44336',
};

export default function RatingBadge({ rating, label, size = 'medium' }) {
  const color = COLORS[label] || '#9E9E9E';
  const isLarge = size === 'large';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ring,
          {
            width: isLarge ? 100 : 72,
            height: isLarge ? 100 : 72,
            borderColor: color,
          },
        ]}
      >
        <Text
          style={[
            styles.ratingText,
            { color, fontSize: isLarge ? 32 : 24 },
          ]}
        >
          {rating.toFixed(1)}
        </Text>
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    borderRadius: 50,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111125',
  },
  ratingText: {
    fontWeight: '800',
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
