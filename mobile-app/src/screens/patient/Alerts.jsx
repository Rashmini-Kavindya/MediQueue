import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';
import AppHeader from '../../components/AppHeader'; // Reusable Header එක import කිරීම

// iOS system colors - blue as accent, soft grouped background + white cards
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  orange: '#FF9500',
  orangeSoft: 'rgba(255,149,0,0.14)',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
  separator: '#E4E4EA',
  groupedBg: '#F4F5F9',
  white: '#FFFFFF',
};

// iOS style soft shadow for cards
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

// Shared layout bits
const cardBase = { backgroundColor: IOS.white, borderRadius: 22, padding: 18, marginBottom: 14 };
const iconBox = { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 };
const BODY_INDENT = 52; // icon width (40) + margin (12)

export default function Alerts({ navigation }) {
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

  const patientName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: IOS.groupedBg }}>
      {/* Reusable AppHeader එක මෙතැනට ඇතුළත් කර ඇත */}
      <AppHeader
        userName={patientName}
        onNotificationPress={() => {
          // දැනට Alerts page එකේදීම සිටී
        }}
        onPrescriptionPress={() => {
          console.log('Prescription icon pressed');
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={IOS.tertiaryLabel} colors={[IOS.blue]} />}
      >

        {loading ? (
          <View style={{ paddingVertical: 80, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={IOS.tertiaryLabel} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>

            {/* Page title */}
            <Text style={{ fontSize: getFontSize(28), color: IOS.label, fontWeight: '700', letterSpacing: 0.3, marginBottom: 16, paddingHorizontal: 2 }}>
              Alerts
            </Text>

            {newAlerts.length === 0 ? (
              <View style={[{ backgroundColor: IOS.white, borderRadius: 22, paddingVertical: 36, alignItems: 'center', marginBottom: 14 }, cardShadow]}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: IOS.fill, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="notifications-off-outline" size={26} color={IOS.tertiaryLabel} />
                </View>
                <Text style={{ fontSize: getFontSize(14), color: IOS.tertiaryLabel, fontWeight: '500' }}>
                  No new alerts
                </Text>
              </View>
            ) : (
              newAlerts.map((item) => {
                // 1. YOUR TURN CARD
                if (item.type === 'YOUR_TURN') {
                  return (
                    <View key={item.id} style={[cardBase, cardShadow]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[iconBox, { backgroundColor: IOS.blue }]}>
                            <Ionicons name="notifications" size={19} color="#fff" />
                          </View>
                          <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '700' }}>
                            Your turn
                          </Text>
                        </View>
                        <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '500' }}>{item.time}</Text>
                      </View>

                      <View style={{ marginLeft: BODY_INDENT }}>
                        <Text style={{ fontSize: getFontSize(15), color: IOS.label, fontWeight: '600', lineHeight: 21 }}>
                          Please proceed to <Text style={{ color: IOS.blue }}>{item.room}.</Text>
                        </Text>
                        <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, marginTop: 4, lineHeight: 19 }}>
                          - {item.location} {'\n'}{item.doctor}
                        </Text>

                        <View style={{ flexDirection: 'row', marginTop: 16 }}>
                          <TouchableOpacity activeOpacity={0.85} style={{ backgroundColor: IOS.blue, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginRight: 10 }}>
                            <Text style={{ fontSize: getFontSize(13), color: '#fff', fontWeight: '600' }}>
                              View directions
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDismiss(item.id)}
                            activeOpacity={0.7}
                            style={{ backgroundColor: IOS.fill, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 }}
                          >
                            <Text style={{ fontSize: getFontSize(13), color: IOS.secondaryLabel, fontWeight: '600' }}>
                              Dismiss
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
                    <View key={item.id} style={[cardBase, cardShadow]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[iconBox, { backgroundColor: IOS.orangeSoft }]}>
                            <Feather name="clock" size={19} color={IOS.orange} />
                          </View>
                          <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '700' }}>
                            Your turn is near
                          </Text>
                        </View>
                        <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '500' }}>{item.time}</Text>
                      </View>

                      <View style={{ marginLeft: BODY_INDENT }}>
                        <Text style={{ fontSize: getFontSize(14), color: IOS.secondaryLabel, lineHeight: 21 }}>
                          <Text style={{ fontWeight: '700', color: IOS.label }}>
                            {item.remainingNumbers} numbers remaining.
                          </Text>{' '}
                          {item.message || 'Please return to the OPD waiting area immediately.'}
                        </Text>

                        <View style={{ marginTop: 14, alignSelf: 'flex-start', backgroundColor: IOS.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: IOS.orange, marginRight: 8 }} />
                          <Text style={{ fontSize: getFontSize(12), color: IOS.secondaryLabel, fontWeight: '600' }}>
                            Current serving: {item.currentServing} ({item.aheadCount} ahead)
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }

                // 3. QUEUE UPDATE CARD
                return (
                  <View key={item.id} style={[cardBase, cardShadow]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[iconBox, { backgroundColor: IOS.fill }]}>
                          <Ionicons name="clipboard-outline" size={19} color={IOS.secondaryLabel} />
                        </View>
                        <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '700' }}>
                          Queue update
                        </Text>
                      </View>
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '500' }}>{item.time}</Text>
                    </View>

                    <View style={{ marginLeft: BODY_INDENT, marginTop: 6 }}>
                      <Text style={{ fontSize: getFontSize(14), color: IOS.secondaryLabel, lineHeight: 21 }}>
                        {item.message || 'Queue progress updated for your active booking.'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* Older Notifications Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 14 }}>
              <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, fontWeight: '600', marginRight: 12 }}>
                Older notifications
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: IOS.separator }} />
            </View>

            {olderAlerts.length === 0 ? (
              <View style={{ paddingVertical: 8 }} />
            ) : (
              olderAlerts.map((item) => (
                <View key={item.id} style={{ backgroundColor: IOS.white, borderRadius: 16, padding: 16, opacity: 0.65, marginBottom: 10 }}>
                  <Text style={{ fontSize: getFontSize(13), color: IOS.secondaryLabel, lineHeight: 19 }}>{item.message}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      
    </SafeAreaView>
  );
}