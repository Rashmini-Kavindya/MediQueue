import React, { useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader'; // සාදාගත් Reusable Header එක import කිරීම

// iOS system colors - blue as accent, soft grouped background + white cards
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.12)',
  orange: '#FF9500',
  orangeSoft: 'rgba(255,149,0,0.14)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.08)',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
  separator: '#E9E9EE',
  groupedBg: '#F2F2F7',
  white: '#FFFFFF',
};

// iOS style soft shadow for cards
const cardShadow = {
  shadowColor: '#0B1B3A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 2,
};

// iOS squircle corners + hairline edge (Android වල ignore වෙනවා)
const squircle = { borderCurve: 'continuous' };
const edge = { borderWidth: 0.5, borderColor: 'rgba(60,60,67,0.12)' };

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

  // Userගේ නම ලබා ගැනීම
  const patientName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User';

  return (
    // SafeAreaView: Header එක status bar එකට යටින් යන එක නවත්වයි (අනිත් screens වල වගේම)
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: IOS.white }}>
    <View style={{ flex: 1, backgroundColor: IOS.groupedBg }}>
      {/* Reusable Header එක මෙතැනට ඇතුළත් කර ඇත */}
      <AppHeader
        userName={patientName}
        onNotificationPress={() => navigation?.navigate('Alerts')}
        onPrescriptionPress={() => {
          console.log('Prescription icon pressed');
        }}
      />

      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={IOS.tertiaryLabel} colors={[IOS.blue]} />}
      >
        <View style={{ paddingTop: 18, paddingBottom: 110, paddingHorizontal: 16 }}>

          {/* Greeting & Verification Badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingHorizontal: 4 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, fontWeight: '500' }}>
                {t?.goodMorning || 'Good morning'}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: getFontSize(26), color: IOS.label, fontWeight: '700', letterSpacing: 0.2 }}>
                {patientName}
              </Text>
            </View>

            <View style={{ backgroundColor: IOS.greenSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="shield-check" size={14} color={IOS.green} />
              <Text style={{ fontSize: getFontSize(12), color: '#248A3D', fontWeight: '600', marginLeft: 4 }}>
                {t?.nicVerified || 'NIC Verified'}
              </Text>
            </View>
          </View>

          {/* ======================================================== */}
          {/* ඉහළින්ම පේන ප්‍රධාන "Get New Token" බටන් එක (Quick Action Banner) */}
          {/* ======================================================== */}
          <TouchableOpacity 
            onPress={() => navigation?.navigate('RequestNewToken')}
            activeOpacity={0.85}
            style={[{
              backgroundColor: IOS.blue,
              padding: 16,
              borderRadius: 22,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: IOS.blue,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 4,
            }, squircle]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[{ width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, squircle]}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={23} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: getFontSize(17), color: '#fff', fontWeight: '600', letterSpacing: -0.2 }}>
                  {t?.getNewToken || 'Get New Token'}
                </Text>
                <Text style={{ fontSize: getFontSize(13), color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                  {t?.bookOrJoinQueue || 'Book a clinic or join an OPD queue'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          {/* Active Queues Section Header */}
          <View style={{ marginBottom: 12, paddingHorizontal: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: getFontSize(18), color: IOS.label, fontWeight: '700', letterSpacing: -0.2 }}>
              {t?.activeTokens || 'Active Queue Tokens'}
            </Text>
            {queueList.length > 0 && (
              <View style={{ backgroundColor: IOS.blueSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ fontSize: getFontSize(12), color: IOS.blue, fontWeight: '600' }}>
                  {queueList.length} Active
                </Text>
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={IOS.tertiaryLabel} style={{ marginVertical: 40 }} />
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
                <View
                  key={queueData.id || queueData.tokenId || index}
                  style={[{ backgroundColor: IOS.white, borderRadius: 26, marginBottom: 18, padding: 16 }, squircle, edge, cardShadow]}
                >

                  {/* Clinic, Room & Status */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={[{ width: 44, height: 44, backgroundColor: IOS.blueSoft, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, squircle]}>
                      <MaterialCommunityIcons name="hospital-building" size={22} color={IOS.blue} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text numberOfLines={1} style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '600', letterSpacing: -0.2 }}>
                        {displayClinicName}
                      </Text>
                      <Text numberOfLines={1} style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                        {displayRoom} • {displayHospital}
                      </Text>
                    </View>
                    {/* Status Badge */}
                    <View style={{ backgroundColor: tokenStatus === 'hold' ? IOS.orangeSoft : IOS.fill, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                      <Text style={{ fontSize: getFontSize(11), fontWeight: '600', textTransform: 'capitalize', color: tokenStatus === 'hold' ? IOS.orange : IOS.secondaryLabel }}>
                        {tokenStatus}
                      </Text>
                    </View>
                  </View>

                  {/* Token Number */}
                  <View style={[{ backgroundColor: IOS.blueSoft, borderRadius: 20, alignItems: 'center', paddingVertical: 18, marginBottom: 12 }, squircle]}>
                    <Text style={{ fontSize: getFontSize(12), color: IOS.blue, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                      {t?.yourToken || 'Your token'}
                    </Text>
                    <Text style={{ fontSize: getFontSize(44), color: IOS.label, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 }}>
                      {queueData.tokenNo || queueData.tokenSequence || 'N/A'}
                    </Text>
                  </View>

                  {/* Now Serving | Ahead of You */}
                  <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                    <View style={[{ flex: 1, backgroundColor: IOS.surface, padding: 14, borderRadius: 18, alignItems: 'center', marginRight: 6 }, squircle]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <MaterialCommunityIcons name="check-circle" size={14} color={IOS.green} />
                        <Text style={{ fontSize: getFontSize(12), color: IOS.green, fontWeight: '600', marginLeft: 4 }}>
                          {t?.nowServing || 'Now serving'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(21), color: IOS.label, fontWeight: '700', textAlign: 'center', textTransform: 'capitalize' }} numberOfLines={1}>
                        {displayCurrentToken}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                        {displayRoom ? `${displayRoom} door` : 'Room door'}
                      </Text>
                    </View>

                    <View style={[{ flex: 1, backgroundColor: IOS.surface, padding: 14, borderRadius: 18, alignItems: 'center', marginLeft: 6 }, squircle]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <MaterialCommunityIcons name="account-group" size={14} color={IOS.secondaryLabel} />
                        <Text style={{ fontSize: getFontSize(12), color: IOS.secondaryLabel, fontWeight: '600', marginLeft: 4 }}>
                          {t?.aheadOfYuo || 'Ahead of you'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(24), color: IOS.label, fontWeight: '700' }}>
                        {queueData.patientsAhead !== undefined ? queueData.patientsAhead : 0}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                        {t?.patientsQueued || 'Patients queued'}
                      </Text>
                    </View>
                  </View>

                  {/* Estimated Wait Time */}
                  <View style={[{ backgroundColor: IOS.surface, padding: 14, borderRadius: 18, marginBottom: 14 }, squircle]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="clock-outline" size={19} color={IOS.secondaryLabel} />
                        <Text style={{ fontSize: getFontSize(14), color: IOS.secondaryLabel, fontWeight: '500', marginLeft: 8 }}>
                          {t?.estimatedWait || 'Estimated Wait:'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '700' }}>
                        {queueData.estimatedWaitMinutes !== undefined
                          ? `${queueData.estimatedWaitMinutes} MIN` 
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: IOS.green, marginRight: 8 }} />
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '500' }}>
                        {t?.queueMovingSteadily || 'Queue is moving steadily'}
                      </Text>
                    </View>
                  </View>

                  {/* View Live Queue Button */}
                  <TouchableOpacity 
                    onPress={() => navigation?.navigate('LiveQueue', { opdId: queueData?.opdId })}
                    activeOpacity={0.7}
                    style={[{ backgroundColor: IOS.blueSoft, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }, squircle]}
                  >
                    <Text style={{ fontSize: getFontSize(16), color: IOS.blue, fontWeight: '600' }}>
                      {t?.viewLiveQueue || 'View Live Queue'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={IOS.blue} style={{ marginLeft: 2 }} />
                  </TouchableOpacity>

                  {/* --- CANCEL TOKEN BUTTON (Waiting හෝ Hold තත්ත්වයේදී පමණක් පෙන්වයි) --- */}
                  {canCancel && (
                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedTokenForCancel(queueData);
                        setCancelModalVisible(true);
                      }}
                      activeOpacity={0.6}
                      style={[{ paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: IOS.redSoft, borderRadius: 16 }, squircle]}
                    >
                      <Text style={{ fontSize: getFontSize(15), color: IOS.red, fontWeight: '600' }}>
                        Cancel This Token
                      </Text>
                    </TouchableOpacity>
                  )}

                </View>
              );
            })
          ) : (
            // Active tokens නොමැති විට පෙන්වන කොටස (Advanced empty state design)
            <View style={[{ backgroundColor: IOS.white, borderRadius: 26, paddingVertical: 32, paddingHorizontal: 24, marginBottom: 18, alignItems: 'center' }, squircle, edge, cardShadow]}>
              <View style={{ width: 64, height: 64, backgroundColor: IOS.blueSoft, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={30} color={IOS.blue} />
              </View>
              <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '600', marginBottom: 4 }}>
                No Active Tokens
              </Text>
              <Text style={{ fontSize: getFontSize(14), color: IOS.tertiaryLabel, textAlign: 'center', lineHeight: 20 }}>
                You don't have any active queue tokens right now. Use the button above to get a new one.
              </Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Chatbot floating button */}
      <TouchableOpacity
        onPress={() => navigation?.navigate('Chatbot')}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          backgroundColor: IOS.blue,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 8,
          shadowColor: IOS.blue,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          zIndex: 50,
        }}
      >
        <MaterialCommunityIcons name="robot-outline" size={28} color="#ffffff" />
        {/* Green Online Indicator */}
        <View
          style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, backgroundColor: IOS.green, borderRadius: 7, borderWidth: 2, borderColor: '#fff' }}
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <View style={[{ backgroundColor: IOS.white, width: '100%', maxWidth: 360, borderRadius: 28, padding: 22 }, squircle]}>

            {/* Modal Header Icon */}
            <View style={{ width: 52, height: 52, backgroundColor: IOS.redSoft, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 12, alignSelf: 'center' }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={26} color={IOS.red} />
            </View>

            <Text style={{ fontSize: getFontSize(18), color: IOS.label, fontWeight: '700', textAlign: 'center', marginBottom: 6, letterSpacing: -0.2 }}>
              Confirm Cancellation
            </Text>
            <Text style={{ fontSize: getFontSize(14), color: IOS.tertiaryLabel, textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
              Are you sure you wish to cancel your token? You will need to book a new one if you change your mind.
            </Text>

            {/* Selected Token details preview box */}
            {selectedTokenForCancel && (
              <View style={[{ backgroundColor: IOS.surface, padding: 14, borderRadius: 16, marginBottom: 16 }, squircle]}>
                <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, fontWeight: '500' }}>
                  Token No: <Text style={{ color: IOS.label, fontWeight: '700' }}>{selectedTokenForCancel.tokenNo || selectedTokenForCancel.tokenSequence}</Text>
                </Text>
                <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, fontWeight: '500', marginTop: 4 }}>
                  Clinic/OPD: <Text style={{ color: IOS.label, fontWeight: '600' }}>{selectedTokenForCancel.clinicName || selectedTokenForCancel.department || selectedTokenForCancel.opdName || 'General'}</Text>
                </Text>
              </View>
            )}

            {/* Quick Reason Suggestions (Chips) */}
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '500', marginBottom: 8 }}>
                Quick reasons
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                {quickReasons.map((reason, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setCancelReason(reason)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      marginRight: 8,
                      backgroundColor: cancelReason === reason ? IOS.blue : IOS.fill,
                    }}
                  >
                    <Text style={{ fontSize: getFontSize(13), fontWeight: '500', color: cancelReason === reason ? '#fff' : IOS.secondaryLabel }}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Custom Reason Input */}
            <TextInput
              placeholder="Or type a custom reason..."
              placeholderTextColor="#8E8E93"
              value={cancelReason}
              onChangeText={setCancelReason}
              style={[{
                backgroundColor: IOS.fill,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: IOS.label,
                marginBottom: 18,
                fontSize: 15,
              }, squircle]}
            />

            {/* Modal Actions */}
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity 
                disabled={cancelling}
                onPress={() => {
                  setCancelModalVisible(false);
                  setSelectedTokenForCancel(null);
                  setCancelReason('');
                }}
                activeOpacity={0.8}
                style={[{ flex: 1, backgroundColor: IOS.fill, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 6 }, squircle]}
              >
                <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '600' }}>
                  Keep Token
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                disabled={cancelling}
                onPress={handleConfirmCancel}
                activeOpacity={0.8}
                style={[{ flex: 1, backgroundColor: IOS.red, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }, squircle]}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: getFontSize(16), color: '#fff', fontWeight: '600' }}>
                    Yes, Cancel
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
    </SafeAreaView>
  );
}