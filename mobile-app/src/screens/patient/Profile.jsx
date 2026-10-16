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
import AppHeader from '../../components/AppHeader'; // Reusable Header එක import කිරීම

// iOS system colors - blue as accent, soft grouped background + white cards
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.12)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.08)',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  chevron: '#C7C7CC',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
  separator: '#E9E9EE',
  groupedBg: '#F4F5F9',
  white: '#FFFFFF',
};

// iOS style soft shadow for cards
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

// Bottom sheet pieces shared by all modals
const sheetOverlay = { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' };
const sheetBody = { backgroundColor: IOS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 34 };
const sheetHandle = { width: 38, height: 5, borderRadius: 3, backgroundColor: '#D1D1D6', alignSelf: 'center', marginBottom: 14 };

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

  // Personal information (VIEW ONLY) - values come from the /users/me response
  const formatDate = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? 'N/A'
      : d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? 'N/A'
      : `${d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  const languageLabelMap = { en: 'English', si: 'Sinhala', ta: 'Tamil' };

  const patientId = profileData?.patientId || user?.patientId || 'N/A';
  const accountStatusRaw = profileData?.status || 'active';
  const accountStatus = accountStatusRaw.charAt(0).toUpperCase() + accountStatusRaw.slice(1);
  const preferredLanguage = languageLabelMap[profileData?.language] || selectedLanguage || 'N/A';

  const infoRows = [
    { key: 'patientId', icon: 'hash', label: 'Patient ID', value: patientId },
    { key: 'nic', icon: 'credit-card', label: 'NIC', value: patientNic },
    { key: 'phone', icon: 'phone', label: 'Phone', value: patientPhone },
    { key: 'email', icon: 'mail', label: 'Email', value: patientEmail },
    { key: 'language', icon: 'globe', label: 'Preferred language', value: preferredLanguage },
    { key: 'status', icon: 'activity', label: 'Account status', value: accountStatus, isStatus: true },
    { key: 'since', icon: 'calendar', label: 'Member since', value: formatDate(profileData?.createdAt) },
    { key: 'lastLogin', icon: 'clock', label: 'Last login', value: formatDateTime(profileData?.lastLoginAt) },
  ];

  // Reusable bottom sheet header (title + close)
  const renderSheetHeader = (title) => (
    <>
      <View style={sheetHandle} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: getFontSize(20), color: IOS.label, fontWeight: '700' }}>
          {title}
        </Text>
        <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={26} color={IOS.chevron} />
        </TouchableOpacity>
      </View>
    </>
  );

  // Reusable option row for language / text size sheets
  const renderOptionStyle = (selected) => ({
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: selected ? IOS.blueSoft : IOS.surface,
  });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: IOS.groupedBg }}>
      {/* Reusable AppHeader එක මෙතැනට ඇතුළත් කර ඇත */}
      <AppHeader
        userName={patientName}
        onNotificationPress={() => navigation?.navigate('Alerts')}
        onPrescriptionPress={() => {
          console.log('Prescription icon pressed');
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={IOS.tertiaryLabel} colors={[IOS.blue]} />}
      >

        {loading ? (
          <View style={{ paddingVertical: 80, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={IOS.tertiaryLabel} />
          </View>
        ) : (
          <>
            {/* Title + NIC badge */}
            <View style={{ paddingHorizontal: 20, marginTop: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: getFontSize(28), color: IOS.label, fontWeight: '700', letterSpacing: 0.3 }}>
                  {t?.patientProfile || 'Patient Profile'}
                </Text>
                <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, marginTop: 2 }}>
                  {t?.profileSubtitle || 'Manage your account settings'}
                </Text>
              </View>

              {isNicVerified && (
                <View style={{ backgroundColor: IOS.greenSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <Octicons name="verified" size={13} color={IOS.green} />
                  <Text style={{ fontSize: getFontSize(11), color: IOS.secondaryLabel, fontWeight: '600', marginLeft: 6 }}>
                    NIC: {patientNic}
                  </Text>
                </View>
              )}
            </View>

            {/* Profile Info Card */}
            <View style={[{ backgroundColor: IOS.white, borderRadius: 24, marginHorizontal: 20, marginTop: 12, paddingVertical: 24, paddingHorizontal: 18, alignItems: 'center' }, cardShadow]}>
              <View style={{ marginBottom: 14 }}>
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: IOS.fill }}
                />
                <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: IOS.blue, borderRadius: 999, padding: 4, borderWidth: 2, borderColor: '#fff' }}>
                  <MaterialCommunityIcons name="check-decagram" size={14} color="#ffffff" />
                </View>
              </View>

              <Text style={{ fontSize: getFontSize(24), color: IOS.label, fontWeight: '700', textAlign: 'center' }}>
                {patientName}
              </Text>
              <Text style={{ fontSize: getFontSize(14), color: IOS.tertiaryLabel, marginTop: 4, textAlign: 'center' }}>
                {patientPhone} {patientEmail !== 'N/A' ? `• ${patientEmail}` : ''}
              </Text>

              <View style={{ marginTop: 14, backgroundColor: IOS.fill, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="medical-bag" size={16} color={IOS.secondaryLabel} />
                <Text style={{ fontSize: getFontSize(12), color: IOS.secondaryLabel, fontWeight: '600', marginLeft: 8 }}>
                  {roleDisplay} ACCOUNT
                </Text>
              </View>
            </View>

            {/* Personal Information Section (VIEW ONLY - no edit actions) */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: getFontSize(19), color: IOS.label, fontWeight: '700', letterSpacing: 0.3 }}>
                  Personal Information
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="lock" size={12} color={IOS.tertiaryLabel} />
                  <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, fontWeight: '500', marginLeft: 4 }}>
                    Read only
                  </Text>
                </View>
              </View>

              <View style={[{ backgroundColor: IOS.white, borderRadius: 22, overflow: 'hidden' }, cardShadow]}>
                {infoRows.map((row, index) => (
                  <View
                    key={row.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth: index === infoRows.length - 1 ? 0 : 1,
                      borderBottomColor: IOS.separator,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: IOS.fill, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Feather name={row.icon} size={16} color={IOS.secondaryLabel} />
                      </View>
                      <Text style={{ fontSize: getFontSize(15), color: IOS.secondaryLabel, fontWeight: '500' }}>
                        {row.label}
                      </Text>
                    </View>

                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {row.isStatus && (
                        <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: accountStatusRaw === 'active' ? IOS.green : '#FF9500' }} />
                      )}
                      <Text
                        selectable
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ flexShrink: 1, fontSize: getFontSize(15), color: IOS.label, fontWeight: '500', textAlign: 'right' }}
                      >
                        {row.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 10, paddingHorizontal: 6, lineHeight: 17 }}>
                These details are managed by the hospital and can't be edited here.
              </Text>
            </View>

            {/* App Settings Section */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: getFontSize(19), color: IOS.label, fontWeight: '700', letterSpacing: 0.3 }}>
                  {t?.appSettings || 'App Settings'}
                </Text>
                <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, fontWeight: '500' }}>
                  {t?.general || 'General'}
                </Text>
              </View>

              <View style={[{ backgroundColor: IOS.white, borderRadius: 22, overflow: 'hidden' }, cardShadow]}>
                {/* Language Trigger */}
                <TouchableOpacity 
                  onPress={() => setActiveModal('language')}
                  activeOpacity={0.6}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: IOS.separator }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: IOS.blue, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                      <Feather name="globe" size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '500' }}>
                        {t?.language || 'Language'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                        {t?.languageSubtitle || 'Change application language'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {savingLanguage ? (
                      <ActivityIndicator size="small" color={IOS.tertiaryLabel} style={{ marginRight: 8 }} />
                    ) : (
                      <Text style={{ fontSize: getFontSize(14), color: IOS.tertiaryLabel, marginRight: 4 }}>
                        {selectedLanguage}
                      </Text>
                    )}
                    <Feather name="chevron-right" size={18} color={IOS.chevron} />
                  </View>
                </TouchableOpacity>

                {/* Notifications Trigger */}
                <TouchableOpacity 
                  onPress={() => setActiveModal('notifications')}
                  activeOpacity={0.6}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: IOS.separator }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FF9500', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                      <Ionicons name="notifications" size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '500' }}>
                        {t?.notifications || 'Notifications'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                        {t?.notificationsSubtitle || 'Manage alerts and updates'}
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={IOS.chevron} />
                </TouchableOpacity>

                {/* Accessibility Trigger */}
                <TouchableOpacity 
                  onPress={() => setActiveModal('accessibility')}
                  activeOpacity={0.6}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: IOS.separator }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#5856D6', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                      <MaterialCommunityIcons name="format-size" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '500' }}>
                        {t?.accessibility || 'Text Size'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                        {t?.accessibilitySubtitle || 'Adjust font sizes'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: getFontSize(14), color: IOS.tertiaryLabel, marginRight: 4 }}>
                      {textSize}
                    </Text>
                    <Feather name="chevron-right" size={18} color={IOS.chevron} />
                  </View>
                </TouchableOpacity>

                {/* Privacy Trigger */}
                <TouchableOpacity 
                  onPress={() => setActiveModal('privacy')}
                  activeOpacity={0.6}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: IOS.green, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                      <Feather name="lock" size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '500' }}>
                        {t?.privacy || 'Privacy & Security'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                        {t?.privacySubtitle || 'Biometrics and PIN'}
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={IOS.chevron} />
                </TouchableOpacity>
              </View>

              {/* Logout Button */}
              <TouchableOpacity
                onPress={logout}
                activeOpacity={0.7}
                style={[{ marginTop: 24, backgroundColor: IOS.white, paddingVertical: 16, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, cardShadow]}
              >
                <Feather name="log-out" size={17} color={IOS.red} />
                <Text style={{ fontSize: getFontSize(16), color: IOS.red, fontWeight: '600', marginLeft: 8 }}>
                  {t?.logOut || 'Log Out'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={activeModal === 'language'} transparent animationType="slide">
        <View style={sheetOverlay}>
          <View style={sheetBody}>
            {renderSheetHeader(t?.selectLanguage || 'Select Language')}

            {['English', 'Sinhala', 'Tamil'].map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => handleLanguageChange(lang)}
                activeOpacity={0.7}
                style={renderOptionStyle(selectedLanguage === lang)}
              >
                <Text style={{ fontSize: getFontSize(16), fontWeight: selectedLanguage === lang ? '600' : '500', color: selectedLanguage === lang ? IOS.blue : IOS.label }}>
                  {lang}
                </Text>
                {selectedLanguage === lang && <Feather name="check" size={19} color={IOS.blue} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Text Size Modal */}
      <Modal visible={activeModal === 'accessibility'} transparent animationType="slide">
        <View style={sheetOverlay}>
          <View style={sheetBody}>
            {renderSheetHeader(t?.textSizeDisplay || 'Text Size')}

            {[
              { label: t?.smallText || 'Small', value: 'Small' },
              { label: t?.mediumText || 'Medium', value: 'Medium' },
              { label: t?.largeText || 'Large', value: 'Large' },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => handleTextSizeChange(item.value)}
                activeOpacity={0.7}
                style={renderOptionStyle(textSize === item.value)}
              >
                <Text style={{ fontSize: getFontSize(16), fontWeight: textSize === item.value ? '600' : '500', color: textSize === item.value ? IOS.blue : IOS.label }}>
                  {item.label}
                </Text>
                {textSize === item.value && <Feather name="check" size={19} color={IOS.blue} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={activeModal === 'notifications'} transparent animationType="slide">
        <View style={sheetOverlay}>
          <View style={sheetBody}>
            {renderSheetHeader(t?.notifications || 'Notifications')}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, backgroundColor: IOS.surface, borderRadius: 16, paddingHorizontal: 16 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '500' }}>
                  {t?.queueAlerts || 'Queue Alerts'}
                </Text>
                <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                  {t?.queueAlertsSubtitle || 'Get notified when your turn is near'}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E5E5EA', true: IOS.green }}
              />
            </View>

            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              activeOpacity={0.85}
              style={{ marginTop: 20, backgroundColor: IOS.blue, paddingVertical: 15, borderRadius: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: getFontSize(16), color: '#fff', fontWeight: '600' }}>
                {t?.savePreferences || 'Save Preferences'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={activeModal === 'privacy'} transparent animationType="slide">
        <View style={sheetOverlay}>
          <View style={sheetBody}>
            {renderSheetHeader(t?.privacy || 'Privacy & Security')}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, backgroundColor: IOS.surface, borderRadius: 16, paddingHorizontal: 16 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '500' }}>
                  {t?.biometricUnlock || 'Biometric Unlock'}
                </Text>
                <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                  {t?.biometricSubtitle || 'Use Fingerprint / Face ID to unlock'}
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={setBiometricsEnabled}
                trackColor={{ false: '#E5E5EA', true: IOS.green }}
              />
            </View>

            <TouchableOpacity
              onPress={() => {
                Alert.alert('PIN Updated', 'Your security PIN settings have been refreshed.');
                setActiveModal(null);
              }}
              activeOpacity={0.7}
              style={{ marginTop: 14, backgroundColor: IOS.fill, paddingVertical: 15, borderRadius: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: getFontSize(16), color: IOS.blue, fontWeight: '600' }}>
                {t?.changePin || 'Change Security PIN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}