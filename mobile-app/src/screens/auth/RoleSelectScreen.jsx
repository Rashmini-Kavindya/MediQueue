import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const softShadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 3,
};

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
    <SafeAreaView className="flex-1 bg-[#F2F2F7]">
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      {/* Top Bar with Staff Login Button */}
      <View className="flex-row items-center justify-end px-5 py-3">
        <TouchableOpacity
          onPress={() => navigation.navigate('StaffLogin')}
          className="flex-row items-center bg-white px-3 py-2 rounded-full"
          style={softShadow}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark-outline" size={14} color="#0052cc" />
          <Text className="text-xs font-semibold text-[#0052cc] ml-1.5">Staff Login</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
        className="px-6 pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header & Logo */}
        <View className="items-center mt-2">
          <View
            className="w-[120px] h-[120px] rounded-[30px] bg-white items-center justify-center mb-4"
            style={softShadow}
          >
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: 96, height: 96 }}
              resizeMode="contain"
            />
          </View>

          <Text className="text-[26px] font-extrabold text-slate-900 tracking-tight">
            Medi<Text className="text-[#0052cc]">Queue</Text>
          </Text>
          <Text className="text-slate-500 text-xs font-medium mt-1 text-center">
            {t('tagline')}
          </Text>
        </View>

        {/* Role Selection Options */}
        <View className="my-8">
          <Text className="text-[22px] font-bold text-slate-900 tracking-tight mb-5">
            {t('role.question')}
          </Text>

          <View className="gap-3.5">
            {roles.map((role) => {
              const isSelected = selectedRole === role.id;

              return (
                <TouchableOpacity
                  key={role.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedRole(role.id)}
                  className="flex-row items-center justify-between p-4 rounded-[20px] bg-white"
                  style={{
                    ...softShadow,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#0052cc' : 'transparent',
                  }}
                >
                  <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                    <View
                      className={`w-12 h-12 rounded-[16px] items-center justify-center ${
                        isSelected ? 'bg-[#E8F0FE]' : 'bg-[#F2F2F7]'
                      }`}
                    >
                      <Ionicons
                        name={role.icon}
                        size={22}
                        color={isSelected ? '#0052cc' : '#64748b'}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-slate-900">
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
                    color={isSelected ? '#0052cc' : '#C7C7CC'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          className="w-full bg-[#0052cc] h-[54px] rounded-[16px] flex-row items-center justify-center mb-2"
          style={{
            shadowColor: '#0052cc',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <Text className="text-white font-semibold text-base mr-2">
            {t('continue')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}