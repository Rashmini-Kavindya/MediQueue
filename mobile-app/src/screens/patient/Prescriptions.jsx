import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import API from '../../services/api';

const COLORS = { blue: '#007AFF', ink: '#1C1C1E', muted: '#8E8E93', bg: '#F2F2F7', white: '#FFFFFF', line: '#E5E5EA' };

export default function Prescriptions({ navigation }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPrescriptions = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await API.get('/prescriptions/my');
      setPrescriptions(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not load your prescriptions. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPrescriptions(); }, [loadPrescriptions]));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.line }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{ padding: 6, marginRight: 10 }}>
          <Ionicons name="arrow-back" size={23} color={COLORS.blue} />
        </TouchableOpacity>
        <View>
          <Text style={{ color: COLORS.ink, fontSize: 20, fontWeight: '700' }}>My Prescriptions</Text>
          <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Your medicines and doctor instructions</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPrescriptions(true)} tintColor={COLORS.blue} />}>
        {loading ? <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 50 }} /> : error ? (
          <View style={{ alignItems: 'center', padding: 24, backgroundColor: COLORS.white, borderRadius: 18, marginTop: 20 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={34} color="#FF3B30" />
            <Text style={{ color: COLORS.ink, textAlign: 'center', marginTop: 12 }}>{error}</Text>
            <TouchableOpacity onPress={() => loadPrescriptions()} style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: COLORS.blue, borderRadius: 10 }}>
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : prescriptions.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 28, backgroundColor: COLORS.white, borderRadius: 18, marginTop: 20 }}>
            <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(0,122,255,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="file-document-outline" size={30} color={COLORS.blue} />
            </View>
            <Text style={{ color: COLORS.ink, fontSize: 17, fontWeight: '700', marginTop: 14 }}>No prescriptions yet</Text>
            <Text style={{ color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 6 }}>Prescriptions from your completed consultations will appear here.</Text>
          </View>
        ) : prescriptions.map((prescription) => (
          <View key={prescription.prescriptionId} style={{ backgroundColor: COLORS.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: COLORS.ink, fontWeight: '700', fontSize: 15 }}>Prescription</Text>
              <Text style={{ color: COLORS.muted, fontSize: 12 }}>{prescription.prescribedAt ? new Date(prescription.prescribedAt).toLocaleDateString() : ''}</Text>
            </View>
            {(prescription.medicines || []).map((medicine, index) => (
              <View key={`${prescription.prescriptionId}-${index}`} style={{ paddingVertical: 11, borderTopWidth: index === 0 ? 1 : 0, borderTopColor: COLORS.line }}>
                <Text style={{ color: COLORS.ink, fontSize: 15, fontWeight: '600' }}>{medicine.medicineName}</Text>
                <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{[medicine.dosage, medicine.frequency, medicine.duration].filter(Boolean).join(' · ')}</Text>
                {!!medicine.instructions && <Text style={{ color: '#636366', fontSize: 13, marginTop: 4 }}>{medicine.instructions}</Text>}
              </View>
            ))}
            {!!prescription.notes && <View style={{ backgroundColor: COLORS.bg, padding: 12, borderRadius: 12, marginTop: 8 }}><Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '600' }}>DOCTOR'S NOTES</Text><Text style={{ color: COLORS.ink, fontSize: 13, marginTop: 5, lineHeight: 19 }}>{prescription.notes}</Text></View>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
