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

const COLORS = {
  error: '#DC2626',
  valid: '#16A34A',
  weak: '#EF4444',
  fair: '#F59E0B',
  strong: '#16A34A',
  track: '#E2E8F0',
};

// +94771234567 / 94771234567 / 771234567 / 077 123 4567 -> 0771234567
// (backend stores phone numbers in the 07XXXXXXXX format)
const normalizePhone = (input) => {
  let p = String(input || '').replace(/[\s-]/g, '');
  if (p.startsWith('+94')) p = '0' + p.slice(3);
  else if (p.startsWith('94') && p.length === 11) p = '0' + p.slice(2);
  else if (/^7\d{8}$/.test(p)) p = '0' + p;
  return p;
};

/* ------------------------------------------------------------------ */
/* Small UI helpers (no business logic)                                */
/* ------------------------------------------------------------------ */

// Message shown under a field: red error or green "looks good"
function FieldFeedback({ status, message }) {
  if (status !== 'error' && status !== 'valid') return null;

  const color = status === 'error' ? COLORS.error : COLORS.valid;
  const icon = status === 'error' ? 'alert-circle' : 'checkmark-circle';

  return (
    <View className="flex-row items-center mt-1.5 px-1">
      <Ionicons name={icon} size={14} color={color} />
      <Text className="text-xs ml-1.5 flex-1" style={{ color }}>
        {message}
      </Text>
    </View>
  );
}

// 3-segment password strength meter
function PasswordStrength({ password, t }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  let level = 1;
  let label = t('strength_weak', 'Weak');
  let color = COLORS.weak;
  if (password.length >= MIN_PASSWORD_LENGTH) {
    if (score >= 4) {
      level = 3;
      label = t('strength_strong', 'Strong');
      color = COLORS.strong;
    } else if (score >= 3) {
      level = 2;
      label = t('strength_fair', 'Fair');
      color = COLORS.fair;
    }
  }

  return (
    <View className="flex-row items-center mt-2 px-1">
      <View className="flex-row flex-1">
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            className="flex-1 h-1.5 rounded-full mr-1.5"
            style={{ backgroundColor: i <= level ? color : COLORS.track }}
          />
        ))}
      </View>
      <Text className="text-xs font-semibold ml-2" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */

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

  // UI only: which fields the user has started typing in
  const [touched, setTouched] = useState({});

  const markTouched = (key) =>
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  const onChangePhone = (v) => { setPhone(v); markTouched('phone'); };
  const onChangeEmail = (v) => { setEmail(v); markTouched('email'); };
  const onChangeOtp = (v) => { setOtp(v.replace(/\D/g, '')); markTouched('otp'); };
  const onChangeNewPassword = (v) => { setNewPassword(v); markTouched('newPassword'); };
  const onChangeConfirm = (v) => { setConfirmPassword(v); markTouched('confirm'); };

  const isPhone = method === 'phone';
  const cleanPhone = normalizePhone(phone);
  const cleanEmail = email.trim().toLowerCase();

  /* ---------------- Live validation (derived, display only) ---------------- */

  const submitAttempted = !!error;
  const requiredMsg = t('field_required', 'This field is required');

  let phoneState = { status: 'idle' };
  if (!phone.trim()) {
    if (touched.phone || submitAttempted) {
      phoneState = { status: 'error', message: requiredMsg };
    }
  } else if (!/^\d{9,15}$/.test(cleanPhone)) {
    phoneState = {
      status: 'error',
      message: t('invalid_phone', 'Please enter a valid phone number'),
    };
  } else {
    phoneState = { status: 'valid', message: t('looks_good', 'Looks good') };
  }

  let emailState = { status: 'idle' };
  if (!email.trim()) {
    if (touched.email || submitAttempted) {
      emailState = { status: 'error', message: requiredMsg };
    }
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    emailState = {
      status: 'error',
      message: t('invalid_email', 'Please enter a valid email address'),
    };
  } else {
    emailState = { status: 'valid', message: t('looks_good', 'Looks good') };
  }

  let otpState = { status: 'idle' };
  if (!otp) {
    if (touched.otp || submitAttempted) {
      otpState = { status: 'error', message: requiredMsg };
    }
  } else if (otp.length < 6) {
    otpState = {
      status: 'error',
      message: t('enter_valid_code', 'Please enter a valid 6-digit verification code.'),
    };
  } else {
    otpState = { status: 'valid', message: t('looks_good', 'Looks good') };
  }

  let newPasswordState = { status: 'idle' };
  if (!newPassword) {
    if (touched.newPassword || submitAttempted) {
      newPasswordState = { status: 'error', message: requiredMsg };
    }
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    newPasswordState = {
      status: 'error',
      message: t('password_min', 'Password must be at least 6 characters'),
    };
  } else {
    newPasswordState = { status: 'valid', message: t('looks_good', 'Looks good') };
  }

  let confirmState = { status: 'idle' };
  if (!confirmPassword) {
    if (touched.confirm || submitAttempted) {
      confirmState = { status: 'error', message: requiredMsg };
    }
  } else if (confirmPassword !== newPassword) {
    confirmState = {
      status: 'error',
      message: t('passwords_dont_match', 'Passwords do not match'),
    };
  } else {
    confirmState = {
      status: 'valid',
      message: t('passwords_match', 'Passwords match'),
    };
  }

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
              <View>
                <AuthField
                  label={t('phone_number', 'Phone number')}
                  hint={t('code_by_sms', 'We will send the code by SMS')}
                  icon="call-outline"
                  placeholder={t('phone_ph', 'Enter your phone number')}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={onChangePhone}
                />
                <FieldFeedback status={phoneState.status} message={phoneState.message} />
              </View>
            ) : (
              <View>
                <AuthField
                  label={t('email_address', 'Email address')}
                  hint={t('code_by_email', 'We will send the code to this email')}
                  icon="mail-outline"
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={onChangeEmail}
                />
                <FieldFeedback status={emailState.status} message={emailState.message} />
              </View>
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

            <View>
              <AuthField
                label={t('otp_label', 'Verification code')}
                icon="shield-checkmark-outline"
                placeholder={t('otp_ph', '6-digit code')}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={onChangeOtp}
              />
              <FieldFeedback status={otpState.status} message={otpState.message} />
            </View>

            <View>
              <AuthField
                label={t('new_password', 'New password')}
                icon="lock-closed-outline"
                placeholder={t('new_password_ph', 'Enter new password')}
                isPassword
                value={newPassword}
                onChangeText={onChangeNewPassword}
              />
              <PasswordStrength password={newPassword} t={t} />
              <FieldFeedback status={newPasswordState.status} message={newPasswordState.message} />
            </View>

            <View>
              <AuthField
                label={t('confirm_password', 'Confirm password')}
                icon="lock-closed-outline"
                placeholder={t('confirm_password_ph', 'Re-enter your password')}
                isPassword
                value={confirmPassword}
                onChangeText={onChangeConfirm}
              />
              <FieldFeedback status={confirmState.status} message={confirmState.message} />
            </View>

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