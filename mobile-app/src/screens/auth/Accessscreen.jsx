import React from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar } from 'react-native';
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

// Shown after RoleSelectScreen. `role` ('patient' | 'caregiver') is passed on to Login / Register.
export default function AccessScreen({ navigation, route }) {
  const { t } = useTranslation();
  const role = route?.params?.role || 'patient';

  return (
    <SafeAreaView className="flex-1 bg-[#F2F2F7]">
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      <View className="flex-1 justify-center px-6">

        {/* Logo & Heading */}
        <View className="items-center mb-9">
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

          <Text className="text-[24px] font-bold text-slate-900 mt-2 text-center tracking-tight">
            {t('access_mediqueue', 'Access MediQueue')}
          </Text>
          <Text className="text-slate-500 text-[13px] mt-1 text-center">
            {t('choose_proceed', 'Choose how you would like to proceed')}
          </Text>
        </View>

        {/* Action Options */}
        <View className="gap-3.5">

          {/* Log In Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login', { role })}
            className="flex-row items-center justify-between bg-white p-4 rounded-[20px]"
            style={softShadow}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-[#E8F0FE] rounded-[16px] justify-center items-center mr-4">
                <Ionicons name="log-in-outline" size={22} color="#0052cc" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-slate-900">
                  {t('log_in', 'Log In')}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {t('already_have_token', 'Already have a token or account')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          {/* Create Account Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Register', { role })}
            className="flex-row items-center justify-between bg-white p-4 rounded-[20px]"
            style={softShadow}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-[#E6F7EF] rounded-[16px] justify-center items-center mr-4">
                <Ionicons name="person-add-outline" size={22} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-slate-900">
                  {t('create_account', 'Create Account')}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {t('first_time_visiting', 'First time visiting? Get your OPD token')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

        </View>

        {/* Divider */}
        <View className="flex-row items-center my-8">
          <View className="flex-1 h-[1px] bg-slate-300/70" />
          <Text className="mx-3 text-xs text-slate-400">
            {t('or_continue_with', 'or continue with')}
          </Text>
          <View className="flex-1 h-[1px] bg-slate-300/70" />
        </View>

        {/* Google Sign In Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            /* Google Login logic */
          }}
          className="flex-row items-center justify-center bg-white h-[52px] px-4 rounded-[16px]"
          style={softShadow}
        >
          {/* Custom Google 'G' Icon */}
          <View className="mr-3">
            <Text className="font-bold text-base text-[#4285F4]">
              G<Text className="text-[#EA4335]">o</Text>
              <Text className="text-[#FBBC05]">o</Text>
              <Text className="text-[#4285F4]">g</Text>
              <Text className="text-[#34A853]">l</Text>
              <Text className="text-[#EA4335]">e</Text>
            </Text>
          </View>
          <Text className="text-[15px] font-semibold text-slate-800">
            {t('continue_with_google', 'Continue with Google')}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}