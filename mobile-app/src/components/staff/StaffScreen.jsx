import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const todayLabel = () => {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Shared header (STAFF PORTAL pill, today's date, serif title) + scrollable body.
// `footer` is rendered pinned below the scroll area (above the tab bar).
export default function StaffScreen({ title, children, footer, badge }) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <View className="px-5 pt-2 pb-3 border-b border-slate-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1">
            <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5" />
            <Text className="text-[9px] font-bold text-blue-700 tracking-wider">STAFF PORTAL</Text>
          </View>
          <View className="items-end">
            <Text className="text-[8px] font-semibold text-slate-400 tracking-wider">TODAY'S DATE</Text>
            <Text className="text-[11px] font-bold text-slate-800">{todayLabel()}</Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-3">
          <Text style={{ fontFamily: SERIF }} className="text-[22px] text-slate-900 tracking-wide">
            {title}
          </Text>
          {badge ? (
            <View className="bg-blue-600 rounded-md px-2 py-1">
              <Text className="text-[10px] font-bold text-white">{badge}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>

      {footer}
    </SafeAreaView>
  );
}