import React, { useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';

export default function PatientDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { getFontSize, t } = useSettings();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueList, setQueueList] = useState([]);

  // Backend API එකෙන් Patientගේ Active Queues ලැයිස්තුව ලබා ගැනීම
  const fetchMyQueueStatus = async () => {
    try {
      const res = await API.get('/queue/my-status');
      console.log('Queue Status Response:', res.data);

      if (res.data && res.data.success) {
        const data = res.data.data;
        if (Array.isArray(data)) {
          setQueueList(data);
        } else if (data) {
          setQueueList([data]);
        } else {
          setQueueList([]);
        }
      } else {
        setQueueList([]);
      }
    } catch (error) {
      console.log('Error fetching queue status:', error?.response?.data?.message || error.message);
      setQueueList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyQueueStatus();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyQueueStatus();
  };

  return (
    <ScrollView 
      className="flex-1 bg-slate-100"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="pt-12 pb-8 px-5">
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center space-x-2">
            <View className="w-8 h-8 bg-blue-600 rounded-lg justify-center items-center">
              <Text style={{ fontSize: getFontSize(20) }} className="text-white font-black">+</Text>
            </View>
            <View>
              <Text style={{ fontSize: getFontSize(12) }} className="text-blue-600 font-bold tracking-widest">
                {t?.appTitle || 'MEDIQUEUE'}
              </Text>
              <Text style={{ fontSize: getFontSize(20) }} className="text-slate-900 font-bold leading-5">
                {t?.home || 'Home'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={logout}
            className="w-10 h-10 bg-blue-600 rounded-full justify-center items-center shadow-sm"
          >
            <Text style={{ fontSize: getFontSize(16) }} className="text-white font-bold">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Greeting & Verification Badge */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 font-bold tracking-wider uppercase">
              {t?.goodMorning || 'GOOD MORNING'}
            </Text>
            <Text style={{ fontSize: getFontSize(24) }} className="text-slate-900 font-black">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User'}
            </Text>
          </View>

          <View className="bg-blue-100/80 px-3 py-1.5 rounded-full flex-row items-center space-x-1 border border-blue-200">
            <Text style={{ fontSize: getFontSize(12) }} className="text-blue-600 font-bold">
              🛡 {t?.nicVerified || 'NIC Verified'}
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* ඉහළින්ම පේන ප්‍රධාන "Get New Token" බටන් එක (Quick Action Banner) */}
        {/* ======================================================== */}
        <TouchableOpacity 
          onPress={() => navigation?.navigate('RequestNewToken')}
          className="bg-blue-600 p-4 rounded-2xl mb-6 flex-row items-center justify-between shadow-md shadow-blue-200"
        >
          <View className="flex-row items-center space-x-3">
            <View className="w-10 h-10 bg-white/20 rounded-xl justify-center items-center">
              <Text style={{ fontSize: getFontSize(20) }} className="text-white font-bold">🎫</Text>
            </View>
            <View>
              <Text style={{ fontSize: getFontSize(16) }} className="text-white font-bold">
                {t?.getNewToken || 'Get New Token'}
              </Text>
              <Text style={{ fontSize: getFontSize(12) }} className="text-blue-100 font-medium">
                {t?.bookOrJoinQueue || 'Book a clinic or join an OPD queue'}
              </Text>
            </View>
          </View>
          <View className="w-8 h-8 bg-white/20 rounded-full justify-center items-center">
            <Text style={{ fontSize: getFontSize(16) }} className="text-white font-bold">›</Text>
          </View>
        </TouchableOpacity>

        {/* Active Queues Section Header */}
        <View className="mb-3">
          <Text style={{ fontSize: getFontSize(14) }} className="text-slate-500 font-bold uppercase tracking-wider">
            {t?.activeTokens || 'Active Queue Tokens'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" className="my-10" />
        ) : queueList.length > 0 ? (
          // Active Tokens ලැයිස්තුව පෙන්වීම
          queueList.map((queueData, index) => {
            const displayClinicName = queueData.clinicName || queueData.department || queueData.opdName || 'GENERAL MEDICINE';
            const displayRoom = queueData.room || queueData.roomNo || 'Room 04';
            const displayHospital = queueData.hospital || 'National Hospital Colombo • OPD Block B';
            const displayCurrentToken = queueData.currentToken || queueData.nowServing || queueData.status || 'In Progress';

            return (
              <View key={queueData.id || queueData.tokenId || index} className="mb-6">
                
                {/* Location & Room Info Card */}
                <View className="bg-white p-4 rounded-2xl mb-3 flex-row items-center shadow-sm border border-slate-100 space-x-3">
                  <View className="w-10 h-10 bg-blue-50 rounded-xl justify-center items-center">
                    <Text style={{ fontSize: getFontSize(18) }} className="text-blue-600 font-bold">🏥</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center space-x-2">
                      <Text style={{ fontSize: getFontSize(16) }} className="text-slate-900 font-bold">
                        {displayClinicName}
                      </Text>
                      <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                        <Text style={{ fontSize: getFontSize(12) }} className="text-slate-600 font-semibold">
                          {displayRoom}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 font-medium mt-0.5">
                      {displayHospital}
                    </Text>
                  </View>
                </View>

                {/* Main Ticket & Queue Info Section */}
                <View className="bg-white rounded-3xl p-5 shadow-sm border-t-4 border-t-blue-600 border border-slate-100 space-y-4">
                  <View className="flex-row items-center space-x-1 mb-1">
                    <Text style={{ fontSize: getFontSize(14) }} className="text-blue-600 font-bold">
                      🏥 {displayClinicName}
                    </Text>
                  </View>

                  {/* Token Number Card */}
                  <View className="bg-slate-50 py-6 rounded-2xl items-center border border-slate-100">
                    <Text style={{ fontSize: getFontSize(12) }} className="text-slate-500 font-bold tracking-widest uppercase mb-1">
                      {t?.yourToken || 'YOUR TOKEN'}
                    </Text>
                    <Text style={{ fontSize: getFontSize(48) }} className="text-blue-600 font-black tracking-tight">
                      {queueData.tokenNo || queueData.tokenSequence || 'N/A'}
                    </Text>
                  </View>

                  {/* Status Grid Cards */}
                  <View className="flex-row space-x-3">
                    {/* Now Serving */}
                    <View className="flex-1 bg-slate-50 p-4 rounded-2xl items-center border border-slate-100">
                      <View className="flex-row items-center space-x-1 mb-1">
                        <Text style={{ fontSize: getFontSize(12) }} className="text-emerald-500 font-bold">
                          ✓ {t?.nowServing || 'NOW SERVING'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(22) }} className="text-emerald-700 font-black my-0.5 text-center capitalize" numberOfLines={1}>
                        {displayCurrentToken}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 font-medium">
                        {displayRoom ? `${displayRoom} door` : 'Room door'}
                      </Text>
                    </View>

                    {/* Ahead of You */}
                    <View className="flex-1 bg-slate-50 p-4 rounded-2xl items-center border border-slate-100">
                      <View className="flex-row items-center space-x-1 mb-1">
                        <Text style={{ fontSize: getFontSize(12) }} className="text-blue-600 font-bold">
                          👥 {t?.aheadOfYuo || 'AHEAD OF YOU'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(30) }} className="text-blue-600 font-black my-0.5">
                        {queueData.patientsAhead !== undefined ? queueData.patientsAhead : 0}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12) }} className="text-slate-400 font-medium">
                        {t?.patientsQueued || 'Patients queued'}
                      </Text>
                    </View>
                  </View>

                  {/* Estimated Wait Time Banner */}
                  <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <View className="flex-row justify-between items-center mb-1">
                      <View className="flex-row items-center space-x-1.5">
                        <Text style={{ fontSize: getFontSize(16) }} className="text-blue-600">🕒</Text>
                        <Text style={{ fontSize: getFontSize(14) }} className="text-slate-700 font-bold">
                          {t?.estimatedWait || 'Estimated Wait:'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(16) }} className="text-blue-600 font-black">
                        {queueData.estimatedWaitMinutes !== undefined
                          ? `${queueData.estimatedWaitMinutes} MIN` 
                          : 'N/A'}
                      </Text>
                    </View>
                    <View className="flex-row items-center space-x-2 mt-1">
                      <View className="w-2 h-2 rounded-full bg-emerald-500" />
                      <Text style={{ fontSize: getFontSize(12) }} className="text-emerald-600 font-medium">
                        {t?.queueMovingSteadily || 'Queue is moving steadily'}
                      </Text>
                    </View>
                  </View>

                  {/* View Live Queue Button */}
                  <TouchableOpacity 
                    onPress={() => navigation?.navigate('LiveQueue', { opdId: queueData?.opdId })}
                    className="bg-slate-900 py-4 rounded-2xl items-center justify-center flex-row space-x-2 shadow-sm"
                  >
                    <Text style={{ fontSize: getFontSize(16) }} className="text-white font-bold">
                      {t?.viewLiveQueue || 'View Live Queue'}
                    </Text>
                    <Text style={{ fontSize: getFontSize(16) }} className="text-white font-bold">›</Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        ) : (
          // Active tokens නොමැති විට පෙන්වන කොටස
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6">
            <View className="py-8 items-center bg-slate-50 rounded-2xl">
              <Text style={{ fontSize: getFontSize(14) }} className="text-slate-500 font-medium">
                {t?.noActiveQueue || 'No active queue tokens found.'}
              </Text>
            </View>
          </View>
        )}

      </View>
    </ScrollView>
  );
}