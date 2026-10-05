import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        // AuthContext හරහා User state එක update කිරීම
        await login(user, token);
      }
    } catch (error) {
      console.log('Login Error:', error.response?.data || error.message);
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid Credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center px-6">
      <View className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <Text className="text-2xl font-bold text-white text-center mb-2">MediQueue</Text>
        <Text className="text-sm text-slate-400 text-center mb-6">Welcome back! Please login.</Text>

        <Text className="text-slate-300 mb-1 font-medium">Email Address</Text>
        <TextInput
          className="bg-slate-700 text-white px-4 py-3 rounded-xl mb-4 border border-slate-600 focus:border-cyan-500"
          placeholder="minuri@gmail.com"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text className="text-slate-300 mb-1 font-medium">Password</Text>
        <TextInput
          className="bg-slate-700 text-white px-4 py-3 rounded-xl mb-6 border border-slate-600 focus:border-cyan-500"
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          className="bg-cyan-600 py-3 rounded-xl items-center mb-4 active:bg-cyan-700"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Login</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-slate-400">Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-cyan-400 font-semibold">Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}