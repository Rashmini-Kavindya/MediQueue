import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export default function TokenConfirmationScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { loginWithToken } = useContext(AuthContext);

  const { opdId, opdName, token: authToken, user, role, patientId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    bookToken();
  }, []);

  const bookToken = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // Call Backend API to Book Token
      const res = await api.post(
        '/tokens',
        {
          opdId,
          patientId: role === 'caregiver' ? patientId : undefined
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      if (res.data?.success) {
        setTokenData(res.data.data);
      }
    } catch (err) {
      console.log('Token Booking Error:', err.response?.data || err.message);
      const msg = err.response?.data?.message || 'Failed to generate token.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    try {
      // Complete Auth Flow & switch user state to logged in
      if (loginWithToken && authToken && user) {
        await loginWithToken(authToken, user);
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Access' }],
        });
      }
    } catch (err) {
      console.log('Login context update failed:', err);
    }
  };

  return (
    // NOTE: className is NOT used on SafeAreaView (third-party component) -> use style instead
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FE' }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
        <Text className="text-lg font-bold text-slate-800">
          {t('token_confirmation', 'Token Confirmation')}
        </Text>
        <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
      </View>

      <View className="flex-1 px-6 pt-6 justify-center">
        {loading ? (
          <View key="loading-view" className="items-center py-12">
            <ActivityIndicator size="large" color="#0052CC" />
            <Text className="text-slate-500 font-medium text-sm mt-4">
              {t('generating_token', 'Generating your queue token...')}
            </Text>
          </View>
        ) : errorMsg ? (
          <View
            key="error-view"
            className="bg-white p-6 rounded-3xl border border-red-100 items-center"
          >
            <View className="w-16 h-16 bg-red-50 rounded-full justify-center items-center mb-4">
              <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
            </View>
            <Text className="text-lg font-bold text-slate-900 text-center mb-2">
              Booking Issue
            </Text>
            <Text className="text-slate-600 text-sm text-center mb-6">
              {errorMsg}
            </Text>
            <TouchableOpacity
              onPress={bookToken}
              className="bg-[#0052CC] px-6 py-3 rounded-xl flex-row items-center"
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm ml-2">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            key="success-view"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Success Card */}
            <View className="bg-white rounded-3xl p-6 border border-slate-100 items-center mb-6">
              <View className="w-16 h-16 bg-emerald-50 rounded-2xl justify-center items-center mb-4">
                <Ionicons name="checkmark-circle" size={36} color="#10B981" />
              </View>

              <Text className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-2 uppercase tracking-wide">
                {t('token_booked', 'Token Booked Successfully')}
              </Text>

              <Text className="text-slate-500 text-xs mb-1">{opdName || 'OPD Queue'}</Text>

              {/* Token Number Display */}
              <Text className="text-5xl font-black text-slate-900 my-2 tracking-tight">
                {tokenData?.tokenNo}
              </Text>

              {/* Details List */}
              <View className="w-full bg-slate-50 rounded-2xl p-4 mt-4">
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-xs font-medium text-slate-500">Queue Position</Text>
                  <Text className="text-xs font-bold text-slate-800">
                    #{tokenData?.tokenSequence}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-2 border-t border-slate-200">
                  <Text className="text-xs font-medium text-slate-500">Tracking Code</Text>
                  <Text className="text-xs font-bold text-blue-600">
                    {tokenData?.trackingCode}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-2 border-t border-slate-200">
                  <Text className="text-xs font-medium text-slate-500">Queue Date</Text>
                  <Text className="text-xs font-bold text-slate-800">
                    {tokenData?.queueDate}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-2 border-t border-slate-200">
                  <Text className="text-xs font-medium text-slate-500">Status</Text>
                  <Text className="text-xs font-bold text-amber-600 capitalize">
                    {tokenData?.status}
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex-row items-center">
              <Ionicons name="information-circle-outline" size={22} color="#0052CC" />
              <Text className="text-xs text-blue-800 ml-3 flex-1">
                You can monitor your live queue progress from the dashboard anytime using your tracking code.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Bottom Button */}
      <View className="px-6 pb-6 pt-3 bg-white border-t border-slate-100">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFinish}
          disabled={loading}
          className="bg-[#0052CC] py-4 rounded-xl flex-row items-center justify-center"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <Text className="text-white font-bold text-base mr-2">
            {t('go_to_dashboard', 'Go to Dashboard')}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}