import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';

// iOS system colors (same palette as the patient screens)
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.08)',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  fill: '#EFEFF4',
  groupedBg: '#F2F2F7',
  white: '#FFFFFF',
};

const squircle = { borderCurve: 'continuous' };
const cardShadow = {
  shadowColor: '#0B1B3A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 2,
};

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
    const iconColor = isActive ? IOS.blue : IOS.secondaryLabel;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 9,
            borderRadius: 16,
            marginBottom: 4,
            backgroundColor: isActive ? IOS.blueSoft : 'transparent',
          },
          squircle,
        ]}
      >
        <View
          style={[
            {
              width: 32,
              height: 32,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor: isActive ? 'rgba(0,122,255,0.14)' : IOS.fill,
            },
            squircle,
          ]}
        >
          {iconType === 'ionicons' ? (
            <Ionicons name={icon} size={18} color={iconColor} />
          ) : (
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
          )}
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            letterSpacing: -0.2,
            fontWeight: isActive ? '700' : '500',
            color: isActive ? IOS.blue : IOS.label,
          }}
        >
          {label}
        </Text>
        {isActive && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: IOS.blue }} />}
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title }) => (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: IOS.tertiaryLabel,
        marginTop: 18,
        marginBottom: 6,
        paddingHorizontal: 10,
      }}
    >
      {title}
    </Text>
  );

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: IOS.groupedBg }}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 14, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand header with logo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={require('../../../assets/logo.png')}
            style={{ width: 40, height: 40, marginRight: 10 }}
            resizeMode="contain"
          />
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: -0.2, color: IOS.label }}>MediQueue</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: IOS.tertiaryLabel, marginTop: 1 }}>Hospital Management</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.closeDrawer()}
          activeOpacity={0.7}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: IOS.fill, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={19} color={IOS.secondaryLabel} />
        </TouchableOpacity>
      </View>

      {/* Profile card */}
      <View
        style={[
          {
            backgroundColor: IOS.white,
            borderRadius: 22,
            padding: 14,
            marginBottom: 4,
            borderWidth: 0.5,
            borderColor: 'rgba(60,60,67,0.12)',
          },
          squircle,
          cardShadow,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=32' }}
            style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12, borderWidth: 2, borderColor: IOS.green }}
          />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '600', letterSpacing: -0.2, color: IOS.label }}>
              {user?.name || user?.firstName || user?.email || 'User'}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', color: IOS.tertiaryLabel, marginTop: 3 }}>
              {user?.role || 'Staff'} Portal
            </Text>
          </View>
        </View>
      </View>

      <SectionHeader title="MAIN" />
      <DrawerItem label="Dashboard" icon="grid-outline" routeName="AdminDashboard" />
      <DrawerItem label="Queue Management" icon="ticket-outline" routeName="QueueManagement" />
      <SectionHeader title="HOSPITAL" />
      <DrawerItem label="Token Management" icon="business-outline" routeName="TokenManagement" />
      <DrawerItem label="OPDs" icon="business-outline" routeName="OPDManagement" />
      <DrawerItem label="Doctors" icon="stethoscope" iconType="material" routeName="DoctorsManagement" />
      <DrawerItem label="Rooms" icon="door-open" iconType="material" routeName="RoomsManagement" />
      <DrawerItem label="Consultations" icon="clipboard-outline" routeName="Consultations" />
      {isAdmin && <DrawerItem label="Waiting Areas" icon="cafe-outline" routeName="WaitingAreaManagement" />}
      <SectionHeader title="PEOPLE" />
      {isAdmin && <DrawerItem label="Users" icon="person-outline" routeName="UserManagement" />}
      <SectionHeader title="COMMUNICATION" />
      <DrawerItem label="Notifications" icon="notifications-outline" routeName="Notifications" />

      {/* SYSTEM */}
      <SectionHeader title="SYSTEM" />
      <DrawerItem label="Settings" icon="settings-outline" routeName="SystemSettings" />
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleLogout}
        style={[
          {
            backgroundColor: IOS.redSoft,
            borderRadius: 18,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginTop: 22,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          },
          squircle,
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color={IOS.red} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: IOS.red, marginLeft: 8 }}>Sign Out</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}