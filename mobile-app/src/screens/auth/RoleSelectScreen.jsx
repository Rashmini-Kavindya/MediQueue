import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function RoleSelectScreen({ navigation }) {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState('patient');

  const roles = [
    {
      id: 'patient',
      title: t('role.patientTitle'),
      subtitle: t('role.patientSub'),
      icon: 'person-outline',
    },
    {
      id: 'caregiver',
      title: t('role.caregiverTitle'),
      subtitle: t('role.caregiverSub'),
      icon: 'people-outline',
    },
  ];

  const handleContinue = () => {
    // Selected role is passed on to Access -> Login / Register
    navigation.navigate('Access', { role: selectedRole });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Bar with Staff Login Button */}
      <View className="flex-row items-center justify-end px-5 py-3 bg-white">
        <TouchableOpacity 
          onPress={() => navigation.navigate('StaffLogin')}
          className="flex-row items-center bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 active:bg-blue-100"
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark-outline" size={14} color="#2563EB" />
          <Text className="text-xs font-bold text-blue-600 ml-1">Staff Login</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
        className="px-6 pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header & Logo */}
        <View className="items-center mt-2">
          <View className="w-24 h-24 rounded-3xl bg-blue-50/60 items-center justify-center p-2 mb-3 border border-blue-100/50 shadow-sm">
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
            />
          </View>

          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Medi<Text className="text-[#0052cc]">Queue</Text>
          </Text>
          <Text className="text-slate-400 text-[11px] font-medium mt-1 text-center tracking-wide">
            {t('tagline')}
          </Text>
        </View>

        {/* Role Selection Options */}
        <View className="my-6">
          <Text className="text-xl font-bold text-slate-900 tracking-tight mb-6">
            {t('role.question')}
          </Text>

          <View className="space-y-4">
            {roles.map((role) => {
              const isSelected = selectedRole === role.id;

              return (
                <TouchableOpacity
                  key={role.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedRole(role.id)}
                  className={`flex-row items-center justify-between p-4 rounded-2xl border shadow-sm ${
                    isSelected
                      ? 'bg-white border-[#1d61e7]'
                      : 'bg-white border-slate-200'
                  }`}
                  style={{
                    borderWidth: isSelected ? 2 : 1,
                  }}
                >
                  <View className="flex-row items-center space-x-3.5 flex-1 pr-2">
                    <View
                      className={`w-12 h-12 rounded-2xl items-center justify-center ${
                        isSelected ? 'bg-[#edf4ff]' : 'bg-slate-100'
                      }`}
                    >
                      <Ionicons
                        name={role.icon}
                        size={22}
                        color={isSelected ? '#1d61e7' : '#64748b'}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-base font-bold text-slate-900">
                        {role.title}
                      </Text>
                      <Text className="text-slate-400 text-xs font-normal mt-0.5">
                        {role.subtitle}
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isSelected ? '#1d61e7' : '#cbd5e1'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleContinue}
          className="w-full bg-[#0052cc] py-4 rounded-2xl flex-row items-center justify-center mb-2 shadow-md shadow-blue-500/25"
        >
          <Text className="text-white font-bold text-sm tracking-wider mr-2 uppercase">
            {t('continue')}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}