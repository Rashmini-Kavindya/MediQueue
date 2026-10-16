import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';

// iOS system colors - blue as accent, soft grouped background + white cards
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenDark: '#248A3D',
  greenSoft: 'rgba(52,199,89,0.14)',
  orange: '#FF9500',
  orangeSoft: 'rgba(255,149,0,0.14)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.10)',
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

// Full screen dimmed overlay used by the success / error popups
const overlayStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
  zIndex: 50,
  elevation: 50,
};

export default function ConfirmNewToken({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { getFontSize } = useSettings();

  const { selectedClinic, reason } = route.params || {
    selectedClinic: {
      id: 'OPD-02',
      opdId: 'OPD-02',
      name: 'Dental Clinic',
      room: 'Room 04',
      floor: 'Floor 01',
      wait: '~20 mins',
    },
    reason: 'Referred for toothache and dental checkup...',
  };

  const [isChecked, setIsChecked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAlreadyExists, setIsAlreadyExists] = useState(false);

  // API එකෙන් සාර්ථකව ලැබෙන සැබෑ ටෝකන් විස්තර මෙහි ස්ටෝර් කර ගනී
  const [issuedTokenData, setIssuedTokenData] = useState(null);

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleConfirmToken = async () => {
    if (!isChecked) return;
    try {
      setLoading(true);
      setErrorMessage('');
      setIsAlreadyExists(false);
      
      const payload = {
        opdId: selectedClinic.opdId || selectedClinic.id,
        reason: reason || ''
      };

      // API එකට රික්වෙස්ට් එක යැවීම
      const response = await API.post('/tokens', payload);

      if (response.data && response.data.success) {
        // සර්වර් එකෙන් එවන ලද සැබෑ ටෝකන් දත්ත ලබා ගැනීම (උදා: tokenNo, trackingCode, ආදී වශයෙන්)
        setIssuedTokenData(response.data.data);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error confirming token:', error.response?.data || error.message);
      
      const serverMessage = error.response?.data?.message || error.message;
      setErrorMessage(serverMessage);

      if (serverMessage.toLowerCase().includes('already exists') || error.response?.status === 400) {
        setIsAlreadyExists(true);
      }

      setShowCancelModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Small reusable detail row (label left, value right)
  const detailLabelStyle = { fontSize: getFontSize(14), color: IOS.tertiaryLabel, fontWeight: '500' };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: IOS.groupedBg }}>
      {/* Top Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', width: 80 }}
        >
          <Ionicons name="chevron-back" size={24} color={IOS.blue} />
          <Text style={{ fontSize: getFontSize(17), color: IOS.blue, fontWeight: '500' }}>
            Back
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '600' }}>
          Confirm New Token
        </Text>

        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
      >
        
        {/* New Clinic Request Card */}
        <View style={[{ backgroundColor: IOS.white, borderRadius: 24, padding: 18, marginBottom: 20 }, cardShadow]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: IOS.separator }}>
            <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '700' }}>
              New clinic request
            </Text>
            <View style={{ backgroundColor: IOS.blueSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: getFontSize(11), color: IOS.blue, fontWeight: '600' }}>
                Additional Token
              </Text>
            </View>
          </View>

          {/* Department */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={detailLabelStyle}>Department</Text>
            <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 12 }}>
              <Text numberOfLines={1} style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '600' }}>{selectedClinic.name}</Text>
              <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>{selectedClinic.room} • {selectedClinic.floor}</Text>
            </View>
          </View>

          {/* Patient */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={detailLabelStyle}>Patient</Text>
            <Text style={{ fontSize: getFontSize(15), color: IOS.label, fontWeight: '600' }}>
              {user?.name || 'Rashmini Silva'}
            </Text>
          </View>

          {/* Projected Wait */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <Text style={detailLabelStyle}>Projected wait</Text>
            <View style={{ backgroundColor: IOS.greenSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={14} color={IOS.greenDark} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: getFontSize(12), color: IOS.greenDark, fontWeight: '600' }}>
                {selectedClinic.wait}
              </Text>
            </View>
          </View>

          {/* Estimated Token Box */}
          <View style={{ backgroundColor: IOS.surface, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, fontWeight: '500' }}>
              Estimated status
            </Text>
            <Text style={{ fontSize: getFontSize(26), color: IOS.label, fontWeight: '700', letterSpacing: 0.3, marginVertical: 4 }}>
              Ready to Issue
            </Text>
            <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, textAlign: 'center', lineHeight: 17 }}>
              Final token number and queue position will be assigned upon confirmation
            </Text>
          </View>
        </View>

        {/* Checkbox Agreement */}
        <TouchableOpacity 
          onPress={() => setIsChecked(!isChecked)}
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 }}
        >
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            borderWidth: isChecked ? 0 : 1.5,
            borderColor: IOS.chevron,
            backgroundColor: isChecked ? IOS.blue : IOS.white,
          }}>
            {isChecked && <Ionicons name="checkmark" size={15} color="#ffffff" />}
          </View>
          <Text style={{ fontSize: getFontSize(14), color: IOS.secondaryLabel, fontWeight: '500', flex: 1, lineHeight: 20 }}>
            I confirm I wish to request this additional OPD token.
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={handleConfirmToken}
          disabled={!isChecked || loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: IOS.blue,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            marginBottom: 10,
            opacity: isChecked ? 1 : 0.4,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={{ fontSize: getFontSize(17), color: '#fff', fontWeight: '600', marginRight: 8 }}>
                Confirm & Get Token
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{ backgroundColor: IOS.fill, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: getFontSize(16), color: IOS.secondaryLabel, fontWeight: '600' }}>
            Go Back
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Success Modal (Dynamic Data Display) */}
      {showSuccessModal && (
        <View style={overlayStyle}>
          <View style={{ backgroundColor: IOS.white, width: '100%', maxWidth: 360, borderRadius: 28, padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: IOS.greenSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="checkmark-circle" size={36} color={IOS.green} />
              </View>
              <Text style={{ fontSize: getFontSize(20), color: IOS.label, fontWeight: '700', textAlign: 'center' }}>Token Issued Successfully!</Text>
              <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, textAlign: 'center', marginTop: 4 }}>
                Your OPD appointment slot has been reserved
              </Text>
            </View>

            <View style={{ backgroundColor: IOS.surface, borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: getFontSize(15), color: IOS.label, fontWeight: '600' }}>{selectedClinic.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Ionicons name="person-outline" size={12} color={IOS.tertiaryLabel} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel }}>{user?.name || 'Rashmini Silva'}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: IOS.greenSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: getFontSize(11), color: IOS.greenDark, fontWeight: '600' }}>Confirmed</Text>
              </View>
            </View>

            <View style={{ backgroundColor: IOS.surface, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '500', textAlign: 'center' }}>
                Your official OPD token number
              </Text>
              {/* API එකෙන් ලැබුණු සැබෑ ටෝකන් අංකය (tokenNo) හෝ ඩීෆෝල්ට් අගය පෙන්වීම */}
              <Text style={{ fontSize: getFontSize(38), color: IOS.label, fontWeight: '800', letterSpacing: 1, marginVertical: 4 }}>
                {issuedTokenData?.tokenNo || issuedTokenData?.trackingCode || 'OPD-TOKEN'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="business-outline" size={13} color={IOS.tertiaryLabel} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: getFontSize(12), color: IOS.secondaryLabel, fontWeight: '500' }}>Counter: {selectedClinic.room}</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('MainTabs', { screen: 'LiveQueue' });
              }}
              activeOpacity={0.85}
              style={{ backgroundColor: IOS.blue, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}
            >
              <Text style={{ fontSize: getFontSize(16), color: '#fff', fontWeight: '600', marginRight: 8 }}>View in My Queue</Text>
              <Ionicons name="arrow-forward" size={17} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('MainTabs', { screen: 'Home' });
              }}
              activeOpacity={0.7}
              style={{ backgroundColor: IOS.fill, paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: getFontSize(16), color: IOS.secondaryLabel, fontWeight: '600' }}>Dismiss & Return Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Cancel / Error Modal */}
      {showCancelModal && (
        <View style={overlayStyle}>
          <View style={{ backgroundColor: IOS.white, width: '100%', maxWidth: 360, borderRadius: 28, padding: 24 }}>
            <TouchableOpacity 
              onPress={() => setShowCancelModal(false)}
              activeOpacity={0.7}
              style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: IOS.fill, justifyContent: 'center', alignItems: 'center', zIndex: 2 }}
            >
              <Ionicons name="close" size={17} color={IOS.secondaryLabel} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12, backgroundColor: isAlreadyExists ? IOS.orangeSoft : IOS.redSoft }}>
                <Ionicons 
                  name={isAlreadyExists ? "alert-circle-outline" : "close-circle-outline"} 
                  size={34} 
                  color={isAlreadyExists ? IOS.orange : IOS.red} 
                />
              </View>
              <Text style={{ fontSize: getFontSize(20), color: IOS.label, fontWeight: '700', textAlign: 'center' }}>
                {isAlreadyExists ? "Active Token Exists" : "Token Request Failed"}
              </Text>
              <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, textAlign: 'center', marginTop: 6, paddingHorizontal: 8, lineHeight: 19 }}>
                {errorMessage || (isAlreadyExists 
                  ? "An active token already exists for this patient in this OPD today." 
                  : "Could not generate the token. Please check your network or try again.")}
              </Text>
            </View>

            <View style={{ backgroundColor: IOS.surface, borderRadius: 16, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: IOS.fill, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name={isAlreadyExists ? "time-outline" : "business-outline"} size={20} color={IOS.secondaryLabel} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: getFontSize(15), color: IOS.label, fontWeight: '600' }}>{selectedClinic.name}</Text>
                <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, marginTop: 2 }}>
                  {isAlreadyExists ? "Please check your live queue status." : `${selectedClinic.room}`}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isAlreadyExists ? IOS.orangeSoft : IOS.redSoft }}>
                <Text style={{ fontSize: getFontSize(11), fontWeight: '600', color: isAlreadyExists ? IOS.orange : IOS.red }}>
                  {isAlreadyExists ? 'Active' : 'Failed'}
                </Text>
              </View>
            </View>

            {isAlreadyExists ? (
              <TouchableOpacity 
                onPress={() => {
                  setShowCancelModal(false);
                  navigation.navigate('MainTabs', { screen: 'LiveQueue' });
                }}
                activeOpacity={0.85}
                style={{ backgroundColor: IOS.blue, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}
              >
                <Text style={{ fontSize: getFontSize(16), color: '#fff', fontWeight: '600', marginRight: 8 }}>View Live Queue</Text>
                <Ionicons name="arrow-forward" size={17} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onResp={() => setShowCancelModal(false)}
                onPress={() => setShowCancelModal(false)}
                activeOpacity={0.85}
                style={{ backgroundColor: IOS.label, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}
              >
                <Text style={{ fontSize: getFontSize(16), color: '#fff', fontWeight: '600', marginRight: 8 }}>Try Again</Text>
                <Ionicons name="arrow-forward" size={17} color="#ffffff" />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              onPress={() => setShowCancelModal(false)}
              activeOpacity={0.7}
              style={{ backgroundColor: IOS.fill, paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: getFontSize(16), color: IOS.secondaryLabel, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}