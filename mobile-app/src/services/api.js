import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : (process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.8:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    // AuthContext stores the current JWT under "token".
    // "userToken" is only a fallback for legacy screens.
    const currentToken = await AsyncStorage.getItem('token');
    const token = currentToken || await AsyncStorage.getItem('userToken');
    // Preserve any explicit Authorization header from older caregiver API functions.
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;