import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

// Needed so the browser popup closes properly on web
WebBrowser.maybeCompleteAuthSession();

const CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

// The Google hook throws if a client id is undefined, so give it a dummy value
// and check `configured` before opening the Google prompt.
const MISSING = 'not-configured';

// "OR" divider + "Continue with Google" button.
// Used on Login and Register: existing email logs in, new email is registered. No OTP.
export default function GoogleButton({ role = 'patient', onError }) {
  const { t } = useTranslation();
  const { loginWithToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const configured = !!CLIENT_IDS[Platform.OS];

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: CLIENT_IDS.web || MISSING,
    androidClientId: CLIENT_IDS.android || MISSING,
    iosClientId: CLIENT_IDS.ios || MISSING,
  });

  // Backend: POST /auth/google { idToken, role } -> { data: { token, user } }
  const sendToBackend = async (idToken) => {
    try {
      const res = await api.post('/auth/google', { idToken, role });

      if (res.data?.success) {
        const { token, user } = res.data.data;
        // AppNavigator switches to the dashboard automatically
        await loginWithToken(token, user);
      }
    } catch (err) {
      onError?.(
        err.response?.data?.message ||
          t('google_failed', 'Google sign-in failed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (idToken) {
        sendToBackend(idToken);
      } else {
        setLoading(false);
        onError?.(t('google_failed', 'Google sign-in failed. Please try again.'));
      }
    } else if (response.type === 'error') {
      setLoading(false);
      onError?.(t('google_failed', 'Google sign-in failed. Please try again.'));
    } else {
      // dismissed / cancelled by the user
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handlePress = async () => {
    if (loading) return;
    onError?.('');

    if (!configured) {
      onError?.(
        t('google_not_configured', 'Google sign-in is not configured for this platform yet.')
      );
      return;
    }

    setLoading(true);
    try {
      const result = await promptAsync();
      if (result?.type !== 'success') setLoading(false);
    } catch (e) {
      setLoading(false);
      onError?.(t('google_failed', 'Google sign-in failed. Please try again.'));
    }
  };

  return (
    <View>
      {/* Divider */}
      <View className="flex-row items-center my-5">
        <View className="flex-1 h-px bg-slate-200" />
        <Text className="mx-3 text-xs text-slate-400">{t('or', 'OR')}</Text>
        <View className="flex-1 h-px bg-slate-200" />
      </View>

      {/* Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        disabled={loading || !request}
        className="bg-white border border-slate-200 py-3.5 rounded-xl flex-row items-center justify-center shadow-sm"
        style={{ opacity: loading || !request ? 0.7 : 1 }}
      >
        {loading ? (
          <ActivityIndicator color="#2563EB" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text className="text-slate-800 font-bold text-base ml-2">
              {t('continue_with_google', 'Continue with Google')}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}