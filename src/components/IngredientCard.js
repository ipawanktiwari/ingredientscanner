import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RISK_COLORS = {
  low: '#4CAF50',
  moderate: '#FFC107',
  high: '#F44336',
  unknown: '#9E9E9E',
};

const RISK_LABELS = {
  low: 'Low Risk',
  moderate: 'Moderate',
  high: 'High Concern',
  unknown: 'Unknown',
};

export default function IngredientCard({ additive, explanation, index }) {
  if (!additive) return null;

  const riskColor = RISK_COLORS[additive.risk] || '#9E9E9E';
  const riskLabel = RISK_LABELS[additive.risk] || 'Unknown';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: riskColor }]}>
          <Text style={styles.badgeText}>{riskLabel}</Text>
        </View>
        <Text style={styles.name}>{additive.name || additive.id}</Text>
        <Text style={styles.code}>{additive.id}</Text>
      </View>
      {explanation ? (
        <Text style={styles.explanation}>{explanation}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  name: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  code: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  explanation: {
    color: '#b0b0b0',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
});
