import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator'; // StaffNavigator වෙනුවට AdminNavigator import කිරීම
import TabNavigator from './TabNavigator'; // Patient Bottom Tab Navigator
import RequestNewToken from '../screens/patient/RequestNewToken';
import ConfirmNewToken from '../screens/patient/ConfirmNewToken';
import ChatbotScreen from '../screens/patient/ChatbotScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  const role = user?.role;

  // User කෙනෙක් Log වී ඇත්නම් එයා Staff / Doctor / Admin ද යන්න පරීක්ෂා කිරීම
  const isStaffUser = !!user && ['staff', 'doctor', 'admin'].includes(role);
  const isPatient = !!user && role === 'patient';

  return (
    <NavigationContainer>
      {!user ? (
        // 1. Log වී නැත -> Auth Stack (Login / Register / StaffLogin)
        <AuthNavigator />
      ) : isStaffUser ? (
        // 2. Log වී ඇති Staff / Doctor / Admin -> Admin Drawer Navigator
        <AdminNavigator />
      ) : isPatient ? (
        // 3. Patient -> Bottom tabs + token request screens
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="RequestNewToken" component={RequestNewToken} />
          <Stack.Screen name="ConfirmNewToken" component={ConfirmNewToken} />
          <Stack.Screen name="Chatbot" component={ChatbotScreen} />

        </Stack.Navigator>
      ) : (
        // 4. Caregiver (දැනට Patient tabs)
        <TabNavigator />
      )}
    </NavigationContainer>
  );
}