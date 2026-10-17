import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const RESEND_SECONDS = 45;
const EMPTY_OTP = ['', '', '', '', '', ''];

export default function OtpScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { loginWithToken } = useContext(AuthContext);
  const { phone, email, debugOtp, otpSent, sentTo: sentToParam, role } = route.params || {};

  const [otp, setOtp] = useState(EMPTY_OTP);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState(debugOtp || '');
  const [sentTo, setSentTo] = useState(sentToParam || '');
  const inputRefs = useRef([]);
  const initialRequestDone = useRef(false);
  const submitting = useRef(false);

  const isCaregiver = role === 'caregiver';
  const headerTitle = isCaregiver
    ? t('caregiver_verification', 'Caregiver Verification')
    : t('patient_verification', 'Patient Verification');

  const formatPhoneNumber = (num) => {
    if (!num) return '';
    if (num.length >= 10) {
      return `${num.slice(0, 3)} ${num.slice(3, 5)} •••• ${num.slice(-3)}`;
    }
    return num;
  };

  const maskEmail = (mail) => {
    if (!mail || !mail.includes('@')) return '';
    const [name, domain] = mail.split('@');
    return `${name[0]}***@${domain}`;
  };

  const destination = sentTo || maskEmail(email) || formatPhoneNumber(phone);

  const requestOtp = async () => {
    const res = await api.post('/auth/send-otp', { email, phone });
    setDevCode(res.data?.debugOtp || '');
    if (res.data?.sentTo) setSentTo(res.data.sentTo);
  };

  useEffect(() => {
    if (initialRequestDone.current) return;
    initialRequestDone.current = true;

    if (otpSent || debugOtp) return;

    if (!phone && !email) {
      setError(t('contact_missing', 'Phone number or email is missing.'));
      return;
    }

    (async () => {
      try {
        await requestOtp();
      } catch (err) {
        setError(
          err.response?.data?.message || t('resend_failed', 'Failed to send OTP code.')
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (timer <= 0) return undefined;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value, index) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (submitting.current) return;
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError(t('enter_valid_code', 'Please enter a valid 6-digit verification code.'));
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, phone, otp: otpCode });

      if (res.data?.success) {
        const { token, user } = res.data.data;

        // Exact match screen name 'SelectOpd'
        navigation.navigate('SelectOpd', {
          token,
          user,
          role
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || t('invalid_otp', 'Invalid OTP code'));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setError('');
    try {
      await requestOtp();
      setTimer(RESEND_SECONDS);
      setOtp(EMPTY_OTP);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || t('resend_failed', 'Failed to resend OTP code.'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-slate-800">{headerTitle}</Text>
        <View className="w-6" />
      </View>

      <View className="flex-1 px-6 pt-10 justify-start items-center">
        <View className="w-16 h-16 bg-blue-50 rounded-2xl justify-center items-center mb-6">
          <Ionicons name="shield-checkmark-outline" size={32} color="#2563EB" />
        </View>

        <Text className="text-2xl font-bold text-slate-900 text-center mb-2">
          {t('enter_code', 'Enter Verification Code')}
        </Text>
        <Text className="text-slate-500 text-sm text-center">
          {t('code_sent_to', 'We sent a 6-digit code to')}{' '}
          <Text className="font-bold text-slate-800">{destination}</Text>
        </Text>

        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-1 mb-6">
          <Text className="text-sm font-semibold text-blue-600">{t('change', 'Change')}</Text>
        </TouchableOpacity>

        {!!devCode && (
          <View className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 mb-5">
            <Text className="text-xs text-amber-800">
              {t('dev_code', 'Dev code')}: <Text className="font-bold">{devCode}</Text>
            </Text>
          </View>
        )}

        {/* OTP boxes */}
        <View className="flex-row justify-between w-full max-w-xs mb-5">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              className="w-11 h-12 bg-white rounded-xl text-center text-lg font-bold text-slate-800"
              style={{
                borderWidth: 1.5,
                borderColor: focusedIndex === index ? '#2563EB' : '#E2E8F0',
              }}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onFocus={() => setFocusedIndex(index)}
              onChangeText={(val) => handleOtpChange(val, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        {/* Inline error */}
        {!!error && (
          <View className="bg-red-50 border border-red-100 rounded-xl p-3 mb-5 w-full max-w-xs">
            <Text className="text-xs text-red-700 text-center">{error}</Text>
          </View>
        )}

        {/* Resend */}
        <View className="flex-row items-center mb-8">
          <Text className="text-xs text-slate-500">{t('didnt_receive', "Didn't receive code?")} </Text>
          {timer > 0 ? (
            <Text className="text-xs font-semibold text-slate-600">
              {t('resend_in', 'Resend in')}{' '}
              <Text className="text-blue-600 font-bold">00:{timer < 10 ? `0${timer}` : timer}</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text className="text-xs font-bold text-blue-600">{t('resend_code', 'Resend Code')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Verify */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleVerify}
          disabled={loading}
          className="w-full bg-[#0052CC] py-3.5 rounded-xl flex-row items-center justify-center shadow-sm"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white font-bold text-base mr-2">
                {t('verify_continue', 'Verify & Continue')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login', { role })} className="mt-6">
          <Text className="text-sm text-slate-500">
            {t('already_have_account', 'Already have an account?')}{' '}
            <Text className="font-bold text-blue-600">{t('back_to_login', 'Back to Login')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}