import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import Header from '../../components/admin/Header';

export default function QueueManagement({ navigation, route }) {
  // Default OPD ID or passed via route params
  const opdId = route?.params?.opdId || 'OPD-01';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calling, setCalling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [queueData, setQueueData] = useState({
    opdId: opdId,
    opdName: '',
    currentToken: null,
    totalWaiting: 0,
    queue: [],
  });

  // Today's formatted date
  const todayDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Only navigate if the screen is registered in AdminNavigator.
  // navigation.navigate() does not throw for unknown screens, so check routeNames first.
  const navigateSafely = (screenName) => {
    const routeNames = navigation.getState?.()?.routeNames || [];
    if (routeNames.includes(screenName)) {
      navigation.navigate(screenName);
    } else {
      Alert.alert('Notice', `${screenName} screen is under development.`);
    }
  };

  // Fetch Live Queue Data from Backend API
  const fetchLiveQueue = useCallback(async () => {
    try {
      const res = await api.get(`/queue/live/${opdId}`);
      if (res.data?.success) {
        setQueueData({
          opdId: res.data.data.opdId || opdId,
          opdName: res.data.data.opdName || 'General OPD',
          currentToken: res.data.data.currentToken || '---',
          totalWaiting: res.data.data.totalWaiting || 0,
          queue: res.data.data.queue || [],
        });
      }
    } catch (err) {
      console.log('Error fetching queue:', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [opdId]);

  useEffect(() => {
    fetchLiveQueue();
  }, [fetchLiveQueue]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveQueue();
  };

  // 1. CALL NEXT PATIENT API
  const handleCallNext = async () => {
    setCalling(true);
    try {
      const res = await api.post('/queue/call-next', { opdId: queueData.opdId || opdId });
      if (res.data?.success) {
        fetchLiveQueue();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to call next token');
    } finally {
      setCalling(false);
    }
  };

  // Find current called token object
  const currentTokenObj = queueData.queue.find(
    (t) => t.status === 'called' || t.status === 'in-consultation'
  );

  // 2. HOLD TOKEN API
  const handleHold = async () => {
    if (!currentTokenObj) {
      Alert.alert('Notice', 'No active token currently called to put on hold');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.put(`/queue/${currentTokenObj.tokenId}/hold`);
      if (res.data?.success) {
        fetchLiveQueue();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to hold token');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. SKIP TOKEN API
  const handleSkip = async () => {
    if (!currentTokenObj) {
      Alert.alert('Notice', 'No active token currently called to skip');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.put(`/queue/${currentTokenObj.tokenId}/skip`);
      if (res.data?.success) {
        fetchLiveQueue();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to skip token');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. RECALL TOKEN API (Recalls last held token or current)
  const handleRecall = async () => {
    const heldToken = queueData.queue.find((t) => t.status === 'hold');
    if (!heldToken) {
      Alert.alert('Notice', 'No tokens currently on hold to recall');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.put(`/queue/${heldToken.tokenId}/recall`);
      if (res.data?.success) {
        fetchLiveQueue();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to recall token');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter waiting list tokens
  const waitingTokens = queueData.queue.filter((t) => t.status === 'waiting');

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Reusable Header with Drawer Menu */}
      <Header title="Queue Management" />

      {/* Sub Header Info Bar */}
      <View className="px-5 pt-3 pb-2 flex-row justify-between items-center">
        <View className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-blue-600 mr-1.5" />
          <Text className="text-[10px] font-bold text-blue-700 tracking-wider uppercase">
            STAFF PORTAL
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            TODAY'S DATE
          </Text>
          <Text className="text-xs font-bold text-slate-800">{todayDate}</Text>
        </View>
      </View>

      {/* Screen Title */}
      <View className="px-5 mb-3">
        <Text className="text-2xl font-black text-slate-900 tracking-tight uppercase">
          QUEUE MANAGEMENT
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <>
            {/* CURRENTLY SERVING CARD */}
            <View className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm items-center mb-6">
              <View className="bg-slate-100/80 px-4 py-1.5 rounded-full flex-row items-center mb-4">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-[11px] font-bold text-slate-600 tracking-wider uppercase">
                  CURRENTLY SERVING
                </Text>
              </View>

              {/* Main Display Token */}
              <Text className="text-6xl font-black text-slate-900 tracking-tighter my-2">
                {queueData.currentToken || '---'}
              </Text>

              {/* Primary Action Button: CALL NEXT PATIENT */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCallNext}
                disabled={calling || actionLoading}
                className="bg-[#0052CC] w-full py-4 rounded-2xl flex-row items-center justify-center shadow-md shadow-blue-500/30 mt-4 mb-3"
                style={{ opacity: calling ? 0.7 : 1 }}
              >
                {calling ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                    <Text className="text-white font-black text-sm tracking-wider uppercase ml-2">
                      CALL NEXT PATIENT
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary Actions: RECALL / HOLD / SKIP */}
              <View className="flex-row justify-between w-full gap-2">
                {/* Recall */}
                <TouchableOpacity
                  onPress={handleRecall}
                  disabled={actionLoading}
                  className="flex-1 bg-white border border-slate-200 py-3 rounded-xl flex-row items-center justify-center"
                >
                  <Ionicons name="refresh" size={16} color="#64748B" />
                  <Text className="text-xs font-bold text-slate-700 uppercase ml-1.5">
                    RECALL
                  </Text>
                </TouchableOpacity>

                {/* Hold */}
                <TouchableOpacity
                  onPress={handleHold}
                  disabled={actionLoading}
                  className="flex-1 bg-white border border-slate-200 py-3 rounded-xl flex-row items-center justify-center"
                >
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#EAB308" />
                  <Text className="text-xs font-bold text-slate-700 uppercase ml-1.5">
                    HOLD
                  </Text>
                </TouchableOpacity>

                {/* Skip */}
                <TouchableOpacity
                  onPress={handleSkip}
                  disabled={actionLoading}
                  className="flex-1 bg-white border border-slate-200 py-3 rounded-xl flex-row items-center justify-center"
                >
                  <MaterialCommunityIcons name="fast-forward-outline" size={16} color="#64748B" />
                  <Text className="text-xs font-bold text-slate-700 uppercase ml-1.5">
                    SKIP
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* UPCOMING QUEUE TABLE CARD */}
            <View className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Header */}
              <View className="flex-row justify-between items-center px-5 py-4 border-b border-slate-100">
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  UPCOMING QUEUE
                </Text>
                <View className="bg-slate-100 px-3 py-1 rounded-full">
                  <Text className="text-[11px] font-bold text-slate-500">
                    {queueData.totalWaiting} Waiting
                  </Text>
                </View>
              </View>

              {/* Table Column Titles */}
              <View className="flex-row px-5 py-3 bg-slate-50/50 border-b border-slate-100">
                <Text className="flex-1 text-[10px] font-bold text-slate-400 uppercase">
                  TOKEN NUMBER
                </Text>
                <Text className="w-24 text-center text-[10px] font-bold text-slate-400 uppercase">
                  STATUS
                </Text>
                <Text className="w-20 text-right text-[10px] font-bold text-slate-400 uppercase">
                  ACTIONS
                </Text>
              </View>

              {/* Table Body / Queue List */}
              {waitingTokens.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-xs font-medium text-slate-400">
                    No patients waiting in queue
                  </Text>
                </View>
              ) : (
                waitingTokens.map((item, index) => (
                  <View
                    key={item.tokenId || index.toString()}
                    className="flex-row items-center px-5 py-3.5 border-b border-slate-50"
                  >
                    {/* Token Number */}
                    <View className="flex-1 flex-row items-center">
                      <View
                        className={`w-2 h-2 rounded-full mr-2.5 ${
                          index === 0 ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                      />
                      <Text className="text-sm font-bold text-slate-800">
                        {item.tokenNo}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View className="w-24 items-center">
                      <View
                        className={`px-3 py-1 rounded-full ${
                          index === 0
                            ? 'bg-amber-100/70 border border-amber-200'
                            : 'bg-slate-100'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold uppercase ${
                            index === 0 ? 'text-amber-700' : 'text-slate-500'
                          }`}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    {/* Details Action Link */}
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert('Token Details', `Token: ${item.tokenNo}\nStatus: ${item.status}`)
                      }
                      className="w-20 flex-row items-center justify-end"
                    >
                      <Text className="text-xs font-semibold text-blue-600 mr-0.5">
                        Details
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      <View className="absolute bottom-4 left-5 right-5 bg-white border border-slate-100 rounded-3xl p-3 flex-row justify-around items-center shadow-lg shadow-slate-200">
        {/* Dashboard Link */}
        <TouchableOpacity
          onPress={() => navigateSafely('AdminDashboard')}
          className="items-center px-3 py-1"
        >
          <Ionicons name="grid-outline" size={22} color="#64748B" />
          <Text className="text-[10px] font-semibold text-slate-500 mt-1">Home</Text>
        </TouchableOpacity>

        {/* Active Queue Link */}
        <TouchableOpacity className="items-center px-3 py-1">
          <Ionicons name="ticket" size={22} color="#0052CC" />
          <Text className="text-[10px] font-bold text-[#0052CC] mt-1">Queue</Text>
        </TouchableOpacity>

        {/* OPDs Link */}
        <TouchableOpacity
          onPress={() => navigateSafely('OPDManagement')}
          className="items-center px-3 py-1"
        >
          <Ionicons name="business-outline" size={22} color="#64748B" />
          <Text className="text-[10px] font-semibold text-slate-500 mt-1">OPDs</Text>
        </TouchableOpacity>

        {/* Patients Link */}
        <TouchableOpacity
          onPress={() => navigateSafely('PatientsManagement')}
          className="items-center px-3 py-1"
        >
          <Ionicons name="people-outline" size={22} color="#64748B" />
          <Text className="text-[10px] font-semibold text-slate-500 mt-1">Patients</Text>
        </TouchableOpacity>

        {/* Settings Link */}
        <TouchableOpacity
          onPress={() => navigateSafely('SystemSettings')}
          className="items-center px-3 py-1"
        >
          <Ionicons name="settings-outline" size={22} color="#64748B" />
          <Text className="text-[10px] font-semibold text-slate-500 mt-1">Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}