import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';

// Existing web/native notice behavior preserved.
const showNotice = (title, message) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

export default function AdminDrawerContent(props) {
  const { user, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { navigation, state } = props;
  const activeRoute = state?.routes[state?.index]?.name || 'AdminDashboard';
  const registeredRoutes = state?.routeNames || [];
  const isAdmin = user?.role === 'admin';

  const performLogout = async () => {
    try {
      navigation.closeDrawer();
      if (logout) await logout();
    } catch (error) {
      console.log('Logout failed:', error);
      showNotice('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleLogout = () => {
    const message = 'Are you sure you want to end your shift and log out?';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) performLogout();
      return;
    }
    Alert.alert('Sign Out', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: performLogout },
    ]);
  };

  const DrawerItem = ({ label, icon, iconType = 'ionicons', routeName }) => {
    const isActive = activeRoute === routeName;
    const handlePress = () => {
      if (!routeName) return;
      if (registeredRoutes.includes(routeName)) navigation.navigate(routeName);
      else {
        navigation.closeDrawer();
        showNotice('Notice', `${label} screen is under development.`);
      }
    };
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={handlePress}
        className={`flex-row items-center px-3 py-2.5 rounded-xl mb-1 ${isActive ? 'bg-blue-50/80' : 'active:bg-slate-100'}`}>
        {iconType === 'ionicons' ? (
          <Ionicons name={icon} size={18} color={isActive ? '#0284C7' : '#475569'} style={{ width: 22 }} />
        ) : (
          <MaterialCommunityIcons name={icon} size={18} color={isActive ? '#0284C7' : '#475569'} style={{ width: 22 }} />
        )}
        <Text className={`text-xs font-semibold ml-2.5 ${isActive ? 'text-sky-700 font-bold' : 'text-slate-700'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title }) => (
    <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-4 mb-1.5 px-3">
      {title}
    </Text>
  );

  return (
    <DrawerContentScrollView {...props}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 12, paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center justify-between px-2 mb-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 bg-sky-600 rounded-lg items-center justify-center mr-2">
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text className="text-sm font-bold text-slate-900">MediQueue</Text>
            <Text className="text-[10px] text-slate-400 font-medium">Hospital Management</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.closeDrawer()} className="p-1">
          <Ionicons name="close" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>
      <View className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-2">
        <View className="flex-row items-center">
          <Image source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=32' }}
            className="w-10 h-10 rounded-full mr-3 border border-emerald-400" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
              {user?.name || user?.firstName || user?.email || 'User'}
            </Text>
            <Text className="text-[10px] font-semibold text-slate-500 uppercase">
              {user?.role || 'Staff'} Portal
            </Text>
          </View>
        </View>
      </View>
      <SectionHeader title="MAIN" />
      <DrawerItem label="Dashboard" icon="grid-outline" routeName="AdminDashboard" />
      <DrawerItem label="Queue Management" icon="ticket-outline" routeName="QueueManagement" />
      <SectionHeader title="HOSPITAL" />
      <DrawerItem label="OPDs" icon="business-outline" routeName="OPDManagement" />
      <DrawerItem label="Doctors" icon="stethoscope" iconType="material" routeName="DoctorsManagement" />
      <DrawerItem label="Rooms" icon="door-open" iconType="material" routeName="RoomsManagement" />
      <DrawerItem label="Consultations" icon="clipboard-outline" routeName="Consultations" />
      {isAdmin && <DrawerItem label="Waiting Areas" icon="cafe-outline" routeName="WaitingAreaManagement" />}
      <SectionHeader title="PEOPLE" />
      <DrawerItem label="Patients" icon="people-outline" routeName="PatientsManagement" />
      {isAdmin && <DrawerItem label="Users" icon="person-outline" routeName="UserManagement" />}
      <SectionHeader title="COMMUNICATION" />
      <DrawerItem label="Notifications" icon="notifications-outline" routeName="Notifications" />

      {/* SYSTEM */}
      <SectionHeader title="SYSTEM" />
      <DrawerItem label="Settings" icon="settings-outline" routeName="SystemSettings" />
      <TouchableOpacity activeOpacity={0.8} onPress={handleLogout}
        className="bg-red-50 border border-red-100 rounded-2xl p-3 mt-5 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text className="text-xs font-bold text-red-600 ml-2">Sign Out</Text>
        </View>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}
