import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import AuthField from '../../components/AuthField';
import GoogleButton from '../../components/GoogleButton';

export default function LoginScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { loginWithToken } = useContext(AuthContext);

  const role = route?.params?.role || 'patient';
  const resetDone = !!route?.params?.resetDone;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    const loginId = identifier.trim();
    if (!loginId || !password) {
      setError(t('fill_login', 'Please enter your login ID and password'));
      return;
    }

    setLoading(true);
    try {
      // Backend: POST /auth/login { identifier, password } -> { data: { token, user } }
      const res = await api.post('/auth/login', { identifier: loginId, password });

      if (res.data?.success) {
        const { token, user } = res.data.data;
        // No OTP at login. AppNavigator switches to the dashboard automatically
        await loginWithToken(token, user);
      }
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
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        <Text className="text-base font-bold text-slate-800">{t('login_title', 'Login')}</Text>

        {/* Staff Login Link in top right corner */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('StaffLogin')}
          className="flex-row items-center bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
        >
          <Ionicons name="shield-checkmark-outline" size={14} color="#2563EB" />
          <Text className="text-xs font-semibold text-blue-600 ml-1">Staff</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24 }}
      >
        {/* Password reset success notice */}
        {resetDone && (
          <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-5">
            <Text className="text-xs text-emerald-800">
              {t('reset_done', 'Password updated. Please log in.')}
            </Text>
          </View>
        )}

        {/* Banner */}
        <View className="flex-row items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="w-12 h-12 bg-blue-50 rounded-xl justify-center items-center mr-4">
            <Ionicons name="log-in-outline" size={24} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900">
              {t('welcome_back', 'Welcome Back')}
            </Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              {t('login_sub', 'Enter your credentials to access your account.')}
            </Text>
          </View>
        </View>

        {/* Inputs */}
        <View className="gap-4">
          <AuthField
            label={t('login_identifier', 'Email / NIC / Phone')}
            icon="person-outline"
            placeholder={t('login_identifier_ph', 'Enter your email, NIC or phone number')}
            autoCapitalize="none"
            autoCorrect={false}
            value={identifier}
            onChangeText={setIdentifier}
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

        {/* Forgot password */}
        <View className="items-end mt-3">
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { role })}>
            <Text className="text-xs font-semibold text-blue-600">
              {t('forgot_password', 'Forgot password?')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline error */}
        {!!error && (
          <View className="bg-red-50 border border-red-100 rounded-xl p-3 mt-5">
            <Text className="text-xs text-red-700">{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogin}
          disabled={loading}
          className="bg-[#0052CC] py-3.5 rounded-xl flex-row items-center justify-center shadow-sm mt-6"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white font-bold text-base mr-2">{t('log_in', 'Log In')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Continue with Google (no OTP) */}
        <GoogleButton role={role} onError={setError} />

        {/* Footer */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-sm text-slate-500">{t('no_account', "Don't have an account?")} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register', { role })}>
            <Text className="text-sm font-semibold text-blue-600">
              {t('register_here', 'Register Here')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}