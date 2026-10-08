import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import StaffScreen from '../../components/staff/StaffScreen';

const STATS = [
  { label: 'IN QUEUE', value: '3', color: 'text-amber-600' },
  { label: 'IN CONSULTATION', value: '1', color: 'text-blue-600' },
  { label: 'COMPLETED', value: '142', color: 'text-emerald-600' },
  { label: 'AVG. WAIT', value: '42m', color: 'text-slate-900' },
];

const ACTIONS = [
  { label: 'Manage queue', icon: 'people-outline', tab: 'Queue' },
  { label: 'Consultations', icon: 'clipboard-outline', tab: 'Consult' },
  { label: 'View reports', icon: 'document-text-outline', tab: 'Reports' },
];

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <StaffScreen title="DASHBOARD">
      <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <Text className="text-xs text-slate-400">Welcome back</Text>
        <Text className="text-lg font-bold text-slate-900 mt-0.5">
          {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Staff member'}
        </Text>
        <Text className="text-[11px] text-slate-500 mt-1 capitalize">{user?.role || 'staff'}</Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {STATS.map((s) => (
          <View key={s.label} className="w-[48.5%] bg-white border border-slate-200 rounded-2xl p-4 mb-3">
            <Text className="text-[9px] font-bold text-slate-500 tracking-wider">{s.label}</Text>
            <Text className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</Text>
          </View>
        ))}
      </View>

      <Text className="text-[11px] font-bold text-slate-500 tracking-wider mt-2 mb-2">QUICK ACTIONS</Text>
      {ACTIONS.map((a) => (
        <TouchableOpacity
          key={a.tab}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(a.tab)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-2 flex-row items-center"
        >
          <Ionicons name={a.icon} size={20} color="#0052CC" />
          <Text className="flex-1 ml-3 text-sm font-semibold text-slate-800">{a.label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>
      ))}

      {typeof logout === 'function' && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          className="mt-4 border border-red-200 bg-red-50 rounded-xl py-3 items-center"
        >
          <Text className="text-xs font-bold text-red-600">Log out</Text>
        </TouchableOpacity>
      )}
    </StaffScreen>
  );
}