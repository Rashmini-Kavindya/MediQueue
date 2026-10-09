import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

// iOS system colors - blue as accent, soft grouped background + white cards
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.12)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.10)',
  teal: '#32ADE6',
  tealSoft: 'rgba(50,173,230,0.14)',
  purple: '#5856D6',
  purpleSoft: 'rgba(88,86,214,0.12)',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  chevron: '#C7C7CC',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
  separator: '#E9E9EE',
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

export default function RequestNewToken({ navigation }) {
  const { user } = useContext(AuthContext);
  const { getFontSize } = useSettings();

  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchOpds();
    fetchProfile();
  }, []);

  // Patientගේ real data ලබා ගැනීම
  const fetchProfile = async () => {
    try {
      const res = await API.get('/users/me');
      if (res.data && res.data.success) {
        setProfile(res.data.data);
      }
    } catch (error) {
      console.log('Error fetching patient profile:', error?.response?.data?.message || error.message);
    }
  };

  const fetchOpds = async () => {
    try {
      setLoading(true);
      const response = await API.get('/opds');
      if (response.data.success) {
        const formattedClinics = response.data.data.map((opd, index) => ({
          id: opd.opdId,
          name: opd.name,
          room: opd.roomId || 'Room 01',
          floor: opd.department || 'Floor 01',
          wait: `~${opd.avgConsultMinutes || 15} min`,
          selected: index === 1,
        }));
        setClinics(formattedClinics);
      }
    } catch (error) {
      console.error('Error fetching OPDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClinic = (id) => {
    setClinics(clinics.map(c => ({
      ...c,
      selected: c.id === id
    })));
  };

  const handleContinue = () => {
    const selectedClinic = clinics.find(c => c.selected);
    if (!selectedClinic) return;
    
    navigation.navigate('ConfirmNewToken', {
      selectedClinic,
      reason,
    });
  };

  // Patient display values (real data from /users/me, falls back to logged in user)
  const patientName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'User';
  const patientNic = profile?.nic || user?.nic || '';
  const patientIdText = profile?.patientId || user?.patientId || '';
  const patientInitials =
    patientName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || 'U';
  const patientIdLine =
    [patientNic ? `NIC: ${patientNic}` : '', patientIdText].filter(Boolean).join(' • ') || 'ID not available';
  const isNicVerified = Boolean(patientNic);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: IOS.groupedBg }}>
      {/* Top Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={[{ width: 38, height: 38, borderRadius: 19, backgroundColor: IOS.white, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, cardShadow]}
          >
            <Ionicons name="chevron-back" size={22} color={IOS.blue} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '600' }}>
              MediQueue OPD
            </Text>
            <Text style={{ fontSize: getFontSize(22), color: IOS.label, fontWeight: '700', letterSpacing: 0.3 }}>
              Request New Token
            </Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.7} style={{ width: 38, height: 38, backgroundColor: IOS.blueSoft, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="add" size={22} color={IOS.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
      >
        
        {/* Patient Information Section */}
        <Text style={{ fontSize: getFontSize(19), color: IOS.label, fontWeight: '700', letterSpacing: 0.3, marginBottom: 10, paddingHorizontal: 2 }}>
          Patient Information
        </Text>
        
        <View style={[{ backgroundColor: IOS.white, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, cardShadow]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: IOS.fill, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Text style={{ fontSize: getFontSize(15), color: IOS.secondaryLabel, fontWeight: '700' }}>{patientInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '600' }}>
                {patientName}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 3 }}>
                {patientIdLine}
              </Text>
            </View>
          </View>
          
          {isNicVerified && (
          <View style={{ backgroundColor: IOS.greenSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: IOS.green, marginRight: 6 }} />
            <Text style={{ fontSize: getFontSize(11), color: IOS.secondaryLabel, fontWeight: '600' }}>
              NIC Verified
            </Text>
          </View>
          )}
        </View>

        {/* Select OPD Department Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 }}>
          <Text style={{ fontSize: getFontSize(19), color: IOS.label, fontWeight: '700', letterSpacing: 0.3 }}>
            Select OPD Department
          </Text>
          <TouchableOpacity activeOpacity={0.6}>
            <Text style={{ fontSize: getFontSize(13), color: IOS.blue, fontWeight: '600' }}>
              Choose 1 clinic
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 36, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={IOS.tertiaryLabel} />
            <Text style={{ color: IOS.tertiaryLabel, marginTop: 10, fontSize: 13 }}>Loading departments...</Text>
          </View>
        ) : (
          <View style={{ marginBottom: 14 }}>
            {clinics.map((clinic) => {
              const isSelected = clinic.selected;
              const lowerName = clinic.name.toLowerCase();
              const isCardiology = lowerName.includes('cardiology');
              const isDental = lowerName.includes('dental');
              const isEye = lowerName.includes('eye');
              const iconBg = isCardiology ? IOS.redSoft : isDental ? IOS.blueSoft : isEye ? IOS.tealSoft : IOS.purpleSoft;

              return (
                <TouchableOpacity
                  key={clinic.id}
                  onPress={() => handleSelectClinic(clinic.id)}
                  activeOpacity={0.8}
                  style={[
                    {
                      backgroundColor: IOS.white,
                      padding: 14,
                      borderRadius: 20,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 2,
                      borderColor: isSelected ? IOS.blue : 'transparent',
                    },
                    cardShadow,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: iconBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      {isCardiology && <Ionicons name="heart" size={19} color={IOS.red} />}
                      {isDental && <FontAwesome5 name="tooth" size={16} color={IOS.blue} />} 
                      {isEye && <Ionicons name="eye" size={20} color={IOS.teal} />}
                      {!isCardiology && !isDental && !isEye && (
                        <Ionicons name="medkit" size={19} color={IOS.purple} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '600' }} numberOfLines={1}>
                        {clinic.name}
                      </Text>
                      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 3 }}>
                        {clinic.room} • {clinic.floor}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginRight: 12, backgroundColor: isSelected ? IOS.blueSoft : IOS.fill }}>
                      <Text style={{ fontSize: getFontSize(11), fontWeight: '600', color: isSelected ? IOS.blue : IOS.secondaryLabel }}>
                        {clinic.wait}
                      </Text>
                    </View>
                    
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isSelected ? 0 : 1.5,
                      borderColor: IOS.chevron,
                      backgroundColor: isSelected ? IOS.blue : IOS.white,
                    }}>
                      {isSelected && <Ionicons name="checkmark" size={15} color="#ffffff" />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Reason for Visit */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10, marginTop: 10, paddingHorizontal: 2 }}>
          <Text style={{ fontSize: getFontSize(19), color: IOS.label, fontWeight: '700', letterSpacing: 0.3 }}>
            Reason for Visit
          </Text>
          <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, marginLeft: 8 }}>
            (optional)
          </Text>
        </View>

        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Enter reason for visit..."
          placeholderTextColor="#8E8E93"
          multiline
          style={[
            {
              fontSize: getFontSize(15),
              backgroundColor: IOS.white,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 14,
              color: IOS.label,
              height: 100,
              marginBottom: 24,
              lineHeight: 21,
            },
            cardShadow,
          ]}
          textAlignVertical="top"
        />

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.85}
          style={{ backgroundColor: IOS.blue, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 10 }}
        >
          <Text style={{ fontSize: getFontSize(17), color: '#fff', fontWeight: '600', marginRight: 8 }}>
            Continue to Confirmation
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{ backgroundColor: IOS.fill, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: getFontSize(16), color: IOS.secondaryLabel, fontWeight: '600' }}>
            Cancel / Back to Home
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}