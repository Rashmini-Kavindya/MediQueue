import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Custom Sidebar Component
import AdminDrawerContent from '../components/admin/AdminDrawerContent';

// Admin / Staff Screens
import AdminDashboard from '../screens/staff/AdminDashboard';
import QueueManagement from '../screens/staff/QueueManagement';
import OPDManagement from '../screens/staff/OPDManagement';
import RoomManagement from '../screens/staff/RoomManagement';
import DoctorManagement from '../screens/staff/DoctorManagement';
import AdminNotifications from '../screens/staff/AdminNotifications';

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
      <Drawer.Screen name="OPDManagement" component={OPDManagement} />
      <Drawer.Screen name="DoctorsManagement" component={DoctorManagement} />
      <Drawer.Screen name="RoomsManagement" component={RoomManagement} />
      <Drawer.Screen name="Notifications" component={AdminNotifications} />
    </Drawer.Navigator>
  );
}