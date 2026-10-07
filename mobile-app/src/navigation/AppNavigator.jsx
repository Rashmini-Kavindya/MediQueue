import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import PatientNavigator from './PatientNavigator';
import StaffNavigator from './StaffNavigator'; // Staff Navigator එක Import කළා

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  // User කෙනෙක් Log වී ඇත්නම් එයා Staff / Doctor / Admin ද යන්න පරීක්ෂා කිරීම
  const isStaffUser = user && ['staff', 'doctor', 'admin'].includes(user.role);

  return (
    <NavigationContainer>
      {!user ? (
        // 1. Log වී නැත -> Auth Stack (Login / Register / StaffLogin)
        <AuthNavigator />
      ) : isStaffUser ? (
        // 2. Log වී ඇති Staff කෙනෙක් -> Staff Portal
        <StaffNavigator />
      ) : (
        // 3. Log වී ඇති Patient / Caregiver -> Patient Portal
        <PatientNavigator />
      )}
    </NavigationContainer>
  );
}