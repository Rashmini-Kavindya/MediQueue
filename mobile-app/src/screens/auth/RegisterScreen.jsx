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
import GoogleButton from '../../components/GoogleButton';

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ route, navigation }) {
  const { t } = useTranslation();

  const role = route?.params?.role || 'patient';
  const isCaregiver = role === 'caregiver';
  const titleText = isCaregiver
    ? t('register_caregiver_title', 'Caregiver Registration')
    : t('register_patient_title', 'Patient Registration');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nicOrPatientId, setNicOrPatientId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !nicOrPatientId.trim() ||
      !phone.trim() ||
      !password
    ) {
      setError(t('fill_required', 'Please fill in all required fields'));
      return;
    }
    // Email is optional, but if it is entered it must be valid
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      setError(t('invalid_email', 'Please enter a valid email address'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('password_min', 'Password must be at least 6 characters'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwords_dont_match', 'Passwords do not match'));
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const cleanEmail = email.trim().toLowerCase();

    setLoading(true);
    try {
      // Backend: 201 (new) or 200 (earlier unverified account refreshed)
      const regRes = await api.post('/auth/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nicOrPatientId: nicOrPatientId.trim(),
        phone: cleanPhone,
        ...(cleanEmail ? { email: cleanEmail } : {}),
        password,
        role,
      });

      if (regRes.data?.success) {
        // One-time verification: the code is sent by SMS to the phone number
        const otpRes = await api.post('/auth/send-otp', {
          phone: cleanPhone,
          channel: 'sms',
        });

        navigation.navigate('Otp', {
          phone: cleanPhone,
          otpSent: true,
          sentTo: otpRes.data?.sentTo,
          role,
        });
      }
    } catch (err) {
      console.log('Register Error:', err.response?.data || err.message);
      setError(err.response?.data?.message || t('something_wrong', 'Something went wrong'));
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
        <Text className="text-base font-bold text-slate-800">{titleText}</Text>
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
            <Ionicons name="clipboard-outline" size={24} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900">{titleText}</Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              {t('enter_details', 'Please enter your details to continue.')}
            </Text>
          </View>
        </View>

        {/* Input Fields */}
        <View className="gap-4">
          <AuthField
            label={t('first_name', 'First name')}
            icon="person-outline"
            placeholder={t('first_name_ph', 'Enter your first name')}
            value={firstName}
            onChangeText={setFirstName}
          />
          <AuthField
            label={t('last_name', 'Last name')}
            icon="person-outline"
            placeholder={t('last_name_ph', 'Enter your last name')}
            value={lastName}
            onChangeText={setLastName}
          />
          <AuthField
            label={t('nic_or_id', 'NIC / Patient ID')}
            icon="card-outline"
            placeholder={t('nic_or_id_ph', 'Enter your NIC or patient ID')}
            autoCapitalize="characters"
            value={nicOrPatientId}
            onChangeText={setNicOrPatientId}
          />
          <AuthField
            label={t('phone_number', 'Phone number')}
            hint={t('phone_hint_otp', 'We will send your verification code to this number by SMS')}
            icon="call-outline"
            placeholder={t('phone_ph', 'Enter your phone number')}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <AuthField
            label={t('email_optional', 'Email address (optional)')}
            hint={t('email_hint_optional', 'You can use this to reset your password by email')}
            icon="mail-outline"
            placeholder="name@example.com"
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
          <AuthField
            label={t('confirm_password', 'Confirm password')}
            icon="lock-closed-outline"
            placeholder={t('confirm_password_ph', 'Re-enter your password')}
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        {/* Info Banner */}
        <View className="flex-row items-center bg-blue-50/80 p-3.5 rounded-xl border border-blue-100 my-6">
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          <Text className="text-xs text-blue-800 ml-2.5 flex-1 leading-4">
            {t('sms_info', 'We will send you queue updates via SMS to this number.')}
          </Text>
        </View>

        {/* Inline error */}
        {!!error && (
          <View className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
            <Text className="text-xs text-red-700">{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleRegister}
          disabled={loading}
          className="bg-[#0052CC] py-3.5 rounded-xl flex-row items-center justify-center shadow-sm"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white font-bold text-base mr-2">{t('continue', 'Continue')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Continue with Google (no OTP) */}
        <GoogleButton role={role} onError={setError} />

        {/* Footer */}
        <View className="flex-row justify-center mt-4 mb-6">
          <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
            <Text className="text-sm font-semibold text-blue-600">
              {t('already_registered', 'Already registered?')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}