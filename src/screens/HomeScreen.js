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
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.logo}>
                in<Text style={styles.logoAccent}>gro</Text>
              </Text>
              <Text style={styles.tagline}>Know what you eat</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate("Settings")}
            >
              <MaterialIcons name="settings" size={24} color="#707090" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>98%</Text>
            <Text style={styles.statLabel}>Scan Accuracy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>300+</Text>
            <Text style={styles.statLabel}>Additives Tracked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>10</Text>
            <Text style={styles.statLabel}>Allergens</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How It Works</Text>
          
          {/* Step 1 */}
          <View style={styles.stepCard}>
            <View style={styles.stepLeft}>
              <Text style={styles.stepNum}>1</Text>
              <View style={styles.stepLine} />
            </View>
            <View style={styles.stepContent}>
              <MaterialIcons name="qr-code-scanner" size={24} color="#00E5FF" />
              <Text style={styles.stepTitle}>Scan Barcode or Label</Text>
              <Text style={styles.stepDesc}>
                Point camera at barcode. If product not found, flip and scan the ingredient label.
              </Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.stepCard}>
            <View style={styles.stepLeft}>
              <Text style={styles.stepNum}>2</Text>
              <View style={styles.stepLine} />
            </View>
            <View style={styles.stepContent}>
              <MaterialIcons name="auto-awesome" size={24} color="#FFD600" />
              <Text style={styles.stepTitle}>AI Reads Ingredients</Text>
              <Text style={styles.stepDesc}>
                Our AI instantly extracts ingredients, nutrition, and additives from the label.
              </Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={styles.stepCard}>
            <View style={styles.stepLeft}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <MaterialIcons name="health-and-safety" size={24} color="#00E676" />
              <Text style={styles.stepTitle}>Get Health Rating</Text>
              <Text style={styles.stepDesc}>
                See a 0-5 health score with detailed breakdown of what's good and what to watch.
              </Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Pro Tip</Text>
          <Text style={styles.tipsText}>
            For best results, scan the ingredient list on the back of the package. Make sure the text is clear and well-lit.
          </Text>
        </View>

        {/* Feature highlights */}
        <View style={styles.featureList}>
          <FeatureRow icon="star" color="#00E5FF" text="Health rating 0-5 from 5 scientific factors" />
          <FeatureRow icon="science" color="#FFD600" text="300+ additive database with risk levels" />
          <FeatureRow icon="pets" color="#FF9100" text="Allergen detection for 10 categories" />
          <FeatureRow icon="list-alt" color="#00E676" text="Full ingredient breakdown with % estimates" />
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(112,112,144,0.1)",
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
  howItWorks: {
    backgroundColor: '#0d1b2a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a2a3a',
    marginBottom: 16,
  },
  howTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepLeft: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  stepNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00E5FF',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,229,255,0.15)',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(0,229,255,0.2)',
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    backgroundColor: '#12122a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  tipsCard: {
    backgroundColor: '#1a1a0a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a1a',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD600',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
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
