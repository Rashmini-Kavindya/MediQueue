import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';

export default function StaffDashboard({ navigation }) {
  const { user } = useContext(AuthContext);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
      >
        {/* Header Tag and Date */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-blue-600 mr-1.5" />
            <Text className="text-[10px] font-bold text-blue-700 tracking-wider uppercase">
              STAFF PORTAL
            </Text>
          </View>

          <View className="items-end">
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              TODAY'S DATE
            </Text>
            <Text className="text-xs font-bold text-slate-800">
              12 Oct 2026
            </Text>
          </View>
        </View>

        {/* Dashboard Title */}
        <Text className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          STAFF DASHBOARD
        </Text>

        {/* OPD & Staff Info Subtitle */}
        <View className="flex-row flex-wrap items-center mb-5">
          <Text className="text-[10px] font-semibold text-slate-500 mr-3">
            OPD: <Text className="font-bold text-slate-800">GENERAL MEDICINE (FLOOR 02)</Text>
          </Text>
          <Text className="text-[10px] font-semibold text-slate-500">
            STAFF MEMBER: <Text className="font-bold text-slate-800">{user?.name || 'Dr. Perera'}</Text>
          </Text>
        </View>

        {/* Current Token Main Card */}
        <View className="bg-blue-50/50 border-2 border-blue-500 rounded-2xl p-6 items-center mb-4 shadow-sm">
          <View className="bg-white/80 px-3 py-1 rounded-full border border-blue-100 mb-2">
            <Text className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">
              CURRENT TOKEN
            </Text>
          </View>
          <Text className="text-5xl font-black text-blue-600 tracking-tight">
            A-119
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              PATIENTS WAITING
            </Text>
            <Text className="text-2xl font-bold text-slate-900">24</Text>
          </View>

          <View className="flex-1 bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              COMPLETED
            </Text>
            <Text className="text-2xl font-bold text-slate-900">42</Text>
          </View>
        </View>

        {/* Live Queue Card */}
        <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              LIVE QUEUE
            </Text>
            <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              <Text className="text-[10px] font-bold text-emerald-600">Active</Text>
            </View>
          </View>

          {/* Current Token Row */}
          <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
            <View>
              <Text className="text-[9px] font-bold text-slate-400 uppercase">CURRENT TOKEN</Text>
              <Text className="text-base font-bold text-slate-800">A-119</Text>
            </View>
            <View className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              <Text className="text-[10px] font-bold text-blue-600">IN PROGRESS</Text>
            </View>
          </View>

          {/* Next Patient Row */}
          <View className="flex-row items-center justify-between py-2 mb-4">
            <View>
              <Text className="text-[9px] font-bold text-slate-400 uppercase">NEXT PATIENT</Text>
              <Text className="text-base font-bold text-slate-800">A-120</Text>
            </View>
            <View className="bg-slate-100 px-3 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-slate-500">WAITING</Text>
            </View>
          </View>

          {/* Manage Queue Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-slate-900 py-3 rounded-xl flex-row items-center justify-center"
            onPress={() => navigation.navigate('QueueManagement')}
          >
            <Text className="text-white font-bold text-xs uppercase tracking-wider mr-2">
              MANAGE QUEUE
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Recent Activity Card */}
        <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6">
          <Text className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-4">
            RECENT ACTIVITY
          </Text>

          <View className="space-y-3">
            <View className="flex-row items-center mb-3">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-3" />
              <Text className="text-xs text-slate-600">
                Token <Text className="font-bold text-slate-900">A-118</Text> marked as{' '}
                <Text className="font-bold text-emerald-600">Completed</Text>
              </Text>
            </View>

            <View className="flex-row items-center mb-3">
              <View className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
              <Text className="text-xs text-slate-600">
                Token <Text className="font-bold text-slate-900">A-119</Text> was{' '}
                <Text className="font-bold text-blue-600">Called</Text>
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-slate-300 mr-3" />
              <Text className="text-xs text-slate-600">
                Token <Text className="font-bold text-slate-900">A-143</Text> Registered
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View className="flex-row bg-white border-t border-slate-100 py-2.5 px-4 justify-around">
        <TouchableOpacity className="items-center">
          <Ionicons name="grid-outline" size={20} color="#2563EB" />
          <Text className="text-[10px] font-bold text-blue-600 mt-0.5 uppercase">DASHBOARD</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Ionicons name="add-circle-outline" size={20} color="#94A3B8" />
          <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">QUEUE</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Ionicons name="medical-outline" size={20} color="#94A3B8" />
          <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">CONSULT</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Ionicons name="document-text-outline" size={20} color="#94A3B8" />
          <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">REPORTS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}