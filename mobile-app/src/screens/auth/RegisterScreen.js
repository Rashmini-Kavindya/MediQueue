import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../../services/api';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
  if (!firstName || !lastName || !email || !phone || !password) {
    Alert.alert('Error', 'Please fill in all required fields');
    return;
  }

  setLoading(true);
  try {
    // 1. User ව Register කිරීම
    const regRes = await api.post('/auth/register', {
      firstName,
      lastName,
      email,
      phone,
      password,
      role
    });

    if (regRes.data.success) {
      // 2. OTP එක Request කිරීම
      const otpRes = await api.post('/auth/send-otp', { email, phone });
      
      const debugOtpCode = otpRes.data?.debugOtp;
      Alert.alert('Success', `OTP Sent! (Debug OTP: ${debugOtpCode})`);

      // OTP Screen එකට Data පාස් කිරීම
      navigation.navigate('Otp', { email, phone, debugOtp: debugOtpCode });
    }
  } catch (error) {
    console.log('Register Error:', error.response?.data || error.message);
    Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong');
  } finally {
    setLoading(false);
  }
};

  return (
    <ScrollView 
      className="bg-slate-900"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
    >
      <View className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <Text className="text-2xl font-bold text-white text-center mb-1">Create Account</Text>
        <Text className="text-sm text-slate-400 text-center mb-6">Join MediQueue to manage your visits.</Text>

        {/* Role Selector */}
        <Text className="text-slate-300 mb-2 font-medium">Select Role</Text>
        <View className="flex-row bg-slate-700 p-1 rounded-xl mb-4">
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${role === 'patient' ? 'bg-cyan-600' : ''}`}
            onPress={() => setRole('patient')}
          >
            <Text className={`font-semibold ${role === 'patient' ? 'text-white' : 'text-slate-400'}`}>Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${role === 'caregiver' ? 'bg-cyan-600' : ''}`}
            onPress={() => setRole('caregiver')}
          >
            <Text className={`font-semibold ${role === 'caregiver' ? 'text-white' : 'text-slate-400'}`}>Caregiver</Text>
          </TouchableOpacity>
        </View>

        {/* First & Last Name Fields */}
        <View className="flex-row space-x-2 mb-4">
          <View className="flex-1">
            <Text className="text-slate-300 mb-1 font-medium">First Name</Text>
            <TextInput
              className="bg-slate-700 text-white px-3 py-2.5 rounded-xl border border-slate-600 focus:border-cyan-500"
              placeholder="John"
              placeholderTextColor="#94a3b8"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <View className="flex-1">
            <Text className="text-slate-300 mb-1 font-medium">Last Name</Text>
            <TextInput
              className="bg-slate-700 text-white px-3 py-2.5 rounded-xl border border-slate-600 focus:border-cyan-500"
              placeholder="Doe"
              placeholderTextColor="#94a3b8"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
        </View>

        {/* Email Field */}
        <Text className="text-slate-300 mb-1 font-medium">Email Address</Text>
        <TextInput
          className="bg-slate-700 text-white px-4 py-2.5 rounded-xl mb-4 border border-slate-600 focus:border-cyan-500"
          placeholder="example@gmail.com"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Phone Field */}
        <Text className="text-slate-300 mb-1 font-medium">Phone Number</Text>
        <TextInput
          className="bg-slate-700 text-white px-4 py-2.5 rounded-xl mb-4 border border-slate-600 focus:border-cyan-500"
          placeholder="0771234567"
          placeholderTextColor="#94a3b8"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {/* Password Field */}
        <Text className="text-slate-300 mb-1 font-medium">Password</Text>
        <TextInput
          className="bg-slate-700 text-white px-4 py-2.5 rounded-xl mb-6 border border-slate-600 focus:border-cyan-500"
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Register Button */}
        <TouchableOpacity
          className="bg-cyan-600 py-3 rounded-xl items-center mb-4 active:bg-cyan-700"
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Register</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-slate-400">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-cyan-400 font-semibold">Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}