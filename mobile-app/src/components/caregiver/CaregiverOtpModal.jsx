import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatTime = (seconds) => {
  const n = Math.max(0, seconds);
  const minutes = Math.floor(n / 60);
  const remainder = n % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

/**
 * Caregiver-only consent popup. The backend, not this component,
 * decides whether a code is valid and whether a link becomes active.
 */
export default function CaregiverOtpModal({
  visible,
  verification,
  patientName,
  onVerify,
  onResend,
  onClose,
  onFinished
}) {
  const [otp, setOtp] = useState('');
  const [expiresIn, setExpiresIn] = useState(600);
  const [resendIn, setResendIn] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const verificationId = verification?.verificationId;

  useEffect(() => {
    if (!visible || !verificationId) return undefined;

    setOtp('');
    setError('');
    setSuccess(false);

    const expiresAt = Date.now() +
      (verification?.expiresInSeconds ?? 600) * 1000;
    const resendAt = Date.now() +
      (verification?.resendAfterSeconds ?? 60) * 1000;

    const update = () => {
      setExpiresIn(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
      setResendIn(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [visible, verificationId]);

  const handleVerify = async () => {
    if (busy || success) return;
    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the full six-digit verification code.');
      return;
    }
    if (expiresIn <= 0) {
      setError('This code has expired. Please request a new code.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      const response = await onVerify(otp);
      if (!response?.success) {
        setError(response?.message || 'Verification failed. Please try again.');
        return;
      }
      setSuccess(true);
      setOtp('');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Unable to verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (busy || resendIn > 0 || success) return;
    try {
      setBusy(true);
      setError('');
      await onResend();
      // Parent updates verificationId, resetting both countdowns.
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Unable to resend the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      onRequestClose={() => { if (!busy) onClose(); }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          {success ? (
            <>
              <View style={[styles.iconCircle, styles.successCircle]}>
                <Ionicons name="checkmark-circle" color="#059669" size={39} />
              </View>
              <Text style={styles.title}>Patient Linked Successfully!</Text>
              <Text style={styles.description}>
                {patientName} is now linked to your caregiver account.
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={onFinished}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Go to Caregiver Home</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" color="#155EEF" size={30} />
              </View>
              <Text style={styles.title}>Verify Patient Consent</Text>
              <Text style={styles.description}>
                A six-digit code was requested for {patientName}. Ask the
                patient to share it only if they approve this link.
              </Text>
              {!!verification?.maskedPhone && (
                <Text style={styles.phone}>SMS to {verification.maskedPhone}</Text>
              )}
              {verification?.appAlertCreated === false && (
                <Text style={styles.notice}>
                  Patient app alert could not be created. Check the SMS instead.
                </Text>
              )}
              <Text style={styles.fieldLabel}>VERIFICATION CODE</Text>
              <TextInput
                value={otp}
                onChangeText={(value) => {
                  setOtp(value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                maxLength={6}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                placeholder="• • • • • •"
                placeholderTextColor="#94A3B8"
                selectionColor="#155EEF"
                cursorColor="#155EEF"
                style={styles.otpInput}
                accessibilityLabel="Six digit patient consent code"
              />
              <Text style={styles.timer}>
                {expiresIn > 0
                  ? `Code expires in ${formatTime(expiresIn)}`
                  : 'This code has expired. Request a new code.'}
              </Text>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                style={[styles.primaryButton, (busy || otp.length !== 6 || expiresIn === 0) && styles.disabled]}
                disabled={busy || otp.length !== 6 || expiresIn === 0}
                onPress={handleVerify}
                accessibilityRole="button"
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={styles.primaryText}>Verify & Link Patient</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.resendButton}
                onPress={handleResend}
                disabled={busy || resendIn > 0}
                accessibilityRole="button"
              >
                <Text style={[styles.resendText, (busy || resendIn > 0) && styles.resendDisabled]}>
                  {resendIn > 0 ? `Resend code in ${formatTime(resendIn)}` : 'Resend Code'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.cancelButton}
                onPress={onClose}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.56)', padding: 18
  },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF',
    padding: 22, borderRadius: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 16, elevation: 10
  },
  iconCircle: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#EAF1FF', marginBottom: 12
  },
  successCircle: { backgroundColor: '#ECFDF5' },
  title: { color: '#111827', fontWeight: '800', fontSize: 19, textAlign: 'center' },
  description: {
    fontSize: 13, lineHeight: 20, color: '#64748B',
    textAlign: 'center', marginTop: 10
  },
  phone: { color: '#155EEF', fontWeight: '700', fontSize: 12, marginTop: 9 },
  notice: { color: '#92400E', fontSize: 12, marginTop: 10, textAlign: 'center' },
  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#475569',
    alignSelf: 'flex-start', marginTop: 22, marginBottom: 8
  },
  otpInput: {
    width: '100%', height: 58, borderWidth: 1.5,
    borderColor: '#155EEF', borderRadius: 12, backgroundColor: '#FFFFFF',
    color: '#111827', fontSize: 25, fontWeight: '700',
    letterSpacing: 9, textAlign: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})
  },
  timer: { marginTop: 12, color: '#64748B', fontSize: 12 },
  error: {
    marginTop: 10, fontSize: 12, color: '#DC2626',
    textAlign: 'center', lineHeight: 18
  },
  primaryButton: {
    width: '100%', height: 49, marginTop: 17,
    borderRadius: 11, backgroundColor: '#0757D8',
    justifyContent: 'center', alignItems: 'center'
  },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  disabled: { opacity: 0.5 },
  resendButton: { marginTop: 17, padding: 8 },
  resendText: { color: '#155EEF', fontWeight: '700', fontSize: 13 },
  resendDisabled: { color: '#94A3B8' },
  cancelButton: {
    width: '100%', padding: 12, marginTop: 5,
    borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 10, alignItems: 'center'
  },
  cancelText: { color: '#475569', fontSize: 13, fontWeight: '700' }
});
