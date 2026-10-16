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
// Loose phone check (display only): optional +, 9-15 digits after removing spaces/dashes
const PHONE_REGEX = /^\+?\d{9,15}$/;

const COLORS = {
  error: '#DC2626',
  valid: '#16A34A',
  primary: '#0052CC',
  weak: '#EF4444',
  fair: '#F59E0B',
  strong: '#16A34A',
  track: '#E2E8F0',
};

const softShadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 3,
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

  // UI only: which fields the user has started typing in
  const [touched, setTouched] = useState({});

  const markTouched = (key) =>
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  const onChangeFirstName = (v) => { setFirstName(v); markTouched('firstName'); };
  const onChangeLastName = (v) => { setLastName(v); markTouched('lastName'); };
  const onChangeNic = (v) => { setNicOrPatientId(v); markTouched('nic'); };
  const onChangePhone = (v) => { setPhone(v); markTouched('phone'); };
  const onChangeEmail = (v) => { setEmail(v); markTouched('email'); };
  const onChangePassword = (v) => { setPassword(v); markTouched('password'); };
  const onChangeConfirm = (v) => { setConfirmPassword(v); markTouched('confirm'); };

  /* ---------------- Live validation (derived, display only) ---------------- */

  // After a failed submit, `error` is set -> show "required" on empty fields too
  const submitAttempted = !!error;

  const requiredMsg = t('field_required', 'This field is required');

  const validateRequiredText = (value, key) => {
    if (!value.trim()) {
      return touched[key] || submitAttempted
        ? { status: 'error', message: requiredMsg }
        : { status: 'idle' };
    }
    return { status: 'valid', message: t('looks_good', 'Looks good') };
  };

  const firstNameState = validateRequiredText(firstName, 'firstName');
  const lastNameState = validateRequiredText(lastName, 'lastName');
  const nicState = validateRequiredText(nicOrPatientId, 'nic');

  const cleanPhoneLive = phone.replace(/[\s-]/g, '');
  let phoneState = { status: 'idle' };
  if (!phone.trim()) {
    if (touched.phone || submitAttempted) {
      phoneState = { status: 'error', message: requiredMsg };
    }
  } else if (!PHONE_REGEX.test(cleanPhoneLive)) {
    phoneState = {
      status: 'error',
      message: t('invalid_phone', 'Enter a valid phone number (digits only)'),
    };
  } else {
    phoneState = { status: 'valid', message: t('looks_good', 'Looks good') };
  }

  // Email is optional
  let emailState = { status: 'idle' };
  if (email.trim()) {
    emailState = EMAIL_REGEX.test(email.trim())
      ? { status: 'valid', message: t('looks_good', 'Looks good') }
      : {
          status: 'error',
          message: t('invalid_email', 'Please enter a valid email address'),
        };
  }

  let passwordState = { status: 'idle' };
  if (!password) {
    if (touched.password || submitAttempted) {
      passwordState = { status: 'error', message: requiredMsg };
    }
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    passwordState = {
      status: 'error',
      message: t('password_min', 'Password must be at least 6 characters'),
    };
  } else {
    passwordState = { status: 'valid', message: t('looks_good', 'Looks good') };
  }

  let confirmState = { status: 'idle' };
  if (!confirmPassword) {
    if (touched.confirm || submitAttempted) {
      confirmState = { status: 'error', message: requiredMsg };
    }
  } else if (confirmPassword !== password) {
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

  /* ---------------- Progress (required fields only) ---------------- */

  const requiredStates = [
    firstNameState,
    lastNameState,
    nicState,
    phoneState,
    passwordState,
    confirmState,
  ];
  const totalSteps = requiredStates.length;
  const doneSteps = requiredStates.filter((s) => s.status === 'valid').length;
  const progressPct = Math.round((doneSteps / totalSteps) * 100);
  const isComplete = doneSteps === totalSteps && emailState.status !== 'error';
  const progressColor = isComplete ? COLORS.valid : COLORS.primary;

  /* ---------------- Submit (logic unchanged) ---------------- */

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
    // className is not used on SafeAreaView (third-party component) -> style instead
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-[#F2F2F7]">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-white items-center justify-center"
          style={softShadow}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-semibold text-slate-900">{titleText}</Text>
        <View className="w-10" />
      </View>

      {/* Progress (stays visible while scrolling) */}
      <View className="px-5 pb-3 bg-[#F2F2F7]">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-semibold text-slate-500">
            {t('form_progress', 'Form progress')}
          </Text>
          <Text className="text-xs font-bold" style={{ color: progressColor }}>
            {doneSteps}/{totalSteps} · {progressPct}%
          </Text>
        </View>
        <View
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: COLORS.track }}
        >
          <View
            style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: 999,
              backgroundColor: progressColor,
            }}
          />
        </View>
        {isComplete && (
          <View className="flex-row items-center mt-2">
            <Ionicons name="checkmark-circle" size={14} color={COLORS.valid} />
            <Text className="text-xs ml-1.5" style={{ color: COLORS.valid }}>
              {t('ready_to_continue', 'All set! You can continue now.')}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      >
        {/* Banner */}
        <View
          className="flex-row items-center bg-white p-4 rounded-[20px] mb-6"
          style={softShadow}
        >
          <View className="w-12 h-12 bg-[#E8F0FE] rounded-[16px] justify-center items-center mr-4">
            <Ionicons name="clipboard-outline" size={24} color="#0052cc" />
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
          <View>
            <AuthField
              label={t('first_name', 'First name')}
              icon="person-outline"
              placeholder={t('first_name_ph', 'Enter your first name')}
              value={firstName}
              onChangeText={onChangeFirstName}
            />
            <FieldFeedback status={firstNameState.status} message={firstNameState.message} />
          </View>

          <View>
            <AuthField
              label={t('last_name', 'Last name')}
              icon="person-outline"
              placeholder={t('last_name_ph', 'Enter your last name')}
              value={lastName}
              onChangeText={onChangeLastName}
            />
            <FieldFeedback status={lastNameState.status} message={lastNameState.message} />
          </View>

          <View>
            <AuthField
              label={t('nic_or_id', 'NIC / Patient ID')}
              icon="card-outline"
              placeholder={t('nic_or_id_ph', 'Enter your NIC or patient ID')}
              autoCapitalize="characters"
              value={nicOrPatientId}
              onChangeText={onChangeNic}
            />
            <FieldFeedback status={nicState.status} message={nicState.message} />
          </View>

          <View>
            <AuthField
              label={t('phone_number', 'Phone number')}
              hint={t('phone_hint_otp', 'We will send your verification code to this number by SMS')}
              icon="call-outline"
              placeholder={t('phone_ph', 'Enter your phone number')}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={onChangePhone}
            />
            <FieldFeedback status={phoneState.status} message={phoneState.message} />
          </View>

          <View>
            <AuthField
              label={t('email_optional', 'Email address (optional)')}
              hint={t('email_hint_optional', 'You can use this to reset your password by email')}
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

          <View>
            <AuthField
              label={t('password', 'Password')}
              icon="lock-closed-outline"
              placeholder={t('password_ph', 'Enter your password')}
              isPassword
              value={password}
              onChangeText={onChangePassword}
            />
            <PasswordStrength password={password} t={t} />
            <FieldFeedback status={passwordState.status} message={passwordState.message} />
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
        </View>

        {/* Info Banner */}
        <View className="flex-row items-center bg-[#E8F0FE] p-3.5 rounded-2xl my-6">
          <Ionicons name="information-circle-outline" size={20} color="#0052cc" />
          <Text className="text-xs text-blue-900 ml-2.5 flex-1 leading-4">
            {t('sms_info', 'We will send you queue updates via SMS to this number.')}
          </Text>
        </View>

        {/* Inline error */}
        {!!error && (
          <View className="bg-red-50 border border-red-100 rounded-2xl p-3.5 mb-4">
            <Text className="text-xs text-red-700">{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleRegister}
          disabled={loading}
          className="bg-[#0052CC] h-[54px] rounded-[16px] flex-row items-center justify-center"
          style={{
            opacity: loading ? 0.7 : 1,
            shadowColor: '#0052cc',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white font-semibold text-base mr-2">{t('continue', 'Continue')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Continue with Google (no OTP) */}
        <GoogleButton role={role} onError={setError} />

        {/* Footer */}
        <View className="flex-row justify-center mt-4 mb-6">
          <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
            <Text className="text-sm font-semibold text-[#0052cc]">
              {t('already_registered', 'Already registered?')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}