import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';
import './global.css';
import './src/i18n/translations/i18n';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <AppNavigator />
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}