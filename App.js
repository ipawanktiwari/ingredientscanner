import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import ScannerScreen from './src/screens/ScannerScreen';
import ProductScreen from './src/screens/ProductScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: '#0f0f23',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: '700',
    fontSize: 18,
  },
  cardStyle: {
    backgroundColor: '#0f0f23',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#00E5FF',
            background: '#0f0f23',
            card: '#0f0f23',
            text: '#fff',
            border: '#1a1a2e',
            notification: '#00E5FF',
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
        }}
      >
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen
            name="Scanner"
            component={ScannerScreen}
            options={{
              title: 'Ingro',
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="Product"
            component={ProductScreen}
            options={{
              title: 'Product Analysis',
            }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{
              title: 'Scan History',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}