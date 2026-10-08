import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  Octicons,
} from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';

export default function Profile({ navigation }) {
  const { user, logout } = useContext(AuthContext);

  const {
    selectedLanguage,
    textSize,
    getFontSize,
    updateLanguage,
    updateTextSize,
    t,
  } = useSettings();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const [activeModal, setActiveModal] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Profile data fetch කිරීම
  const fetchProfileData = async () => {
    try {
      const res = await API.get('/users/me');
      console.log('Profile Fetch Response:', res.data);

      if (res.data && res.data.success) {
        setProfileData(res.data.data);
      }
    } catch (error) {
      console.log('Error fetching profile data:', error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  // Language update කිරීම සහ Backend එකට Save කිරීම
  const handleLanguageChange = async (lang) => {
    // 1. Language code mapping (Backend එකට 'si', 'en', 'ta' යැවීමට)
    const langCodeMap = {
      English: 'en',
      Sinhala: 'si',
      Tamil: 'ta',
    };

    const targetCode = langCodeMap[lang] || 'si';

    try {
      setSavingLanguage(true);
      // Front-end Context එක update කිරීම
      updateLanguage(lang);

      // Backend API Update: User Profile / Preferences එකට save කිරීම
      await API.put('/users/me', { language: targetCode });
      
      // Secondary Backup: Preferences endpoint එකක් තියෙනවා නම් එකත් call කරයි
      try {
        await API.put('/users/me/preferences', { language: targetCode });
      } catch (prefErr) {
        // Preferences endpoint නැතත් User profile update එක සාර්ථකයි
      }

      console.log('Language preference updated to:', targetCode);
    } catch (error) {
      console.log('Language save error:', error?.response?.data?.message || error.message);
    } finally {
      setSavingLanguage(false);
      setActiveModal(null);
    }
  };

  const handleTextSizeChange = (size) => {
    updateTextSize(size);
    setActiveModal(null);
  };

  // Profile Details mapping
  const patientName = profileData
    ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
    : user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'User';

  const patientPhone = profileData?.phone || user?.phone || 'N/A';
  const patientEmail = profileData?.email || user?.email || 'N/A';
  const patientNic = profileData?.nic || user?.nic || 'N/A';
  const roleDisplay = profileData?.role ? profileData.role.toUpperCase() : 'PATIENT';

  const avatarUrl =
    profileData?.avatarUrl ||
    user?.avatarUrl ||
    'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

  const isNicVerified = Boolean(patientNic && patientNic !== 'N/A');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center px-5 pt-3 pb-2">
          <View className="flex-row items-center">
            <View className="w-9 h-9 justify-center items-center mr-2">
              <MaterialCommunityIcons name="hospital-box-outline" size={32} color="#0284c7" />
            </View>
            <View>
              <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-blue-600 tracking-wider">
                {t?.appTitle || 'MEDIQUEUE'}
              </Text>
              <Text style={{ fontSize: getFontSize(18) }} className="font-bold text-slate-900 leading-5">
                {t?.profileHeader || 'Profile'}
              </Text>
            </View>
          </View>

          <TouchableOpacity className="w-10 h-10 bg-blue-600 rounded-full justify-center items-center shadow-sm">
            <Ionicons name="person" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <>
            <View className="px-5 my-3 flex-row justify-between items-start">
              <View className="flex-1 mr-2">
                <Text style={{ fontSize: getFontSize(24) }} className="font-extrabold text-slate-900">
                  {t?.patientProfile || 'Patient Profile'}
                </Text>
                <Text style={{ fontSize: getFontSize(12) }} className="font-medium text-slate-500 mt-0.5 leading-4">
                  {t?.profileSubtitle || 'Manage your account settings'}
                </Text>
              </View>

              {isNicVerified && (
                <View className="bg-emerald-200/70 border border-emerald-300 px-3 py-1.5 rounded-full flex-row items-center">
                  <Octicons name="verified" size={13} color="#047857" />
                  <Text style={{ fontSize: getFontSize(11) }} className="font-bold text-emerald-800 ml-1.5">
                    NIC: {patientNic}
                  </Text>
                </View>
              )}
            </View>

            {/* Profile Info Details */}
            <View className="items-center my-4">
              <View className="relative mb-3">
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-24 h-24 rounded-full border-2 border-blue-200 bg-slate-200"
                />
                <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-white">
                  <MaterialCommunityIcons name="check-decagram" size={14} color="#ffffff" />
                </View>
              </View>

              <Text style={{ fontSize: getFontSize(24) }} className="font-black text-slate-900">
                {patientName}
              </Text>
              <Text style={{ fontSize: getFontSize(14) }} className="font-semibold text-slate-500 mt-0.5">
                {patientPhone} • {patientEmail}
              </Text>

              <View className="mt-3 bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl flex-row items-center">
                <MaterialCommunityIcons name="medical-bag" size={16} color="#0284c7" />
                <Text style={{ fontSize: getFontSize(12) }} className="font-bold text-slate-700 ml-2">
                  {roleDisplay} ACCOUNT
                </Text>
              </View>
            </View>

            {/* App Settings Section */}
            <View className="px-5 mt-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text style={{ fontSize: getFontSize(12) }} className="font-extrabold text-slate-500 tracking-wider uppercase">
                  {t?.appSettings || 'App Settings'}
                </Text>
                <Text style={{ fontSize: getFontSize(12) }} className="font-semibold text-slate-400">
                  {t?.general || 'General'}
                </Text>
              </View>

              <View className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Language Trigger */}
                <TouchableOpacity 
                  onPress={() => setActiveModal('language')}
                  className="flex-row items-center justify-between p-4 border-b border-slate-100"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-2xl bg-blue-50 justify-center items-center mr-3">
                      <Feather name="globe" size={18} color="#0284c7" />
                    </View>
                    <View>
                      <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-800">
                        {t?.language || 'Language'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 mt-0.5">
                        {t?.languageSubtitle || 'Change application language'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    {savingLanguage ? (
                      <ActivityIndicator size="small" color="#0284c7" className="mr-2" />
                    ) : (
                      <Text style={{ fontSize: getFontSize(12) }} className="font-semibold text-slate-500 mr-1">
                        {selectedLanguage}
                      </Text>
                    )}
                    <Feather name="chevron-right" size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>

                {/* Notifications Trigger */}
                <TouchableOpacity 
                  onPress={() => setActiveModal('notifications')}
                  className="flex-row items-center justify-between p-4 border-b border-slate-100"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-2xl bg-blue-50 justify-center items-center mr-3">
                      <Ionicons name="notifications-outline" size={18} color="#0284c7" />
                    </View>
                    <View>
                      <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-800">
                        {t?.notifications || 'Notifications'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 mt-0.5">
                        {t?.notificationsSubtitle || 'Manage alerts and updates'}
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={16} color="#94a3b8" />
                </TouchableOpacity>

                {/* Accessibility Trigger */}
                <TouchableOpacity 
                  onPress={() => setActiveModal('accessibility')}
                  className="flex-row items-center justify-between p-4 border-b border-slate-100"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-2xl bg-blue-50 justify-center items-center mr-3">
                      <MaterialCommunityIcons name="format-size" size={20} color="#0284c7" />
                    </View>
                    <View>
                      <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-800">
                        {t?.accessibility || 'Text Size'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 mt-0.5">
                        {t?.accessibilitySubtitle || 'Adjust font sizes'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Text style={{ fontSize: getFontSize(12) }} className="font-semibold text-slate-500 mr-1">
                      {textSize}
                    </Text>
                    <Feather name="chevron-right" size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>

                {/* Privacy Trigger */}
                <TouchableOpacity 
                  onPress={() => setActiveModal('privacy')}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-2xl bg-blue-50 justify-center items-center mr-3">
                      <Feather name="lock" size={18} color="#0284c7" />
                    </View>
                    <View>
                      <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-800">
                        {t?.privacy || 'Privacy & Security'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 mt-0.5">
                        {t?.privacySubtitle || 'Biometrics and PIN'}
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Logout Button */}
              <TouchableOpacity
                onPress={logout}
                className="mt-6 bg-red-50 border border-red-100 py-3.5 rounded-2xl flex-row justify-center items-center"
              >
                <Feather name="log-out" size={16} color="#dc2626" />
                <Text style={{ fontSize: getFontSize(14) }} className="text-red-600 font-extrabold ml-2">
                  {t?.logOut || 'Log Out'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={activeModal === 'language'} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontSize: getFontSize(18) }} className="font-black text-slate-900">
                {t?.selectLanguage || 'Select Language'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {['English', 'Sinhala', 'Tamil'].map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => handleLanguageChange(lang)}
                className={`py-3.5 px-4 rounded-xl border mb-2 flex-row justify-between items-center ${
                  selectedLanguage === lang ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <Text
                  style={{ fontSize: getFontSize(14) }}
                  className={`font-bold ${selectedLanguage === lang ? 'text-blue-600' : 'text-slate-800'}`}
                >
                  {lang}
                </Text>
                {selectedLanguage === lang && <Feather name="check" size={18} color="#0284c7" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Text Size Modal */}
      <Modal visible={activeModal === 'accessibility'} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontSize: getFontSize(18) }} className="font-black text-slate-900">
                {t?.textSizeDisplay || 'Text Size'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {[
              { label: t?.smallText || 'Small', value: 'Small' },
              { label: t?.mediumText || 'Medium', value: 'Medium' },
              { label: t?.largeText || 'Large', value: 'Large' },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => handleTextSizeChange(item.value)}
                className={`py-3.5 px-4 rounded-xl border mb-2 flex-row justify-between items-center ${
                  textSize === item.value ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <Text
                  style={{ fontSize: getFontSize(14) }}
                  className={`font-bold ${textSize === item.value ? 'text-blue-600' : 'text-slate-800'}`}
                >
                  {item.label}
                </Text>
                {textSize === item.value && <Feather name="check" size={18} color="#0284c7" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={activeModal === 'notifications'} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontSize: getFontSize(18) }} className="font-black text-slate-900">
                {t?.notifications || 'Notifications'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center py-3 border-b border-slate-100">
              <View className="flex-1 mr-2">
                <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-800">
                  {t?.queueAlerts || 'Queue Alerts'}
                </Text>
                <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400">
                  {t?.queueAlertsSubtitle || 'Get notified when your turn is near'}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#cbd5e1', true: '#0284c7' }}
              />
            </View>

            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              className="mt-6 bg-blue-600 py-3.5 rounded-2xl items-center"
            >
              <Text style={{ fontSize: getFontSize(14) }} className="text-white font-bold">
                {t?.savePreferences || 'Save Preferences'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={activeModal === 'privacy'} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontSize: getFontSize(18) }} className="font-black text-slate-900">
                {t?.privacy || 'Privacy & Security'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center py-3 border-b border-slate-100">
              <View className="flex-1 mr-2">
                <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-800">
                  {t?.biometricUnlock || 'Biometric Unlock'}
                </Text>
                <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400">
                  {t?.biometricSubtitle || 'Use Fingerprint / Face ID to unlock'}
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={setBiometricsEnabled}
                trackColor={{ false: '#cbd5e1', true: '#0284c7' }}
              />
            </View>

            <TouchableOpacity
              onPress={() => {
                Alert.alert('PIN Updated', 'Your security PIN settings have been refreshed.');
                setActiveModal(null);
              }}
              className="mt-4 bg-slate-100 py-3.5 rounded-2xl items-center"
            >
              <Text style={{ fontSize: getFontSize(14) }} className="text-slate-800 font-bold">
                {t?.changePin || 'Change Security PIN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}