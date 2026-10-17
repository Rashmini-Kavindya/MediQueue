import React from 'react';
import { View, Text } from 'react-native';

const STYLES = {
  WAITING: { box: 'bg-amber-100', text: 'text-amber-700', label: 'WAITING' },
  CALLED: { box: 'bg-orange-100', text: 'text-orange-700', label: 'CALLED' },
  CONSULTING: { box: 'bg-blue-100', text: 'text-blue-700', label: 'IN CONSULTATION' },
  COMPLETED: { box: 'bg-emerald-100', text: 'text-emerald-700', label: 'COMPLETED' },
  HOLD: { box: 'bg-slate-200', text: 'text-slate-700', label: 'HOLD' },
  'NO SHOW': { box: 'bg-red-100', text: 'text-red-700', label: 'NO SHOW' },
};

export default function StatusPill({ status }) {
  const s = STYLES[status] || STYLES.WAITING;
  return (
    <View className={`${s.box} rounded-full px-2.5 py-1 self-start`}>
      <Text className={`${s.text} text-[9px] font-bold tracking-wide`}>{s.label}</Text>
    </View>
  );
}