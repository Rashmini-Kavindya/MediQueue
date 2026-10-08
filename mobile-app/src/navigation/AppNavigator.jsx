import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator'; // Patient සඳහා Bottom Tab Navigator එක Import කරගන්න
import RequestNewToken from '../screens/patient/RequestNewToken';
import ConfirmNewToken from '../screens/patient/ConfirmNewToken';

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

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : userRole === 'patient' ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="RequestNewToken" component={RequestNewToken} />
          <Stack.Screen name="ConfirmNewToken" component={ConfirmNewToken} />
        </Stack.Navigator>
      ) : (
        // Caregiver & Admin Navigators ඊළඟට සෙට් කරමු
        <TabNavigator />
      )}
    </NavigationContainer>
  );
}