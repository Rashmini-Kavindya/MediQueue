import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import PatientDashboard from '../screens/patient/PatientDashboard';
import LiveQueue from '../screens/patient/LiveQueue';
import Alerts from '../screens/patient/Alerts';
import Profile from '../screens/patient/Profile';


const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }) {
  const labels = {
    Home: 'Home',
    LiveQueue: 'My Queue',
    Alerts: 'Alerts',
    Profile: 'Profile',
  };

  const renderIcon = (routeName, isFocused) => {
    const activeColor = '#2563eb';
    const inactiveColor = '#64748b';
    const color = isFocused ? activeColor : inactiveColor;
    const size = 24;

    switch (routeName) {
      case 'Home':
        return <Ionicons name={isFocused ? "home" : "home-outline"} size={size} color={color} />;
      case 'LiveQueue':
        return <MaterialCommunityIcons name="format-list-numbered" size={size} color={color} />;
      case 'Alerts':
        return <Ionicons name={isFocused ? "notifications" : "notifications-outline"} size={size} color={color} />;
      case 'Profile':
        return <Ionicons name={isFocused ? "person-circle" : "person-circle-outline"} size={size} color={color} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView edges={['bottom']} className="bg-white border-t border-slate-200">
      <View className="flex-row justify-around items-center pt-2 pb-1 px-3 bg-white">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          if (route.name === 'RequestNewToken') return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              className="items-center justify-center flex-1"
            >
              <View className="relative">
                {renderIcon(route.name, isFocused)}

                {route.name === 'Alerts' && (
                  <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white" />
                )}
              </View>

              <Text
                className={`text-xs mt-1 ${
                  isFocused ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
                }`}
              >
                {labels[route.name]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={PatientDashboard} />
      <Tab.Screen name="LiveQueue" component={LiveQueue} />
      <Tab.Screen name="Alerts" component={Alerts} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}