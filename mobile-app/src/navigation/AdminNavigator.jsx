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
import WaitingAreaManagement from '../screens/staff/WaitingAreaManagement';
import UserManagement from '../screens/staff/UserManagement';
import TokenManagement from '../screens/staff/TokenManage';

const Drawer = createDrawerNavigator();

export default function AdminNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AdminDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: '82%' },
      }}
    >
      <Drawer.Screen name="AdminDashboard" component={AdminDashboard} />
      <Drawer.Screen name="QueueManagement" component={QueueManagement} />
      <Drawer.Screen name="OPDManagement" component={OPDManagement} />
      <Drawer.Screen name="DoctorsManagement" component={DoctorManagement} />
      <Drawer.Screen name="RoomsManagement" component={RoomManagement} />
      <Drawer.Screen name="Notifications" component={AdminNotifications} />
      <Drawer.Screen name="WaitingAreaManagement" component={WaitingAreaManagement} />
      <Drawer.Screen name="UserManagement" component={UserManagement} />
      <Drawer.Screen name="TokenManagement" component={TokenManagement} />
      {/* Existing future screens retained as reference:
      <Drawer.Screen name="OPDManagement" component={OPDManagement} />
      <Drawer.Screen name="DoctorsManagement" component={DoctorsManagement} />
      <Drawer.Screen name="SystemSettings" component={SystemSettings} /> */}
    </Drawer.Navigator>
  );
}
