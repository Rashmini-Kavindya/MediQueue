import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function LanguageSelectScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');

  const languages = [
    {
      id: 'si', // Sinhala
      name: 'සිංහල',
      subtitle: 'Sinhala',
      icon: 'language-outline',
    },
    {
      id: 'en', // English
      name: 'English',
      subtitle: 'Standard',
      icon: 'globe-outline',
    },
    {
      id: 'ta', // Tamil
      name: 'தமிழ்',
      subtitle: 'Tamil',
      icon: 'text-outline',
    },
  ];

  const handleSelectLanguage = async (langId) => {
    setSelectedLanguage(langId);
    await i18n.changeLanguage(langId);
  };

  const handleContinue = () => {
    navigation.replace('RoleSelectScreen'); // 👈 Navigator Screen Name barobar map kara
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
        className="px-6 py-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
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

        {/* Language Selection List */}
        <View className="my-6">
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            {t('welcome')}
          </Text>
          <Text className="text-slate-500 text-xs mt-1 mb-5 font-normal">
            {t('selectLanguage')}
          </Text>

          <View className="space-y-3">
            {languages.map((lang) => {
              const isSelected = selectedLanguage === lang.id;

              return (
                <TouchableOpacity
                  key={lang.id}
                  activeOpacity={0.85}
                  onPress={() => handleSelectLanguage(lang.id)}
                  className={`flex-row items-center justify-between p-4 rounded-2xl border shadow-sm ${
                    isSelected
                      ? 'bg-[#edf4ff] border-[#1d61e7]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <View className="flex-row items-center space-x-3.5">
                    <View
                      className={`w-11 h-11 rounded-xl items-center justify-center ${
                        isSelected ? 'bg-[#dbe8ff]' : 'bg-slate-100'
                      }`}
                    >
                      <Ionicons
                        name={lang.icon}
                        size={20}
                        color={isSelected ? '#1d61e7' : '#64748b'}
                      />
                    </View>

                    <View>
                      <Text
                        className={`text-sm font-bold ${
                          isSelected ? 'text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {lang.name}
                      </Text>
                      <Text className="text-slate-400 text-[11px] font-medium mt-0.5">
                        {lang.subtitle}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center border-2 ${
                      isSelected ? 'border-[#1d61e7] bg-white' : 'border-slate-300 bg-transparent'
                    }`}
                  >
                    {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-[#1d61e7]" />}
                  </View>
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