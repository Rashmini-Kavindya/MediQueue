import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import NotificationBell from '../staff/NotificationBell';


export default function Header({ title, showBack = false, rightElement }) {
  const navigation = useNavigation();

  return (
    <View className="flex-row items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100">
      <View className="flex-row items-center">
        {showBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-1.5 mr-2 bg-slate-100 rounded-lg"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#1E293B" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            className="p-1.5 mr-2 bg-slate-100 rounded-lg"
            hitSlop={8}
          >
            <Ionicons name="menu-outline" size={22} color="#1E293B" />
          </TouchableOpacity>
        )}
        <Text className="text-base font-bold text-slate-800 tracking-tight">
          {title}
        </Text>
      </View>

      {/* Dynamic Right Side Element (e.g. Staff Tag, Refresh). Default = notification bell popup */}
      {rightElement ? rightElement : <NotificationBell />}
    </View>
  );
}