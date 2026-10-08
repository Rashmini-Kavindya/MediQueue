import React from 'react';

import {
  createNativeStackNavigator
} from '@react-navigation/native-stack';

import CaregiverDashboard from '../screens/caregiver/CaregiverDashboard';
import CaregiverQueueScreen from '../screens/caregiver/CaregiverQueueScreen';
import CaregiverAlertsScreen from '../screens/caregiver/CaregiverAlertsScreen';
import CaregiverProfileScreen from '../screens/caregiver/CaregiverProfileScreen';
import LinkPatientScreen from '../screens/caregiver/LinkPatientScreen';


const Stack =
  createNativeStackNavigator();


export default function CaregiverNavigator() {
  return (
    <Stack.Navigator

      initialRouteName="CaregiverHome"

      screenOptions={{
        headerShown: false,

        animation: 'fade'
      }}
    >

      <Stack.Screen
        name="CaregiverHome"
        component={CaregiverDashboard}
      />


      <Stack.Screen
        name="CaregiverQueue"
        component={CaregiverQueueScreen}
      />


      <Stack.Screen
        name="CaregiverAlerts"
        component={CaregiverAlertsScreen}
      />


      <Stack.Screen
        name="CaregiverProfile"
        component={CaregiverProfileScreen}
      />


      <Stack.Screen
        name="LinkPatient"
        component={LinkPatientScreen}
      />

    </Stack.Navigator>
  );
}