import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ConsultationScreen from '../screens/staff/Consultationscreen';
import AddPrescriptionScreen from '../screens/staff/AddPrescription';
import DashboardScreen from '../screens/staff/Dashboardscreen';
import QueueScreen from '../screens/staff/Queuescreen';
import ReportsScreen from '../screens/staff/Reportsscreen';




const Tab = createBottomTabNavigator();
const ConsultStack = createNativeStackNavigator();

// Consult tab holds its own stack so Add Prescription opens
// inside the tab (bottom bar stays visible, like the design).
function ConsultStackNavigator() {
  return (
    <ConsultStack.Navigator screenOptions={{ headerShown: false }}>
      <ConsultStack.Screen name="ConsultationStatus" component={ConsultationScreen} />
      <ConsultStack.Screen name="AddPrescription" component={AddPrescriptionScreen} />
    </ConsultStack.Navigator>
  );
}

const TABS = [
  { name: 'Dashboard', label: 'DASHBOARD', icon: 'grid-outline', component: DashboardScreen },
  { name: 'Queue', label: 'QUEUE', icon: 'add-circle-outline', component: QueueScreen },
  { name: 'Consult', label: 'CONSULT', icon: 'clipboard-outline', component: ConsultStackNavigator },
  { name: 'Reports', label: 'REPORTS', icon: 'document-text-outline', component: ReportsScreen },
];

export default function StaffNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Queue"
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarActiveTintColor: '#0052CC',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
          tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E2E8F0' },
          tabBarLabel: tab?.label,
          tabBarIcon: ({ color, size }) => <Ionicons name={tab?.icon} size={size} color={color} />,
        };
      }}
    >
      {TABS.map((t) => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  );
}