import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StaffDashboard from '../screens/staff/StaffDashboard';


const Stack = createNativeStackNavigator();

export default function StaffNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
    </Stack.Navigator>
  );
}