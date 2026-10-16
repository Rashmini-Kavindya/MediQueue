import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';
import AppHeader from '../../components/AppHeader'; // Reusable Header එක import කිරීම

// iOS system colors
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.14)',
  bg: '#F2F2F7',
  label: '#000000',
  secondaryLabel: '#8E8E93',
  fill: '#F2F2F7',
  separator: '#C6C6C8',
};

// iOS style soft shadow
const cardShadow = {
  shadowColor: '#0B1B3A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 2,
};

// iOS squircle corners + hairline edge (Android වල ignore වෙනවා)
const squircle = { borderCurve: 'continuous' };
const cardEdge = { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,60,67,0.12)' };

export default function LiveQueue({ navigation, route }) {
  const { user } = useContext(AuthContext);
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
            let nowServingToken = myData.currentServing || '---';

            if (myData.opdId) {
              try {
                const liveRes = await API.get(`/queue/live/${myData.opdId}`);
                if (liveRes.data && liveRes.data.success) {
                  const liveData = liveRes.data.data;
                  nowServingToken = liveData.currentToken || liveData.currentServing || myData.currentServing || '---';

                  const rawQueue = liveData.queue || liveData.tokens || [];
                  liveQueueData = rawQueue.map((qToken) => {
                    const tokenValue = typeof qToken === 'string' ? qToken : (qToken.tokenNo || qToken.token || '');
                    const isUser = tokenValue === myData.tokenNo;
                    const isCurrent = tokenValue === nowServingToken;

                    let statusText = qToken.status ? qToken.status.toUpperCase() : (isCurrent ? 'CURRENT' : (isUser ? 'YOU' : 'WAITING'));
                    if (isCurrent) statusText = 'CURRENT';
                    if (isUser) statusText = 'YOU';

                    return {
                      token: tokenValue,
                      status: statusText,
                      isCurrent,
                      isUser,
                      rawStatus: qToken.status || 'waiting',
                    };
                  });
                }
              } catch (err) {
                console.log('Error fetching live queue for opd:', myData.opdId);
              }
            }

            // එක API එකකින් queue array එක නොලැබුණහොත් myData එක ඇතුළේ ඇති දත්ත මත පදනම්ව fallback එකක් සකස් කිරීම
            if (liveQueueData.length === 0 && myData.tokenNo) {
              liveQueueData = [
                {
                  token: myData.tokenNo,
                  status: 'YOU',
                  isCurrent: false,
                  isUser: true,
                  rawStatus: myData.status || 'waiting',
                }
              ];
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: IOS.bg }}>
      {/* Reusable AppHeader එක මෙතැනට ඇතුළත් කර ඇත */}
      <AppHeader
        userName={user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
        onNotificationPress={() => navigation?.navigate('Alerts')}
        onPrescriptionPress={() => {
          console.log('Prescription icon pressed');
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Large Title (iOS style) */}
        <View className="px-5 mt-4 mb-2">
          <Text
            style={{ fontSize: getFontSize(30), letterSpacing: 0.3, color: IOS.label }}
            className="font-bold"
          >
            {t?.liveQueueTitle || 'Live Queue'}
          </Text>
          <View
            style={[{ backgroundColor: IOS.greenSoft, alignSelf: 'flex-start' }, squircle]}
            className="flex-row items-center mt-2 px-2.5 py-1 rounded-full"
          >
            <View
              style={{ backgroundColor: IOS.green }}
              className="w-2 h-2 rounded-full mr-1.5"
            />
            <Text
              style={{ fontSize: getFontSize(12), color: '#248A3D' }}
              className="font-semibold"
            >
              Active Sessions
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color={IOS.secondaryLabel} />
          </View>
        ) : queueList.length === 0 ? (
          /* No Active Token Card */
          <View
            style={[cardShadow, cardEdge, squircle]}
            className="mx-4 mt-6 bg-white rounded-[24px] px-6 py-10 items-center"
          >
            <View
              style={{ backgroundColor: IOS.blueSoft }}
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
            >
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={38} color={IOS.blue} />
            </View>
            <Text
              style={{ fontSize: getFontSize(19), color: IOS.label }}
              className="font-semibold text-center"
            >
              No Active Token Found
            </Text>
            <Text
              style={{ fontSize: getFontSize(14), color: IOS.secondaryLabel }}
              className="text-center mt-2 leading-5"
            >
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
              <View
                key={queueData.id || queueData.tokenId || index}
                style={[cardShadow, cardEdge, squircle]}
                className="mx-4 mt-4 bg-white rounded-[24px] overflow-hidden"
              >
                {/* Clinic Info Header */}
                <View
                  style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: IOS.separator }}
                  className="flex-row items-center px-4 py-3.5"
                >
                  <View
                    style={[{ backgroundColor: IOS.blue }, squircle]}
                    className="w-10 h-10 rounded-[12px] items-center justify-center mr-3"
                  >
                    <MaterialCommunityIcons name="hospital-building" size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: getFontSize(16), color: IOS.label, letterSpacing: -0.2 }}
                      className="font-semibold"
                    >
                      {clinicName}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: getFontSize(12), color: IOS.secondaryLabel }}
                      className="mt-0.5"
                    >
                      {hospitalName} · {roomNo}
                    </Text>
                  </View>
                </View>

                {/* Main Ticket Section */}
                <View className="p-4">
                  <View
                    style={[{ backgroundColor: IOS.blueSoft }, squircle]}
                    className="rounded-[20px] py-4 mb-4"
                  >
                    <Text
                      style={{ fontSize: getFontSize(11), color: IOS.blue, letterSpacing: 0.8 }}
                      className="text-center font-semibold uppercase"
                    >
                      {t?.yourTokenNumber || 'YOUR TOKEN NUMBER'}
                    </Text>
                    <Text
                      style={{ fontSize: getFontSize(48), color: IOS.label, letterSpacing: -1 }}
                      className="text-center font-bold mt-1"
                    >
                      {queueData.tokenNo || queueData.tokenSequence || '---'}
                    </Text>
                  </View>

                  {/* Grid Cards (Now Serving & Est. Wait Time) */}
                  <View className="flex-row gap-3 mb-4">
                    {/* Now Serving Card */}
                    <View
                      style={[{ backgroundColor: IOS.blue }, squircle]}
                      className="flex-1 rounded-[20px] p-4 justify-between min-h-[124px]"
                    >
                      <Text
                        style={{ fontSize: getFontSize(11), color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 }}
                        className="font-semibold uppercase"
                      >
                        {t?.nowServing || 'NOW SERVING'}
                      </Text>
                      <Text style={{ fontSize: getFontSize(30) }} className="font-bold text-white">
                        {queueData.nowServingToken}
                      </Text>
                      <Text
                        style={{ fontSize: getFontSize(11), color: 'rgba(255,255,255,0.85)' }}
                        className="leading-4"
                      >
                        {t?.doctorWithPatient || 'Doctor is currently with patient'}
                      </Text>
                    </View>

                    {/* Est. Wait Time Card */}
                    <View
                      style={[{ backgroundColor: IOS.fill }, squircle]}
                      className="flex-1 rounded-[20px] p-4 justify-between min-h-[124px]"
                    >
                      <Text
                        style={{ fontSize: getFontSize(11), color: IOS.secondaryLabel, letterSpacing: 0.5 }}
                        className="font-semibold uppercase"
                      >
                        {t?.estWaitTime || 'EST. WAIT TIME'}
                      </Text>
                      <View className="flex-row items-baseline">
                        <Text style={{ fontSize: getFontSize(28), color: IOS.label }} className="font-bold">
                          ~ {queueData.estimatedWaitMinutes || 0}{' '}
                        </Text>
                        <Text style={{ fontSize: getFontSize(15), color: IOS.label }} className="font-semibold">
                          mins
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={13} color={IOS.secondaryLabel} />
                        <Text
                          style={{ fontSize: getFontSize(11), color: IOS.secondaryLabel }}
                          className="font-medium ml-1"
                        >
                          Live Estimate
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Patients Ahead Row */}
                  <View
                    style={[{ backgroundColor: IOS.fill }, squircle]}
                    className="rounded-[18px] px-3.5 py-3 flex-row items-center justify-between mb-4"
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        style={{ backgroundColor: IOS.blue }}
                        className="w-8 h-8 rounded-full justify-center items-center mr-2.5"
                      >
                        <FontAwesome5 name="users" size={12} color="#ffffff" />
                      </View>
                      <Text
                        style={{ fontSize: getFontSize(13), color: IOS.label }}
                        className="font-semibold flex-1"
                      >
                        {queueData.patientsAhead !== undefined ? queueData.patientsAhead : 0} PATIENTS AHEAD OF YOU
                      </Text>
                    </View>
                    <View className="bg-white px-2.5 py-1 rounded-full ml-2">
                      <Text style={{ fontSize: getFontSize(11), color: IOS.secondaryLabel }} className="font-semibold">
                        {queueData.opdId || 'OPD'}
                      </Text>
                    </View>
                  </View>

                  {/* Queue Progress (inset grouped list) */}
                  <View className="flex-row justify-between items-center px-1 mb-2">
                    <View className="flex-row items-center">
                      <MaterialIcons name="format-list-numbered" size={18} color={IOS.label} />
                      <Text
                        style={{ fontSize: getFontSize(16), color: IOS.label, letterSpacing: -0.2 }}
                        className="font-semibold ml-2"
                      >
                        {t?.queueProgress || 'Queue Progress'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: getFontSize(12), color: IOS.secondaryLabel }} className="font-medium">
                      Active Tokens
                    </Text>
                  </View>

                  {/* Dynamic Queue List */}
                  <View
                    style={[{ backgroundColor: IOS.fill }, squircle]}
                    className="rounded-[18px] overflow-hidden"
                  >
                    {queueData.liveQueueData && queueData.liveQueueData.length > 0 ? (
                      queueData.liveQueueData.map((item, qIdx) => {
                        const isLast = qIdx === queueData.liveQueueData.length - 1;
                        return (
                          <View
                            key={qIdx}
                            style={{
                              backgroundColor: item.isUser
                                ? '#DCEBFF'
                                : item.isCurrent
                                ? '#EAF3FF'
                                : '#FFFFFF',
                              borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                              borderBottomColor: IOS.separator,
                            }}
                            className="flex-row justify-between items-center px-3.5 py-3"
                          >
                            <View className="flex-row items-center">
                              <MaterialCommunityIcons
                                name={item.isUser ? 'account-box-outline' : 'clock-outline'}
                                size={20}
                                color={item.isCurrent || item.isUser ? IOS.blue : '#AEAEB2'}
                              />
                              <Text
                                style={{
                                  fontSize: getFontSize(15),
                                  color: item.isCurrent || item.isUser ? IOS.blue : IOS.label,
                                }}
                                className="ml-3 font-semibold"
                              >
                                {item.token}
                              </Text>
                            </View>

                            {/* Status Badges */}
                            {item.isCurrent ? (
                              <View style={{ backgroundColor: IOS.blue }} className="px-2.5 py-1 rounded-full">
                                <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-white">
                                  {t?.statusCurrent || 'CURRENT'}
                                </Text>
                              </View>
                            ) : item.isUser ? (
                              <View style={{ backgroundColor: IOS.blue }} className="px-2.5 py-1 rounded-full">
                                <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-white">
                                  {t?.statusYou || 'YOU'}
                                </Text>
                              </View>
                            ) : (
                              <Text
                                style={{
                                  fontSize: getFontSize(11),
                                  color: item.rawStatus === 'in-consultation' ? IOS.blue : IOS.secondaryLabel,
                                }}
                                className="font-semibold"
                              >
                                {item.status}
                              </Text>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <Text
                        style={{ fontSize: getFontSize(13), color: IOS.secondaryLabel }}
                        className="text-center py-4 bg-white"
                      >
                        No queue details available.
                      </Text>
                    )}
                  </View>

                  {/* Footer Status Message */}
                  <View className="flex-row items-center justify-center mt-4">
                    <Ionicons name="checkmark-circle" size={14} color={IOS.green} />
                    <Text
                      style={{ fontSize: getFontSize(11), color: IOS.secondaryLabel }}
                      className="font-semibold ml-1 uppercase"
                    >
                      {t?.queueStatusMoving || 'QUEUE IS MOVING'}
                    </Text>
                    <Text
                      style={{ fontSize: getFontSize(10), color: '#AEAEB2' }}
                      className="font-medium ml-2 uppercase"
                    >
                      UPDATED: {queueData.lastUpdatedTime}
                    </Text>
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
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full justify-center items-center z-50"
        style={{
          backgroundColor: IOS.blue,
          elevation: 8,
          shadowColor: IOS.blue,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
        }}
      >
        <MaterialCommunityIcons name="robot-outline" size={28} color="#ffffff" />

        {/* Green Online Indicator */}
        <View
          style={{ backgroundColor: IOS.green }}
          className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white"
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}