import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';

export default function ConfirmNewToken({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { getFontSize } = useSettings();

  // RequestNewToken එකෙන් එවූ දත්ත ලබා ගැනීම (නැතහොත් default අගයන්)
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

      await API.post('/tokens', payload);

      // API එක සාර්ථක වූ පසු Success Modal එක පෙන්වීම
      setShowSuccessModal(true); 
    } catch (error) {
      console.error('Error confirming token:', error.response?.data || error.message);
      
      const serverMessage = error.response?.data?.message || error.message;
      setErrorMessage(serverMessage);

      // දැනටමත් Token එකක් ඇති බවට backend එකෙන් එන error එක පරීක්ෂා කිරීම
      if (serverMessage.toLowerCase().includes('already exists') || error.response?.status === 400) {
        setIsAlreadyExists(true);
      }

      setShowCancelModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 relative">
      {/* Top Header */}
      <View className="flex-row justify-between items-center px-4 pt-3 pb-3 bg-white border-b border-slate-100">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="flex-row items-center"
        >
          <Ionicons name="chevron-back" size={20} color="#2563eb" />
          <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-blue-600 ml-1">
            Back
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: getFontSize(16) }} className="font-black text-slate-900 tracking-tight">
          Confirm New Token
        </Text>

        <TouchableOpacity className="w-9 h-9 bg-blue-50 rounded-full justify-center items-center">
          <Ionicons name="add" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        
        {/* Active Token In Progress Card */}
        <View className="bg-white border border-amber-200/80 rounded-2xl p-4 mb-4 shadow-sm relative overflow-hidden">
          <View className="flex-row justify-between items-center mb-2.5">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
              <Text style={{ fontSize: getFontSize(11) }} className="font-extrabold text-amber-800 tracking-wider">
                ACTIVE TOKEN IN PROGRESS
              </Text>
            </View>
            <View className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-amber-700">
                Live Queue
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: getFontSize(12) }} className="text-slate-500 mb-2">
            You currently have an active token for:
          </Text>
          
          <View className="flex-row items-center mb-4">
            <Ionicons name="business-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: getFontSize(13) }} className="font-black text-slate-900">
              GENERAL MEDICINE — ROOM 02
            </Text>
          </View>

          {/* Token Stats Row */}
          <View className="flex-row justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
            <View className="items-center flex-1 border-r border-slate-200">
              <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-slate-400 uppercase">Your Token</Text>
              <Text style={{ fontSize: getFontSize(15) }} className="font-black text-blue-600 mt-0.5">A-127</Text>
            </View>
            <View className="items-center flex-1 border-r border-slate-200">
              <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-slate-400 uppercase">Now Serving</Text>
              <Text style={{ fontSize: getFontSize(15) }} className="font-black text-slate-800 mt-0.5">A-119</Text>
            </View>
            <View className="items-center flex-1">
              <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-slate-400 uppercase">Ahead of You</Text>
              <Text style={{ fontSize: getFontSize(15) }} className="font-black text-amber-600 mt-0.5">8 Ahead</Text>
            </View>
          </View>
        </View>

        {/* New Clinic Request Card */}
        <View className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-slate-100">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-blue-600 mr-2" />
              <Text style={{ fontSize: getFontSize(11) }} className="font-extrabold text-slate-800 tracking-wider">
                NEW CLINIC REQUEST
              </Text>
            </View>
            <View className="bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
              <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-blue-600">
                Additional Token
              </Text>
            </View>
          </View>

          {/* Department */}
          <View className="flex-row justify-between items-center mb-3">
            <Text style={{ fontSize: getFontSize(12) }} className="font-bold text-slate-400 uppercase">Department:</Text>
            <View className="items-end">
              <Text style={{ fontSize: getFontSize(14) }} className="font-black text-slate-900">{selectedClinic.name}</Text>
              <Text style={{ fontSize: getFontSize(11) }} className="text-slate-400">{selectedClinic.room} • {selectedClinic.floor}</Text>
            </View>
          </View>

          {/* Patient */}
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ fontSize: getFontSize(12) }} className="font-bold text-slate-400 uppercase">Patient:</Text>
            <Text style={{ fontSize: getFontSize(13) }} className="font-bold text-slate-900">
              {user?.name || 'Rashmini Silva'} <Text className="text-slate-400 font-normal">(OPD-8942)</Text>
            </Text>
          </View>

          {/* Projected Wait */}
          <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-slate-100">
            <Text style={{ fontSize: getFontSize(12) }} className="font-bold text-slate-400 uppercase">Projected Wait:</Text>
            <View className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex-row items-center">
              <Ionicons name="time-outline" size={13} color="#059669" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: getFontSize(11) }} className="font-bold text-emerald-700">
                {selectedClinic.wait}
              </Text>
            </View>
          </View>

          {/* Estimated Token Box */}
          <View className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 items-center">
            <Text style={{ fontSize: getFontSize(11) }} className="font-extrabold text-blue-600 tracking-wider uppercase mb-1">
              Estimated Token
            </Text>
            <Text style={{ fontSize: getFontSize(28) }} className="font-black text-slate-900 tracking-tight my-1">
              D - 042
            </Text>
            <Text style={{ fontSize: getFontSize(10) }} className="text-slate-400 text-center">
              Final token number assigned upon immediate confirmation
            </Text>
          </View>
        </View>

        {/* Checkbox Agreement */}
        <TouchableOpacity 
          onPress={() => setIsChecked(!isChecked)}
          activeOpacity={0.9}
          className="flex-row items-center mb-5 px-1"
        >
          <View className={`w-5 h-5 rounded-md border items-center justify-center mr-2.5 ${
            isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
          }`}>
            {isChecked && <Ionicons name="checkmark" size={14} color="#ffffff" />}
          </View>
          <Text style={{ fontSize: getFontSize(12) }} className="font-medium text-slate-700 flex-1">
            I confirm I wish to request this additional OPD token.
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={handleConfirmToken}
          disabled={!isChecked || loading}
          className={`py-4 rounded-2xl items-center justify-center shadow-md flex-row mb-3 ${
            isChecked ? 'bg-blue-600' : 'bg-blue-300'
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={{ fontSize: getFontSize(14) }} className="text-white font-bold tracking-wide mr-2">
                Confirm & Get Token
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-white border border-slate-200 py-4 rounded-2xl items-center justify-center"
        >
          <Text style={{ fontSize: getFontSize(14) }} className="text-slate-600 font-bold tracking-wide">
            Go Back
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Success Modal */}
      {showSuccessModal && (
        <View className="absolute inset-0 bg-black/60 justify-center items-center px-4 z-50">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl relative">
            <View className="items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-emerald-50 justify-center items-center mb-2">
                <Ionicons name="checkmark-circle-outline" size={32} color="#059669" />
              </View>
              <Text className="text-xl font-black text-slate-900 text-center">Token Issued Successfully!</Text>
              <Text className="text-xs text-slate-500 text-center mt-1">
                Your OPD appointment slot has been reserved
              </Text>
            </View>

            <View className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mb-4 flex-row justify-between items-center">
              <View>
                <Text className="text-xs font-black text-slate-900">{selectedClinic.name}</Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">👤 {user?.name || 'Rashmini Silva'} <Text className="text-slate-400">(OPD-0942)</Text></Text>
              </View>
              <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <Text className="text-[10px] font-bold text-emerald-700">CONFIRMED</Text>
              </View>
            </View>

            <View className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 items-center mb-6">
              <Text className="text-[10px] font-extrabold text-blue-600 tracking-wider uppercase mb-1">
                NEW OFFICIAL OPD TOKEN
              </Text>
              <Text className="text-3xl font-black text-slate-900 tracking-tight my-1">
                D - 042
              </Text>
              <View className="flex-row items-center mt-2 space-x-4">
                <Text className="text-[11px] text-slate-500 font-medium">🕒 Est. Wait: ~20 min</Text>
                <Text className="text-[11px] text-slate-500 font-medium">🏢 Counter: {selectedClinic.room}</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => navigation.navigate('MainTabs', { screen: 'LiveQueue' })}
              className="bg-blue-600 py-3.5 rounded-2xl flex-row justify-center items-center shadow-md mb-3"
            >
              <Text className="text-white font-bold text-sm mr-2">View in My Queue</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
              className="bg-white border border-slate-200 py-3.5 rounded-2xl items-center justify-center"
            >
              <Text className="text-slate-600 font-bold text-sm">Dismiss & Return Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Cancel / Error Modal (Smart Conditional Rendering) */}
      {showCancelModal && (
        <View className="absolute inset-0 bg-black/60 justify-center items-center px-4 z-50">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl relative">
            <TouchableOpacity 
              onPress={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 justify-center items-center"
            >
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>

            <View className="items-center mb-4">
              <View className={`w-14 h-14 rounded-full justify-center items-center mb-2 ${isAlreadyExists ? 'bg-amber-50' : 'bg-red-50'}`}>
                <Ionicons 
                  name={isAlreadyExists ? "alert-circle-outline" : "close-circle-outline"} 
                  size={32} 
                  color={isAlreadyExists ? "#d97706" : "#ef4444"} 
                />
              </View>
              <Text className="text-xl font-black text-slate-900 text-center">
                {isAlreadyExists ? "Active Token Exists" : "Token Request Failed"}
              </Text>
              <Text className="text-xs text-slate-500 text-center mt-1 px-2">
                {errorMessage || (isAlreadyExists 
                  ? "An active token already exists for this patient in this OPD today." 
                  : "Could not generate the token. Please check your network or try again.")}
              </Text>
            </View>

            <View className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mb-6 flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-blue-50 justify-center items-center mr-3">
                <Ionicons name={isAlreadyExists ? "time-outline" : "business-outline"} size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">{selectedClinic.name}</Text>
                <Text className="text-xs text-slate-400">
                  {isAlreadyExists ? "Please check your live queue status." : `${selectedClinic.room} • ${user?.name || 'Rashmini Silva'}`}
                </Text>
              </View>
              <View className={`px-2 py-1 rounded-full ${isAlreadyExists ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-100'}`}>
                <Text className={`text-[10px] font-bold ${isAlreadyExists ? 'text-amber-700' : 'text-red-600'}`}>
                  {isAlreadyExists ? 'ACTIVE' : 'FAILED'}
                </Text>
              </View>
            </View>

            {/* If token already exists, give option to view live queue, otherwise 'Try Again' */}
            {isAlreadyExists ? (
              <TouchableOpacity 
                onPress={() => {
                  setShowCancelModal(false);
                  navigation.navigate('MainTabs', { screen: 'LiveQueue' });
                }}
                className="bg-blue-600 py-3.5 rounded-2xl flex-row justify-center items-center shadow-md mb-2.5"
              >
                <Text className="text-white font-bold text-sm mr-2">View Live Queue</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={() => setShowCancelModal(false)}
                className="bg-slate-900 py-4 rounded-2xl flex-row justify-center items-center shadow-md mb-2.5"
              >
                <Text className="text-white font-bold text-sm mr-2">Try Again</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              onPress={() => setShowCancelModal(false)}
              className="bg-white border border-slate-200 py-3.5 rounded-2xl items-center justify-center"
            >
              <Text className="text-slate-600 font-bold text-sm">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}