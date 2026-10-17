import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';

import TabNavigator from './TabNavigator'; // Patient Bottom Tab Navigator
import CaregiverNavigator from './CaregiverNavigator';
import RequestNewToken from '../screens/patient/RequestNewToken';
import ConfirmNewToken from '../screens/patient/ConfirmNewToken';
import ChatbotScreen from '../screens/patient/ChatbotScreen';
import StaffNavigator from './Staffnavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, userRole, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  const role = userRole || user?.role;

  const isAdmin = !!user && role === 'admin';
  const isStaff = !!user && (role === 'staff' || role === 'doctor');
  const isPatient = !!user && role === 'patient';
  const isCaregiver = !!user && role === 'caregiver';

  return (
    <NavigationContainer>
      {!user ? (
        // 1. Not logged in -> Login / Register / StaffLogin
        <AuthNavigator />
      ) : isAdmin ? (
        // 2. Admin -> Admin dashboard
        <AdminNavigator />
      ) : isStaff ? (
        // 3. Staff / Doctor -> Staff dashboard (Dashboard, Queue, Consult, Reports)
        <StaffNavigator />
      ) : isPatient ? (
        // 4. Patient -> Bottom tabs + token request screens
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="RequestNewToken" component={RequestNewToken} />
          <Stack.Screen name="ConfirmNewToken" component={ConfirmNewToken} />
          <Stack.Screen name="Chatbot" component={ChatbotScreen} />
        </Stack.Navigator>
      ) : isCaregiver ? (
        // 5. Caregiver
        <CaregiverNavigator />
      ) : (
        // Fallback
        <TabNavigator />
      )}
    </NavigationContainer>
  );
}