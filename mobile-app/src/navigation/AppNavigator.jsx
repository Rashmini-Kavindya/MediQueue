import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import PatientDashboard from '../screens/patient/PatientDashboard';

export default function AppNavigator() {
  const { user, userRole, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : userRole === 'patient' ? (
        <PatientDashboard />
      ) : (
        // Caregiver & Admin Navigators ඊළඟට සෙට් කරමු
        <PatientDashboard />
      )}
    </NavigationContainer>
  );
}