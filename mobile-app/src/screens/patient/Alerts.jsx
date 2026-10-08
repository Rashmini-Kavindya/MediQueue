import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';

export default function Alerts() {
  const { user } = useContext(AuthContext);
  const { getFontSize, t } = useSettings();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = async () => {
    try {
      const response = await API.get('/notifications');
      
      let rawData = [];
      if (response.data && response.data.success) {
        if (Array.isArray(response.data.data)) {
          rawData = response.data.data;
        } else if (response.data.data) {
          rawData = [response.data.data];
        }
      }

      if (rawData.length > 0) {
        const formattedAlerts = rawData.map((item, index) => {
          let rawType = (item.type || '').toUpperCase();
          let rawMessage = (item.message || '').toLowerCase();
          let detectedType = 'QUEUE_UPDATE';

          if (rawType.includes('TURN') || rawMessage.includes('proceed') || rawMessage.includes('turn')) {
            detectedType = 'YOUR_TURN';
          } else if (rawType.includes('NEAR') || rawMessage.includes('remaining') || rawMessage.includes('ahead')) {
            detectedType = 'TURN_NEAR';
          } else {
            detectedType = 'QUEUE_UPDATE';
          }

          // සටහන: isRead හරියට එන්නේ නැති නම්, sentAt එක බලලා පැයකට වඩා පැරණි ඒවා older ලෙස ගන්නත් පුළුවන්
          const itemTime = item.sentAt ? new Date(item.sentAt).getTime() : new Date().getTime();
          const oneHourAgo = new Date().getTime() - (60 * 60 * 1000);
          const isReallyOlder = item.isRead === true || itemTime < oneHourAgo;

          return {
            id: item.notificationId || item._id || index.toString(),
            type: detectedType,
            time: item.sentAt ? new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            message: item.message || item.title,
            room: item.room || item.roomNo || 'OPD Section',
            location: item.location || item.hospital || 'Hospital Premises',
            doctor: item.doctor || item.clinicName || 'Medical Staff',
            remainingNumbers: item.remainingNumbers || item.patientsAhead || 0,
            currentServing: item.currentServing || item.currentToken || '-',
            aheadCount: item.aheadCount || item.patientsAhead || 0,
            isOlder: isReallyOlder,
          };
        });
        setAlerts(formattedAlerts);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const handleDismiss = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setAlerts((prevAlerts) => prevAlerts.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
      setAlerts((prevAlerts) => prevAlerts.filter((item) => item.id !== id));
    }
  };

  const newAlerts = alerts.filter((a) => !a.isOlder);
  const olderAlerts = alerts.filter((a) => a.isOlder);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center px-5 pt-3 pb-3">
          <View className="flex-row items-center">
            <View className="w-10 h-10 justify-center items-center mr-2.5">
              <View className="relative w-9 h-9 items-center justify-center">
                <View className="absolute w-4 h-9 bg-blue-600 rounded-full" />
                <View className="absolute w-9 h-4 bg-blue-400 rounded-full" />
                <View className="absolute w-4 h-4 bg-sky-300 rounded-full top-0 left-0" />
              </View>
            </View>
            <View>
              <Text style={{ fontSize: getFontSize(10) }} className="font-extrabold text-blue-600 tracking-[2px]">
                MEDIQUEUE
              </Text>
              <Text style={{ fontSize: getFontSize(22) }} className="font-black text-slate-900 tracking-tight leading-6">
                ALERTS
              </Text>
            </View>
          </View>

          <TouchableOpacity className="w-11 h-11 bg-blue-600 rounded-full justify-center items-center shadow-md">
            <Ionicons name="person" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <View className="px-5 mt-2 gap-4">
            {newAlerts.length === 0 ? (
              <Text style={{ fontSize: getFontSize(12) }} className="text-center text-slate-400 py-10">
                No new alerts
              </Text>
            ) : (
              newAlerts.map((item) => {
                // 1. YOUR TURN CARD
                if (item.type === 'YOUR_TURN') {
                  return (
                    <View
                      key={item.id}
                      className="bg-white rounded-3xl p-5 border-l-[6px] border-l-blue-600 border border-slate-200/80 shadow-sm"
                    >
                      <View className="flex-row justify-between items-center mb-2">
                        <View className="flex-row items-center">
                          <View className="w-9 h-9 rounded-xl bg-blue-50 justify-center items-center mr-3">
                            <Ionicons name="notifications" size={18} color="#2563eb" />
                          </View>
                          <Text style={{ fontSize: getFontSize(14) }} className="font-black text-slate-900 tracking-wider">
                            YOUR TURN
                          </Text>
                        </View>
                        <Text style={{ fontSize: getFontSize(11) }} className="font-semibold text-slate-400">{item.time}</Text>
                      </View>

                      <View className="ml-12">
                        <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-900 leading-5">
                          Please proceed to <Text className="text-blue-600 underline">{item.room}.</Text>
                        </Text>
                        <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 mt-1">
                          - {item.location} {'\n'}{item.doctor}
                        </Text>

                        <View className="flex-row gap-2.5 mt-4">
                          <TouchableOpacity className="bg-blue-600 px-5 py-2.5 rounded-xl shadow-sm">
                            <Text style={{ fontSize: getFontSize(11) }} className="text-white font-bold tracking-wide">
                              VIEW DIRECTIONS
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDismiss(item.id)}
                            className="bg-slate-100 px-5 py-2.5 rounded-xl"
                          >
                            <Text style={{ fontSize: getFontSize(11) }} className="text-slate-600 font-bold tracking-wide">
                              DISMISS
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                }

                // 2. YOUR TURN IS NEAR CARD
                if (item.type === 'TURN_NEAR') {
                  return (
                    <View
                      key={item.id}
                      className="bg-white rounded-3xl p-5 border-l-[6px] border-l-amber-400 border border-slate-200/80 shadow-sm"
                    >
                      <View className="flex-row justify-between items-center mb-2">
                        <View className="flex-row items-center">
                          <View className="w-9 h-9 rounded-xl bg-amber-50 justify-center items-center mr-3">
                            <Feather name="clock" size={18} color="#d97706" />
                          </View>
                          <Text style={{ fontSize: getFontSize(14) }} className="font-black text-slate-900 tracking-wider">
                            YOUR TURN IS NEAR
                          </Text>
                        </View>
                        <Text style={{ fontSize: getFontSize(11) }} className="font-semibold text-slate-400">{item.time}</Text>
                      </View>

                      <View className="ml-12">
                        <Text style={{ fontSize: getFontSize(13) }} className="text-slate-600 leading-5">
                          <Text className="font-bold text-slate-900">
                            {item.remainingNumbers} numbers remaining.
                          </Text>{' '}
                          {item.message || 'Please return to the OPD waiting area immediately.'}
                        </Text>

                        <View className="mt-3.5 self-start bg-amber-50/80 border border-amber-200/60 px-3.5 py-2 rounded-full flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                          <Text style={{ fontSize: getFontSize(11) }} className="font-bold text-amber-900">
                            Current serving: {item.currentServing} ({item.aheadCount} ahead)
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }

                // 3. QUEUE UPDATE CARD
                return (
                  <View
                    key={item.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm"
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center">
                        <View className="w-9 h-9 rounded-xl bg-slate-100 justify-center items-center mr-3">
                          <Ionicons name="clipboard-outline" size={18} color="#64748b" />
                        </View>
                        <Text style={{ fontSize: getFontSize(14) }} className="font-black text-slate-800 tracking-wider">
                          QUEUE UPDATE
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(11) }} className="font-semibold text-slate-400">{item.time}</Text>
                    </View>

                    <View className="ml-12 mt-1.5">
                      <Text style={{ fontSize: getFontSize(13) }} className="text-slate-500 leading-5">
                        {item.message || 'Queue progress updated for your active booking.'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* Older Notifications Divider */}
            <View className="flex-row items-center my-3">
              <View className="flex-1 h-[1px] bg-slate-200" />
              <Text style={{ fontSize: getFontSize(10) }} className="mx-4 font-bold text-slate-400 tracking-widest uppercase">
                OLDER NOTIFICATIONS
              </Text>
              <View className="flex-1 h-[1px] bg-slate-200" />
            </View>

            {olderAlerts.length === 0 ? (
              <View className="py-2" />
            ) : (
              olderAlerts.map((item) => (
                <View key={item.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 opacity-60 mb-2">
                  <Text style={{ fontSize: getFontSize(12) }} className="text-slate-600">{item.message}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Chatbot Button */}
      <View className="absolute bottom-6 right-5 z-50">
        <TouchableOpacity className="w-14 h-14 bg-white rounded-full justify-center items-center shadow-lg border border-slate-100">
          <View className="w-12 h-12 bg-blue-600 rounded-full justify-center items-center relative">
            <MaterialCommunityIcons name="robot-happy" size={26} color="#ffffff" />
            <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}