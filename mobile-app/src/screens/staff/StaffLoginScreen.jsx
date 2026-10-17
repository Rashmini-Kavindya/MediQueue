import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import AuthField from '../../components/AuthField';

// Roles allowed to use this portal.
// After login, AppNavigator redirects by role:
//   admin          -> AdminNavigator (admin dashboard)
//   staff / doctor -> StaffNavigator (staff dashboard)
const STAFF_ROLES = ['staff', 'doctor', 'admin'];
const REMEMBER_KEY = 'staffRememberedEmail';

export default function StaffLoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { loginWithToken } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberStation, setRememberStation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prefill the email if "Remember Station" was ticked last time
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REMEMBER_KEY);
        if (saved) {
          setEmail(saved);
          setRememberStation(true);
        }
      } catch (e) {
        console.log('Failed to load remembered email:', e);
      }
    })();
  }, []);

  const handleStaffLogin = async () => {
    setError('');

    const loginId = email.trim().toLowerCase();
    if (!loginId || !password) {
      setError(t('staff_fill', 'Please enter your email and password.'));
      return;
    }

    setLoading(true);
    try {
      // Backend: POST /auth/login { identifier, password } -> { data: { token, user } }
      const res = await api.post('/auth/login', { identifier: loginId, password });

      if (!res.data?.success) {
        setError(res.data?.message || t('invalid_credentials', 'Invalid credentials'));
        return;
      }

      const { token, user } = res.data.data;
      const role = user?.role;

      // Patients / caregivers must not enter the staff portal
      if (!STAFF_ROLES.includes(role)) {
        setError(t('staff_only', 'Access denied: this portal is only for hospital staff.'));
        return;
      }

      try {
        if (rememberStation) {
          await AsyncStorage.setItem(REMEMBER_KEY, loginId);
        } else {
          await AsyncStorage.removeItem(REMEMBER_KEY);
        }
      } catch (e) {
        console.log('Failed to save remembered email:', e);
      }

      // Saves token + user in AuthContext. AppNavigator then switches by role:
      // staff/doctor -> StaffNavigator, admin -> AdminNavigator.
      await loginWithToken(token, user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t('invalid_credentials', 'Invalid credentials')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Back */}
      <View className="px-5 pt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-1 self-start"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }}
      >
        {/* Logo + title */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-blue-50 rounded-2xl items-center justify-center mb-4">
            <Ionicons name="add" size={48} color="#2563EB" />
          </View>
          <Text className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('staff_login_title', 'Staff Log In')}
          </Text>
          <Text className="text-[11px] font-semibold text-slate-400 tracking-wider mt-1 uppercase">
            {t('staff_login_sub', 'Manage OPD Queue & Clinical Access')}
          </Text>
        </View>

        {/* Inputs */}
        <View className="gap-4">
          <AuthField
            label={t('email_address', 'Email address')}
            icon="mail-outline"
            placeholder="email@hospital.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <AuthField
            label={t('password', 'Password')}
            icon="lock-closed-outline"
            placeholder={t('password_ph', 'Enter your password')}
            isPassword
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Remember station + Forgot password */}
        <View className="flex-row items-center justify-between mt-5">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setRememberStation((v) => !v)}
            activeOpacity={0.7}
          >
            <View
              className={`w-5 h-5 rounded border items-center justify-center mr-2 ${
                rememberStation ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
              }`}
            >
              {rememberStation && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text className="text-[11px] font-bold text-slate-600 uppercase">
              {t('remember_station', 'Remember Station')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword', { role: 'staff' })}
          >
            <Text className="text-[11px] font-bold text-blue-600 uppercase">
              {t('forgot_password', 'Forgot password?')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline error */}
        {!!error && (
          <View className="bg-red-50 border border-red-100 rounded-xl p-3 mt-5">
            <Text className="text-xs text-red-700 text-center">{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleStaffLogin}
          disabled={loading}
          className="bg-[#0052CC] rounded-xl py-4 flex-row items-center justify-center mt-6 shadow-sm"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white font-bold text-sm uppercase mr-2 tracking-wide">
                {t('login_staff_portal', 'Login to Staff Portal')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}