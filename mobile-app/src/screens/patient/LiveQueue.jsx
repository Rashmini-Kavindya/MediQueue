import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';

export default function LiveQueue({ navigation, route }) {
  const { getFontSize, t } = useSettings();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueList, setQueueList] = useState([]); // බහු පෝලිම් සඳහා ලැයිස්තුවක් ලෙස තබා ගනී

  // API එකෙන් Active Queues සියල්ල ලබා ගැනීම
  const fetchQueueDetails = async () => {
    try {
      const res = await API.get('/queue/my-status');

      if (res.data && res.data.success) {
        const data = res.data.data;
        let activeTokens = [];

        if (Array.isArray(data)) {
          activeTokens = data;
        } else if (data) {
          activeTokens = [data];
        }

        // සෑම ටෝකනයකටම අදාළ live queue දත්ත වෙන වෙනම fetch කර ගැනීම
        const detailedQueueList = await Promise.all(
          activeTokens.map(async (myData) => {
            let liveQueueData = [];
            let nowServingToken = '---';

            if (myData.opdId) {
              try {
                const liveRes = await API.get(`/queue/live/${myData.opdId}`);
                if (liveRes.data && liveRes.data.success) {
                  const liveData = liveRes.data.data;
                  nowServingToken = liveData.currentToken || '---';

                  liveQueueData = (liveData.queue || []).map((qToken) => {
                    const isUser = qToken.tokenNo === myData.tokenNo;
                    const isCurrent = qToken.tokenNo === liveData.currentToken;

                    let statusText = qToken.status ? qToken.status.toUpperCase() : '';
                    if (isCurrent) statusText = 'CURRENT';
                    if (isUser) statusText = 'YOU';

                    return {
                      token: qToken.tokenNo,
                      status: statusText,
                      isCurrent,
                      isUser,
                      rawStatus: qToken.status,
                    };
                  });
                }
              } catch (err) {
                console.log('Error fetching live queue for opd:', myData.opdId);
              }
            }

            return {
              ...myData,
              nowServingToken,
              liveQueueData,
              lastUpdatedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          })
        );

        setQueueList(detailedQueueList);
      } else {
        setQueueList([]);
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        setQueueList([]);
      } else {
        console.log('Queue Fetch Error:', error?.response?.data?.message || error.message);
        setQueueList([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchQueueDetails();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueueDetails();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center px-5 pt-3 pb-2">
          <View className="flex-row items-center">
            <View className="w-9 h-9 justify-center items-center mr-2">
              <MaterialCommunityIcons name="hospital-box-outline" size={32} color="#0284c7" />
            </View>
            <View>
              <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-blue-600 tracking-wider">
                {t?.appTitle || 'MEDIQUEUE'}
              </Text>
              <Text style={{ fontSize: getFontSize(18) }} className="font-bold text-slate-900 leading-5">
                {t?.myQueueHeader || 'MY QUEUE'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation?.navigate('Profile')}
            className="w-10 h-10 bg-blue-600 rounded-full justify-center items-center shadow-sm"
          >
            <Ionicons name="person" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Title Bar */}
        <View className="flex-row items-center px-5 my-2">
          <Text style={{ fontSize: getFontSize(24) }} className="font-extrabold text-slate-900 mr-2">
            {t?.liveQueueTitle || 'Live Queue'}
          </Text>
          <View className="bg-emerald-100 px-3 py-1 rounded-full">
            <Text style={{ fontSize: getFontSize(12) }} className="font-semibold text-emerald-600">
              Active Sessions
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : queueList.length === 0 ? (
          /* No Active Token Card */
          <View className="mx-5 my-6 bg-white rounded-3xl p-8 items-center shadow-sm border border-slate-100">
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={60} color="#94a3b8" />
            <Text style={{ fontSize: getFontSize(18) }} className="font-extrabold text-slate-800 mt-4 text-center">
              No Active Token Found
            </Text>
            <Text style={{ fontSize: getFontSize(12) }} className="text-slate-500 text-center mt-1 leading-5">
              You do not have an active queue booking for today. Book a token to view live queue details.
            </Text>
          </View>
        ) : (
          /* Active Queues ලැයිස්තුව loop කර එක් එක් ක්ලිනික්/OPD එක සඳහා වෙනම කාඩ් පෙන්වීම */
          queueList.map((queueData, index) => {
            const clinicName = queueData.clinicName || queueData.department || queueData.opdName || 'GENERAL MEDICINE';
            const roomNo = queueData.room || queueData.roomNo || 'Room 04';
            const hospitalName = queueData.hospital || 'National Hospital Colombo';

            return (
              <View key={queueData.id || queueData.tokenId || index} className="mx-5 my-3">
                
                {/* Clinic Info Header Tag */}
                <View className="bg-blue-600 px-4 py-2 rounded-t-2xl flex-row justify-between items-center">
                  <Text style={{ fontSize: getFontSize(13) }} className="text-white font-bold">
                    🏥 {clinicName} ({roomNo})
                  </Text>
                  <Text style={{ fontSize: getFontSize(11) }} className="text-blue-100 font-medium">
                    {hospitalName}
                  </Text>
                </View>

                {/* Main Ticket Card */}
                <View className="bg-white rounded-b-3xl p-5 shadow-sm border-x border-b border-slate-100 mb-2">
                  <Text style={{ fontSize: getFontSize(12) }} className="text-center font-semibold text-slate-400 tracking-wider mb-1">
                    {t?.yourTokenNumber || 'YOUR TOKEN NUMBER'}
                  </Text>
                  <Text style={{ fontSize: getFontSize(48) }} className="text-center font-black text-slate-900 mb-5 tracking-tight">
                    {queueData.tokenNo || queueData.tokenSequence || '---'}
                  </Text>

                  {/* Grid Cards (Now Serving & Est. Wait Time) */}
                  <View className="flex-row gap-3 mb-4">
                    {/* Now Serving Card */}
                    <View className="flex-1 bg-blue-600 rounded-2xl p-4 justify-between min-h-[120px]">
                      <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-blue-200 tracking-wider uppercase">
                        {t?.nowServing || 'NOW SERVING'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(30) }} className="font-black text-white">
                        {queueData.nowServingToken}
                      </Text>
                      <Text style={{ fontSize: getFontSize(11) }} className="text-blue-100 font-medium leading-4">
                        {t?.doctorWithPatient || 'Doctor is currently with patient'}
                      </Text>
                    </View>

                    {/* Est. Wait Time Card */}
                    <View className="flex-1 bg-slate-100/80 rounded-2xl p-4 justify-between min-h-[120px]">
                      <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-slate-400 tracking-wider uppercase">
                        {t?.estWaitTime || 'EST. WAIT TIME'}
                      </Text>
                      <View className="flex-row items-baseline">
                        <Text style={{ fontSize: getFontSize(24) }} className="font-black text-slate-900">
                          ~ {queueData.estimatedWaitMinutes || 0}{' '}
                        </Text>
                        <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-900">
                          mins
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={13} color="#64748b" />
                        <Text style={{ fontSize: getFontSize(11) }} className="text-slate-500 font-medium ml-1">
                          Live Estimate
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Patients Ahead Alert Bar */}
                  <View className="bg-blue-50/70 rounded-2xl p-3 flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-blue-600 justify-center items-center mr-2">
                        <FontAwesome5 name="users" size={12} color="#ffffff" />
                      </View>
                      <Text style={{ fontSize: getFontSize(12) }} className="font-bold text-slate-700">
                        {queueData.patientsAhead !== undefined ? queueData.patientsAhead : 0} PATIENTS AHEAD OF YOU
                      </Text>
                    </View>
                    <View className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <Text style={{ fontSize: getFontSize(11) }} className="font-semibold text-slate-500">
                        {queueData.opdId || 'OPD'}
                      </Text>
                    </View>
                  </View>

                  {/* Queue Progress List Card */}
                  <View className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center">
                        <MaterialIcons name="format-list-numbered" size={18} color="#1e293b" />
                        <Text style={{ fontSize: getFontSize(15) }} className="font-bold text-slate-800 ml-2">
                          {t?.queueProgress || 'Queue Progress'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(11) }} className="font-semibold text-slate-400">
                        Active Tokens
                      </Text>
                    </View>

                    {/* Dynamic Queue List */}
                    <View className="gap-2">
                      {queueData.liveQueueData && queueData.liveQueueData.length > 0 ? (
                        queueData.liveQueueData.map((item, qIdx) => (
                          <View
                            key={qIdx}
                            className={`flex-row justify-between items-center p-2.5 rounded-xl ${
                              item.isCurrent
                                ? 'bg-blue-50 border border-blue-200'
                                : item.isUser
                                ? 'bg-blue-100/60 border border-blue-300'
                                : 'bg-white border border-slate-100'
                            }`}
                          >
                            <View className="flex-row items-center">
                              <MaterialCommunityIcons
                                name={item.isUser ? 'account-box-outline' : 'clock-outline'}
                                size={18}
                                color={item.isCurrent || item.isUser ? '#2563eb' : '#94a3b8'}
                              />
                              <Text
                                style={{ fontSize: getFontSize(13) }}
                                className={`ml-2.5 font-bold ${
                                  item.isCurrent || item.isUser ? 'text-blue-700' : 'text-slate-600'
                                }`}
                              >
                                {item.token}
                              </Text>
                            </View>

                            {/* Status Badges */}
                            {item.isCurrent ? (
                              <View className="bg-blue-600 px-2.5 py-0.5 rounded-md">
                                <Text style={{ fontSize: getFontSize(9) }} className="font-extrabold text-white">
                                  {t?.statusCurrent || 'CURRENT'}
                                </Text>
                              </View>
                            ) : item.isUser ? (
                              <View className="bg-blue-600 px-2.5 py-0.5 rounded-md">
                                <Text style={{ fontSize: getFontSize(9) }} className="font-extrabold text-white">
                                  {t?.statusYou || 'YOU'}
                                </Text>
                              </View>
                            ) : (
                              <Text
                                style={{ fontSize: getFontSize(10) }}
                                className={`font-bold ${
                                  item.rawStatus === 'in-consultation' ? 'text-blue-600' : 'text-slate-500'
                                }`}
                              >
                                {item.status}
                              </Text>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 text-center py-2">
                          No queue details available.
                        </Text>
                      )}
                    </View>

                    {/* Footer Status Message */}
                    <View className="flex-row items-center justify-center mt-3 pt-3 border-t border-slate-200/60">
                      <Ionicons name="checkmark-circle-outline" size={14} color="#16a34a" />
                      <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-slate-500 ml-1 uppercase tracking-tight">
                        {t?.queueStatusMoving || 'QUEUE IS MOVING'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(9) }} className="font-semibold text-slate-400 ml-2 uppercase">
                        UPDATED: {queueData.lastUpdatedTime}
                      </Text>
                    </View>
                  </View>

                </View>

              </View>
            );
          })
        )}
      </ScrollView>

{/* Floating Chatbot Button */}
<TouchableOpacity
  onPress={() => navigation?.navigate('Chatbot')}
  activeOpacity={0.85}
  className="absolute bottom-6 right-5 w-14 h-14 bg-blue-600 rounded-full justify-center items-center shadow-lg z-50"
  style={{
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  }}
>
  <MaterialCommunityIcons
    name="robot-outline"
    size={28}
    color="#ffffff"
  />

  {/* Green Online Indicator */}
  <View
    className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"
  />
</TouchableOpacity>

      
    </SafeAreaView>
  );
}