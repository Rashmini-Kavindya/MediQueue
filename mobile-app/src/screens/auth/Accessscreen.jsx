import React from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Shown after RoleSelectScreen. `role` ('patient' | 'caregiver') is passed on to Login / Register.
export default function AccessScreen({ navigation, route }) {
  const { t } = useTranslation();
  const role = route?.params?.role || 'patient';

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FE" />

      <View className="flex-1 justify-center px-6">

        {/* Logo & Heading */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-3xl bg-blue-50/60 items-center justify-center p-2 mb-3 border border-blue-100/50">
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
            />
          </View>

          <Text className="text-2xl font-bold text-slate-900 mt-3 text-center">
            {t('access_mediqueue', 'Access MediQueue')}
          </Text>
          <Text className="text-slate-500 text-sm mt-1 text-center">
            {t('choose_proceed', 'Choose how you would like to proceed')}
          </Text>
        </View>

        {/* Action Options */}
        <View className="gap-4">

          {/* Log In Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Login', { role })}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-blue-50 rounded-xl justify-center items-center mr-4">
                <Ionicons name="log-in-outline" size={22} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-800">
                  {t('log_in', 'Log In')}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {t('already_have_token', 'Already have a token or account')}
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          {/* Create Account Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Register', { role })}
            className="flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-emerald-50 rounded-xl justify-center items-center mr-4">
                <Ionicons name="person-add-outline" size={22} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-800">
                  {t('create_account', 'Create Account')}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {t('first_time_visiting', 'First time visiting? Get your OPD token')}
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

        </View>

        {/* Divider */}
        <View className="flex-row items-center my-8">
          <View className="flex-1 h-[1px] bg-slate-200" />
          <Text className="mx-3 text-xs text-slate-400">
            {t('or_continue_with', 'or continue with')}
          </Text>
          <View className="flex-1 h-[1px] bg-slate-200" />
        </View>

        {/* Google Sign In Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            /* Google Login logic */
          }}
          className="flex-row items-center justify-center bg-white py-3.5 px-4 rounded-xl border border-slate-200 shadow-sm"
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
          <Text className="text-sm font-semibold text-slate-700">
            {t('continue_with_google', 'Continue with Google')}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}