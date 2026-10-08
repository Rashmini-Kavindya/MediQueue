import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AdminDrawerContent from '../components/admin/AdminDrawerContent';
import AdminDashboard from '../screens/staff/AdminDashboard';
import QueueManagement from '../screens/staff/QueueManagement';

// Custom Sidebar Component


// Admin / Staff Screens


const Drawer = createDrawerNavigator();

export default function AdminNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AdminDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: '82%', // Mobile screen width match වෙන පරිදි
        },
      }}
    >
      <Drawer.Screen name="AdminDashboard" component={AdminDashboard} />
      <Drawer.Screen name="QueueManagement" component={QueueManagement} />
      {/* <Drawer.Screen name="OPDManagement" component={OPDManagement} />
      <Drawer.Screen name="DoctorsManagement" component={DoctorsManagement} />
      <Drawer.Screen name="SystemSettings" component={SystemSettings} /> */}
    </Drawer.Navigator>
  );
}