import React, { useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PatientDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { getFontSize, t } = useSettings();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueList, setQueueList] = useState([]);

  // Cancel කිරීම සඳහා අවශ්‍ය Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedTokenForCancel, setSelectedTokenForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Common quick cancel reasons for better UX
  const quickReasons = [
    'Doctor visit postponed',
    'Wrong clinic selected',
    'Feeling better now',
    'Emergency came up'
  ];

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

  // Token එක Cancel කිරීමට API Call එක යැවීම
  const handleConfirmCancel = async () => {
    if (!selectedTokenForCancel) return;

    try {
      setCancelling(true);
      const tokenId = selectedTokenForCancel.tokenId || selectedTokenForCancel.id;
      
      const res = await API.delete(`/tokens/${tokenId}`, {
        data: { cancelReason: cancelReason || 'Cancelled by user from dashboard' }
      });

      if (res.data && res.data.success) {
        Alert.alert('Success', 'Token cancelled successfully.');
        setCancelModalVisible(false);
        setSelectedTokenForCancel(null);
        setCancelReason('');
        fetchMyQueueStatus(); // List එක refresh කරගැනීම
      }
    } catch (error) {
      console.error('Cancel Error:', error?.response?.data || error.message);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to cancel token.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-100">
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="pt-12 pb-24 px-5">
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

            {/* Right side buttons: Profile Avatar only */}
            <View className="flex-row items-center space-x-2">
              {/* User Profile Avatar */}
              <TouchableOpacity 
                onPress={logout}
                className="w-10 h-10 bg-blue-600 rounded-full justify-center items-center shadow-sm"
              >
                <Text style={{ fontSize: getFontSize(16) }} className="text-white font-bold">
                  {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </TouchableOpacity>
            </View>
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
          <View className="mb-3 flex-row justify-between items-center">
            <Text style={{ fontSize: getFontSize(14) }} className="text-slate-500 font-bold uppercase tracking-wider">
              {t?.activeTokens || 'Active Queue Tokens'}
            </Text>
            {queueList.length > 0 && (
              <View className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                <Text style={{ fontSize: getFontSize(11) }} className="text-blue-600 font-bold">
                  {queueList.length} Active
                </Text>
              </View>
            )}
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
              
              // Token එක cancel කළ හැකිද යන්න පරීක්ෂා කිරීම (waiting හෝ සෙසු active තත්ත්වයන්හිදී පමණක්)
              const tokenStatus = queueData.status ? queueData.status.toLowerCase() : 'waiting';
              const canCancel = ['waiting', 'hold'].includes(tokenStatus);

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
                    <View className="flex-row justify-between items-center mb-1">
                      <Text style={{ fontSize: getFontSize(14) }} className="text-blue-600 font-bold">
                        🏥 {displayClinicName}
                      </Text>
                      {/* Status Badge */}
                      <View className={`px-2.5 py-0.5 rounded-full ${tokenStatus === 'hold' ? 'bg-amber-100 border border-amber-200' : 'bg-blue-50 border border-blue-100'}`}>
                        <Text style={{ fontSize: getFontSize(10) }} className={`font-bold uppercase ${tokenStatus === 'hold' ? 'text-amber-700' : 'text-blue-600'}`}>
                          {tokenStatus}
                        </Text>
                      </View>
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

                    {/* --- CANCEL TOKEN BUTTON (Waiting හෝ Hold තත්ත්වයේදී පමණක් පෙන්වයි) --- */}
                    {canCancel && (
                      <TouchableOpacity 
                        onPress={() => {
                          setSelectedTokenForCancel(queueData);
                          setCancelModalVisible(true);
                        }}
                        className="bg-red-50 border border-red-200 py-3 rounded-2xl items-center justify-center flex-row space-x-2 mt-2"
                      >
                        <Text style={{ fontSize: getFontSize(14) }} className="text-red-600 font-bold">
                          ❌ Cancel This Token
                        </Text>
                      </TouchableOpacity>
                    )}

                  </View>

                </View>
              );
            })
          ) : (
            // Active tokens නොමැති විට පෙන්වන කොටස (Advanced empty state design)
            <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 items-center">
              <View className="w-16 h-16 bg-blue-50 rounded-full justify-center items-center mb-3">
                <Text style={{ fontSize: getFontSize(28) }}>📋</Text>
              </View>
              <Text style={{ fontSize: getFontSize(16) }} className="text-slate-800 font-bold mb-1">
                No Active Tokens
              </Text>
              <Text style={{ fontSize: getFontSize(13) }} className="text-slate-400 text-center mb-4">
                You don't have any active queue tokens right now. Use the button above to get a new one.
              </Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* ======================================================== */}
      {/* FLOATING CHATBOT BUTTON (Bottom Right Corner - නම 'Chatbot' ලෙස යොදා ඇත) */}
      {/* ======================================================== */}
{/* ======================================================== */}
{/* FLOATING CHATBOT BUTTON */}
{/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* CANCEL CONFIRMATION MODAL (Advanced Modal with Quick Chips) */}
      {/* ======================================================== */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl border border-slate-100">
            
            {/* Modal Header Icon */}
            <View className="w-12 h-12 bg-red-100 rounded-full justify-center items-center mb-4 self-center">
              <Text style={{ fontSize: getFontSize(22) }}>⚠️</Text>
            </View>

            <Text style={{ fontSize: getFontSize(18) }} className="text-slate-900 font-bold text-center mb-1">
              Confirm Cancellation
            </Text>
            <Text style={{ fontSize: getFontSize(13) }} className="text-slate-500 text-center mb-4">
              Are you sure you wish to cancel your token? You will need to book a new one if you change your mind.
            </Text>

            {/* Selected Token details preview box */}
            {selectedTokenForCancel && (
              <View className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                <Text style={{ fontSize: getFontSize(12) }} className="text-slate-500 font-bold">
                  Token No: <Text className="text-blue-600">{selectedTokenForCancel.tokenNo || selectedTokenForCancel.tokenSequence}</Text>
                </Text>
                <Text style={{ fontSize: getFontSize(12) }} className="text-slate-500 font-bold mt-1">
                  Clinic/OPD: <Text className="text-slate-800">{selectedTokenForCancel.clinicName || selectedTokenForCancel.department || selectedTokenForCancel.opdName || 'General'}</Text>
                </Text>
              </View>
            )}

            {/* Quick Reason Suggestions (Chips) */}
            <View className="mb-3">
              <Text style={{ fontSize: getFontSize(11) }} className="text-slate-400 font-bold mb-2 uppercase tracking-wide">
                Quick Reason Select:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-1.5 mb-2">
                {quickReasons.map((reason, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setCancelReason(reason)}
                    className={`px-3 py-1.5 rounded-full border mr-1.5 ${cancelReason === reason ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <Text style={{ fontSize: getFontSize(11) }} className={`font-medium ${cancelReason === reason ? 'text-white' : 'text-slate-600'}`}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Custom Reason Input */}
            <TextInput
              placeholder="Or type a custom reason..."
              placeholderTextColor="#94a3b8"
              value={cancelReason}
              onChangeText={setCancelReason}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-5 text-sm"
            />

            {/* Modal Actions */}
            <View className="flex-row space-x-3">
              <TouchableOpacity 
                disabled={cancelling}
                onPress={() => {
                  setCancelModalVisible(false);
                  setSelectedTokenForCancel(null);
                  setCancelReason('');
                }}
                className="flex-1 bg-slate-200 py-3.5 rounded-xl items-center justify-center"
              >
                <Text style={{ fontSize: getFontSize(14) }} className="text-slate-700 font-bold">
                  Keep Token
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                disabled={cancelling}
                onPress={handleConfirmCancel}
                className="flex-1 bg-red-600 py-3.5 rounded-xl items-center justify-center shadow-sm"
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: getFontSize(14) }} className="text-white font-bold">
                    Yes, Cancel
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}