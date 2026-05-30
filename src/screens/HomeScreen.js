import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            in<Text style={styles.logoAccent}>gro</Text>
          </Text>
          <Text style={styles.tagline}>Know what you eat</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>300+</Text>
            <Text style={styles.statLabel}>Additives Tracked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Score Factors</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>10</Text>
            <Text style={styles.statLabel}>Allergens</Text>
          </View>
        </View>

        {/* Feature highlights */}
        <View style={styles.featureList}>
          <FeatureRow icon="star" color="#00E5FF" text="Health rating 0-5 from 5 scientific factors" />
          <FeatureRow icon="science" color="#FFD600" text="300+ additive database with risk levels" />
          <FeatureRow icon="pets" color="#FF9100" text="Allergen detection for 10 categories" />
          <FeatureRow icon="list-alt" color="#00E676" text="Full ingredient breakdown with % estimates" />
        </View>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How It Works</Text>
          <View style={styles.stepRow}>
            <View style={styles.step}>
              <Text style={styles.stepNum}>1</Text>
              <Text style={styles.stepText}>Scan barcode</Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>
            <View style={styles.step}>
              <Text style={styles.stepNum}>2</Text>
              <Text style={styles.stepText}>Analyze ingredients</Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>
            <View style={styles.step}>
              <Text style={styles.stepNum}>3</Text>
              <Text style={styles.stepText}>Get health rating</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Scan Button pinned at bottom */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate('Scanner')}
          activeOpacity={0.85}
        >
          <MaterialIcons name="camera-alt" size={22} color="#000" />
          <Text style={styles.scanBtnText}>Scan a Product</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, color, text }) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureDot, { backgroundColor: color }]} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: '#00E5FF',
  },
  tagline: {
    fontSize: 14,
    color: '#707090',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#12122a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2a2a4a',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00E5FF',
  },
  statLabel: {
    fontSize: 10,
    color: '#707090',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureList: {
    marginBottom: 24,
    backgroundColor: '#12122a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  featureText: {
    fontSize: 13,
    color: '#ccc',
    flex: 1,
  },
  howItWorks: {
    backgroundColor: '#0d1b2a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a2a3a',
    marginBottom: 16,
  },
  howTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00E5FF',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,229,255,0.1)',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 4,
    overflow: 'hidden',
  },
  stepText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  stepArrow: {
    fontSize: 18,
    color: '#444',
    paddingHorizontal: 4,
  },
  bottomArea: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    backgroundColor: '#0a0a1a',
  },
  scanBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
  },
});
