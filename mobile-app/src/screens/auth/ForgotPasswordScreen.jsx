import React, { useState } from 'react';
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
import AuthField from '../../components/AuthField';

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// +94771234567 / 94771234567 / 771234567 / 077 123 4567 -> 0771234567
// (backend stores phone numbers in the 07XXXXXXXX format)
const normalizePhone = (input) => {
  let p = String(input || '').replace(/[\s-]/g, '');
  if (p.startsWith('+94')) p = '0' + p.slice(3);
  else if (p.startsWith('94') && p.length === 11) p = '0' + p.slice(2);
  else if (/^7\d{8}$/.test(p)) p = '0' + p;
  return p;
};

// Step 1: choose phone or email, enter it -> code is sent there (SMS or email).
// Step 2: enter the code + new password.
export default function ForgotPasswordScreen({ navigation, route }) {
  const { t } = useTranslation();
  const role = route?.params?.role || 'patient';

  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('phone'); // 'phone' | 'email'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPhone = method === 'phone';
  const cleanPhone = normalizePhone(phone);
  const cleanEmail = email.trim().toLowerCase();

  const chooseMethod = (m) => {
    if (m === method) return;
    setMethod(m);
    setError('');
  };

  // Backend: POST /auth/send-otp { phone, channel: 'sms' } or { email, channel: 'email' }
  const handleSendCode = async () => {
    setError('');

    if (isPhone) {
      if (!cleanPhone) {
        setError(t('fill_required', 'Please fill in all required fields'));
        return;
      }
      if (!/^\d{9,15}$/.test(cleanPhone)) {
        setError(t('invalid_phone', 'Please enter a valid phone number'));
        return;
      }
    } else {
      if (!cleanEmail) {
        setError(t('fill_required', 'Please fill in all required fields'));
        return;
      }
      if (!EMAIL_REGEX.test(cleanEmail)) {
        setError(t('invalid_email', 'Please enter a valid email address'));
        return;
      }
    }

    setLoading(true);
    try {
      const payload = isPhone
        ? { phone: cleanPhone, channel: 'sms' }
        : { email: cleanEmail, channel: 'email' };

      const res = await api.post('/auth/send-otp', payload);

      if (res.data?.success) {
        setSentTo(res.data?.sentTo || '');
        setOtp('');
        setStep(2);
      } else {
        setError(res.data?.message || t('something_wrong', 'Something went wrong'));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t('something_wrong', 'Something went wrong')
      );
    } finally {
      setLoading(false);
    }
  };

  // Backend: POST /auth/reset-password { phone | email, otp, newPassword }
  const handleReset = async () => {
    setError('');

    const code = otp.trim();

    if (code.length < 6) {
      setError(t('enter_valid_code', 'Please enter a valid 6-digit verification code.'));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('password_min', 'Password must be at least 6 characters'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwords_dont_match', 'Passwords do not match'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        ...(isPhone ? { phone: cleanPhone } : { email: cleanEmail }),
        otp: code,
        newPassword,
      });

      if (res.data?.success) {
        navigation.replace('Login', { role, resetDone: true });
      } else {
        setError(res.data?.message || t('something_wrong', 'Something went wrong'));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t('something_wrong', 'Something went wrong')
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
        <Text className="text-base font-bold text-slate-800">
          {t('forgot_title', 'Reset Password')}
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24 }}
      >
        {/* Banner */}
        <View className="flex-row items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="w-12 h-12 bg-blue-50 rounded-xl justify-center items-center mr-4">
            <Ionicons name="key-outline" size={24} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900">
              {t('forgot_title', 'Reset Password')}
            </Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              {t(
                'forgot_sub',
                'Choose where you want to receive your verification code.'
              )}
            </Text>
          </View>
        </View>

        {step === 1 ? (
          <View className="gap-4">
            {/* Phone / Email choice */}
            <View className="flex-row bg-slate-100 rounded-xl p-1">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => chooseMethod('phone')}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
                  isPhone ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={isPhone ? '#2563EB' : '#64748B'}
                />
                <Text
                  className={`ml-2 text-sm font-semibold ${
                    isPhone ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  {t('by_phone', 'Phone number')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => chooseMethod('email')}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
                  !isPhone ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={!isPhone ? '#2563EB' : '#64748B'}
                />
                <Text
                  className={`ml-2 text-sm font-semibold ${
                    !isPhone ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  {t('by_email', 'Email')}
                </Text>
              </TouchableOpacity>
            </View>

            {isPhone ? (
              <AuthField
                label={t('phone_number', 'Phone number')}
                hint={t('code_by_sms', 'We will send the code by SMS')}
                icon="call-outline"
                placeholder={t('phone_ph', 'Enter your phone number')}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            ) : (
              <AuthField
                label={t('email_address', 'Email address')}
                hint={t('code_by_email', 'We will send the code to this email')}
                icon="mail-outline"
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            )}
          </View>
        ) : (
          <View className="gap-4">
            {/* Where the code was sent */}
            {!!sentTo && (
              <View className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                <Text className="text-xs text-emerald-800">
                  {t('code_sent_to', 'We sent a 6-digit code to')}{' '}
                  <Text className="font-bold">{sentTo}</Text>
                </Text>
              </View>
            )}

            <AuthField
              label={t('otp_label', 'Verification code')}
              icon="shield-checkmark-outline"
              placeholder={t('otp_ph', '6-digit code')}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, ''))}
            />
            <AuthField
              label={t('new_password', 'New password')}
              icon="lock-closed-outline"
              placeholder={t('new_password_ph', 'Enter new password')}
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <AuthField
              label={t('confirm_password', 'Confirm password')}
              icon="lock-closed-outline"
              placeholder={t('confirm_password_ph', 'Re-enter your password')}
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => {
                  setStep(1);
                  setOtp('');
                  setError('');
                }}
              >
                <Text className="text-xs font-semibold text-blue-600">
                  {isPhone
                    ? t('change_phone', 'Change phone number')
                    : t('change_email', 'Change email')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendCode} disabled={loading}>
                <Text className="text-xs font-semibold text-blue-600">
                  {t('resend_code', 'Resend Code')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Inline error */}
        {!!error && (
          <View className="bg-red-50 border border-red-100 rounded-xl p-3 mt-5">
            <Text className="text-xs text-red-700">{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={step === 1 ? handleSendCode : handleReset}
          disabled={loading}
          className="bg-[#0052CC] py-3.5 rounded-xl flex-row items-center justify-center shadow-sm mt-6"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white font-bold text-base mr-2">
                {step === 1
                  ? t('send_code', 'Send Code')
                  : t('reset_password_btn', 'Reset Password')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}