import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabPlaceholder({ icon, title }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center mb-3">
        <Ionicons name={icon} size={26} color="#94A3B8" />
      </View>
      <Text className="text-sm font-bold text-slate-800">{title}</Text>
      <Text className="text-xs text-slate-400 text-center mt-1">Coming in the next task</Text>
    </View>
  );
}