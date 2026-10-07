import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import PatientNavigator from './PatientNavigator';

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  // NavigationContainer must wrap ALL navigators (only one per app)
  return (
    <NavigationContainer>
      {!user ? (
        // 1. Unauthenticated -> LanguageSelect -> RoleSelectScreen -> Login/Register
        <AuthNavigator />
      ) : (
        // 2. Logged-in (Patient, Caregiver; Staff/Admin navigator will be added later)
        <PatientNavigator />
      )}
    </NavigationContainer>
  );
}