import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';

export default function PatientDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center px-6">
      <View className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl border border-slate-700 items-center">
        <Text className="text-2xl font-bold text-white mb-2">
          {t('dashboard.title')}
        </Text>

        <Text className="text-cyan-400 font-medium mb-1">
          {t('dashboard.welcome', { name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() })}
        </Text>

        <Text className="text-slate-400 text-sm mb-6">
          {t('dashboard.userId', { id: user?.userId || '' })}
        </Text>

        <TouchableOpacity 
          className="bg-red-600 px-6 py-3 rounded-xl w-full items-center"
          onPress={logout}
        >
          <Text className="text-white font-semibold">
            {t('dashboard.logout')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floating Chatbot Button */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 flex-row items-center bg-blue-700 px-5 h-14 rounded-full border-2 border-white shadow-lg"
        style={{ elevation: 8 }}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Chatbot')}
      >
        <Text className="text-white text-xl mr-2">💬</Text>
        <Text className="text-white font-bold">
          {t('dashboard.askAi')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}