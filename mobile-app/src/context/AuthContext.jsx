import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuthData();
  }, []);

  const loadStoredAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (e) {
      console.log('Failed to load auth data:', e);
    } finally {
      setLoading(false);
    }
  };

  // (userData, token) order
  const login = async (userData, token) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
    } catch (e) {
      console.log('Error saving auth data:', e);
    }
  };

  // Used by LoginScreen / OtpScreen: backend returns { token, user }
  const loginWithToken = (token, userData) => login(userData, token);

  const logout = async () => {
    delete api.defaults.headers.common['Authorization'];
    setUser(null);

    try {
      await AsyncStorage.multiRemove(['token', 'user']);
    } catch (e) {
      console.log('Error clearing stored auth data:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, userRole: user?.role, loading, login, loginWithToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};