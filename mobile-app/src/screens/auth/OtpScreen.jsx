import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';

export default function OtpScreen({ route, navigation }) {
  const { email, phone, debugOtp } = route.params || {};
  const [otp, setOtp] = useState(debugOtp || '');
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { 
        email: email || undefined, 
        phone: phone || undefined, 
        otp 
      });

      if (response.data.success) {
        Alert.alert('Verified!', 'Your account has been verified successfully. Please login.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.log('OTP Error:', error.response?.data || error.message);
      Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await api.post('/auth/send-otp', { email, phone });
      if (res.data.success) {
        if (res.data.debugOtp) setOtp(res.data.debugOtp);
        Alert.alert('OTP Sent', `New code sent! ${res.data.debugOtp ? `(Code: ${res.data.debugOtp})` : ''}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center px-6">
      <View className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <Text className="text-2xl font-bold text-white text-center mb-2">Verify Account</Text>
        <Text className="text-sm text-slate-400 text-center mb-4">
          Enter code sent to {email || phone}
        </Text>

        {/* Debug Banner (Testing සඳහා පමණි) */}
        {debugOtp && (
          <View className="bg-cyan-900/40 border border-cyan-500/30 p-2 rounded-xl mb-4">
            <Text className="text-cyan-300 text-xs text-center font-mono">
              [DEBUG OTP]: {debugOtp}
            </Text>
          </View>
        )}

        <Text className="text-slate-300 mb-2 font-medium text-center">6-Digit Code</Text>
        <TextInput
          className="bg-slate-700 text-white text-center text-2xl tracking-widest px-4 py-3 rounded-xl mb-4 border border-slate-600 focus:border-cyan-500"
          placeholder="123456"
          placeholderTextColor="#94a3b8"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity
          className="bg-cyan-600 py-3 rounded-xl items-center mb-3 active:bg-cyan-700"
          onPress={handleVerifyOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Verify OTP</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResendOtp} className="mb-4">
          <Text className="text-cyan-400 text-center text-sm font-medium">Resend OTP Code</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text className="text-slate-400 text-center text-sm">Cancel / Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}