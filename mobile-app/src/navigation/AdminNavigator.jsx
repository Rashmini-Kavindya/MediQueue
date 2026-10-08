import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AdminDrawerContent from '../components/admin/AdminDrawerContent';
import AdminDashboard from '../screens/staff/AdminDashboard';
import QueueManagement from '../screens/staff/QueueManagement';
import WaitingAreaManagement from '../screens/staff/WaitingAreaManagement';
import UserManagement from '../screens/staff/UserManagement';

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
      <Drawer.Screen name="WaitingAreaManagement" component={WaitingAreaManagement} />
      <Drawer.Screen name="UserManagement" component={UserManagement} />
      {/* Existing future screens retained as reference:
      <Drawer.Screen name="OPDManagement" component={OPDManagement} />
      <Drawer.Screen name="DoctorsManagement" component={DoctorsManagement} />
      <Drawer.Screen name="SystemSettings" component={SystemSettings} /> */}
    </Drawer.Navigator>
  );
}
