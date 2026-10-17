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
    <SafeAreaView className="flex-1 bg-[#F2F2F7]">
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
        className="px-6 py-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="items-center mt-4">
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

        {/* Language Selection List */}
        <View className="my-8">
          <Text className="text-[22px] font-bold text-slate-900 tracking-tight">
            {t('welcome')}
          </Text>
          <Text className="text-slate-500 text-[13px] mt-1 mb-5 font-normal">
            {t('selectLanguage')}
          </Text>

          <View className="gap-3">
            {languages.map((lang) => {
              const isSelected = selectedLanguage === lang.id;

              return (
                <TouchableOpacity
                  key={lang.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectLanguage(lang.id)}
                  className={`flex-row items-center justify-between px-4 py-3.5 rounded-[20px] bg-white ${
                    isSelected ? 'border-[1.5px] border-[#0052cc]' : 'border-[1.5px] border-transparent'
                  }`}
                  style={softShadow}
                >
                  <View className="flex-row items-center gap-3.5">
                    <View
                      className={`w-11 h-11 rounded-[14px] items-center justify-center ${
                        isSelected ? 'bg-[#E8F0FE]' : 'bg-[#F2F2F7]'
                      }`}
                    >
                      <Ionicons
                        name={lang.icon}
                        size={21}
                        color={isSelected ? '#0052cc' : '#64748b'}
                      />
                    </View>

                    <View>
                      <Text className="text-[15px] font-semibold text-slate-900">
                        {lang.name}
                      </Text>
                      <Text className="text-slate-400 text-xs font-medium mt-0.5">
                        {lang.subtitle}
                      </Text>
                    </View>
                  </View>

                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={24} color="#0052cc" />
                  ) : (
                    <View className="w-6 h-6 rounded-full border-[1.5px] border-slate-300" />
                  )}
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