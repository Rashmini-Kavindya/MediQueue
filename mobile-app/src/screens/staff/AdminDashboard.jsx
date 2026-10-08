import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import Header from '../../components/admin/Header';

export default function AdminDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);

  // Only navigate if the screen is registered in AdminNavigator,
  // otherwise show a notice instead of a "not handled by any navigator" error.
  const navigateSafely = (screenName) => {
    const routeNames = navigation.getState?.()?.routeNames || [];
    if (routeNames.includes(screenName)) {
      navigation.navigate(screenName);
    } else {
      Alert.alert('Notice', `${screenName} screen is under development.`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to end your shift and log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            if (logout) {
              await logout();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* 1. REUSABLE TOP HEADER BAR */}
      <Header
        title="MediQueue"
        rightElement={
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => navigateSafely('Alerts')}
              className="relative p-1.5 rounded-full bg-slate-50 border border-slate-100"
            >
              <Ionicons name="notifications-outline" size={18} color="#334155" />
              <View className="w-2 h-2 rounded-full bg-red-500 absolute top-1 right-1 border border-white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.openDrawer()}>
              <Image
                source={{
                  uri: user?.avatar || 'https://i.pravatar.cc/150?img=32',
                }}
                className="w-8 h-8 rounded-full border border-sky-500"
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
      >
        {/* Header Sub-bar: Status Tag & Date */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            <Text className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase">
              LIVE SYSTEM ON
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

        {/* Admin Title & Info Subtitle */}
        <Text className="text-2xl font-black text-slate-900 tracking-tight mb-1">
          ADMIN DASHBOARD
        </Text>

        <View className="flex-row flex-wrap items-center mb-5">
          <Text className="text-[10px] font-semibold text-slate-500 mr-3">
            PORTAL:{' '}
            <Text className="font-bold text-slate-800">
              ST. JUDE HOSPITAL (WARD B)
            </Text>
          </Text>
          <Text className="text-[10px] font-semibold text-slate-500">
            ADMIN:{' '}
            <Text className="font-bold text-slate-800">
              {user?.name || 'Sarah Jenkins, RN'}
            </Text>
          </Text>
        </View>

        {/* Current Token Main Card */}
        <View className="bg-sky-50/60 border-2 border-sky-500 rounded-2xl p-6 items-center mb-4 shadow-sm">
          <View className="bg-white px-3 py-1 rounded-full border border-sky-100 mb-2">
            <Text className="text-[10px] font-bold text-sky-600 tracking-wider uppercase">
              ACTIVE CALLING TOKEN
            </Text>
          </View>
          <Text className="text-5xl font-black text-sky-600 tracking-tight">
            A-119
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              PATIENTS WAITING
            </Text>
            <Text className="text-2xl font-bold text-slate-900">34</Text>
          </View>

          <View className="flex-1 bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              OPD UNITS
            </Text>
            <Text className="text-2xl font-bold text-slate-900">6 Active</Text>
          </View>

          <View className="flex-1 bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              DOCTORS
            </Text>
            <Text className="text-2xl font-bold text-emerald-600">12 Available</Text>
          </View>
        </View>

        {/* Live Queue Overview Card */}
        <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              LIVE QUEUE CONTROL
            </Text>
            <View className="bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
              <Text className="text-[10px] font-bold text-sky-600">
                General Medicine
              </Text>
            </View>
          </View>

          {/* Current Token Row */}
          <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
            <View>
              <Text className="text-[9px] font-bold text-slate-400 uppercase">
                CURRENT TOKEN
              </Text>
              <Text className="text-base font-bold text-slate-800">A-119</Text>
            </View>
            <View className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              <Text className="text-[10px] font-bold text-blue-600">
                IN CONSULTATION
              </Text>
            </View>
          </View>

          {/* Next Patient Row */}
          <View className="flex-row items-center justify-between py-2 mb-4">
            <View>
              <Text className="text-[9px] font-bold text-slate-400 uppercase">
                NEXT PATIENT
              </Text>
              <Text className="text-base font-bold text-slate-800">A-120</Text>
            </View>
            <View className="bg-slate-100 px-3 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-slate-500">
                WAITING IN WARD
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-slate-900 py-3 rounded-xl flex-row items-center justify-center"
            onPress={() => navigateSafely('QueueManagement')}
          >
            <Text className="text-white font-bold text-xs uppercase tracking-wider mr-2">
              MANAGE ALL QUEUES
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* System Activity Logs */}
        <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6">
          <Text className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-4">
            RECENT SYSTEM ACTIVITIES
          </Text>

          <View className="space-y-3">
            <View className="flex-row items-center mb-3">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-3" />
              <Text className="text-xs text-slate-600">
                Doctor <Text className="font-bold text-slate-900">Dr. Perera</Text> logged into{' '}
                <Text className="font-bold text-emerald-600">OPD Unit 02</Text>
              </Text>
            </View>

            <View className="flex-row items-center mb-3">
              <View className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
              <Text className="text-xs text-slate-600">
                Token <Text className="font-bold text-slate-900">A-119</Text> called for{' '}
                <Text className="font-bold text-blue-600">Room 04</Text>
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-amber-500 mr-3" />
              <Text className="text-xs text-slate-600">
                New Emergency Alert added for <Text className="font-bold text-slate-900">Ward B</Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 3. FLOATING BOTTOM NAVIGATION BAR */}
      <View className="absolute bottom-4 left-5 right-5 bg-white border border-slate-100 rounded-3xl p-3 flex-row justify-around items-center shadow-lg shadow-slate-200">
        {/* Dashboard Link (Active Tab) */}
        <TouchableOpacity className="items-center px-3 py-1">
          <Ionicons name="grid" size={22} color="#0052CC" />
          <Text className="text-[10px] font-bold text-[#0052CC] mt-1">Home</Text>
        </TouchableOpacity>

        {/* Active Queue Link */}
        <TouchableOpacity
          onPress={() => navigateSafely('QueueManagement')}
          className="items-center px-3 py-1"
        >
          <Ionicons name="ticket-outline" size={22} color="#64748B" />
          <Text className="text-[10px] font-semibold text-slate-500 mt-1">Queue</Text>
        </TouchableOpacity>

        {/* OPDs Link */}
        <TouchableOpacity
          onPress={() => navigateSafely('OPDManagement')}
          className="items-center px-3 py-1"
        >
          <Ionicons name="business-outline" size={22} color="#64748B" />
          <Text className="text-[10px] font-semibold text-slate-500 mt-1">OPDs</Text>
        </TouchableOpacity>

        {/* Patients Link */}
        <TouchableOpacity
          onPress={() => navigateSafely('PatientsManagement')}
          className="items-center px-3 py-1"
        >
          <Ionicons name="people-outline" size={22} color="#64748B" />
          <Text className="text-[10px] font-semibold text-slate-500 mt-1">Patients</Text>
        </TouchableOpacity>

        {/* Settings Link */}
        <TouchableOpacity
          onPress={() => navigateSafely('SystemSettings')}
          className="items-center px-3 py-1"
        >
          <Ionicons name="settings-outline" size={22} color="#64748B" />
          <Text className="text-[10px] font-semibold text-slate-500 mt-1">Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}