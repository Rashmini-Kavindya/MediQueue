import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

export default function RequestNewToken({ navigation }) {
  const { user } = useContext(AuthContext);
  const { getFontSize } = useSettings();

  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('Referred for toothache and dental checkup...');

  useEffect(() => {
    fetchOpds();
  }, []);

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

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Top Header */}
      <View className="flex-row justify-between items-center px-4 pt-2 pb-2 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center mr-2.5"
          >
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: getFontSize(9) }} className="font-extrabold text-blue-600 tracking-[1px]">
              MEDIQUEUE OPD
            </Text>
            <Text style={{ fontSize: getFontSize(18) }} className="font-black text-slate-900 tracking-tight">
              Request New Token
            </Text>
          </View>
        </View>

        <TouchableOpacity className="w-9 h-9 bg-blue-50 rounded-full justify-center items-center">
          <Ionicons name="add" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        
        {/* Patient Information Section */}
        <Text style={{ fontSize: getFontSize(11) }} className="font-bold text-slate-400 tracking-wider mb-1.5 uppercase">
          Patient Information
        </Text>
        
        <View className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 flex-row items-center justify-between mb-5 shadow-sm">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-sky-100 justify-center items-center mr-3">
              <Text style={{ fontSize: getFontSize(13) }} className="font-black text-blue-600">RS</Text>
            </View>
            <View>
              <Text style={{ fontSize: getFontSize(14) }} className="font-bold text-slate-900">
                {user?.name || 'Rashmini Silva'}
              </Text>
              <Text style={{ fontSize: getFontSize(11) }} className="text-slate-400 mt-0.5">
                ID: 199265100234 • OPD-8942
              </Text>
            </View>
          </View>
          
          <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-row items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            <Text style={{ fontSize: getFontSize(10) }} className="font-bold text-emerald-700">
              NIC Verified
            </Text>
          </View>
        </View>

        {/* Select OPD Department Section */}
        <View className="flex-row justify-between items-center mb-2.5">
          <Text style={{ fontSize: getFontSize(11) }} className="font-bold text-slate-400 tracking-wider uppercase">
            Select OPD Department
          </Text>
          <TouchableOpacity>
            <Text style={{ fontSize: getFontSize(11) }} className="font-bold text-blue-600">
              Choose 1 clinic
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="py-8 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-slate-400 mt-2 text-xs">Loading departments...</Text>
          </View>
        ) : (
          <View className="gap-2.5 mb-5">
            {clinics.map((clinic) => {
              const isSelected = clinic.selected;
              return (
                <TouchableOpacity
                  key={clinic.id}
                  onPress={() => handleSelectClinic(clinic.id)}
                  activeOpacity={0.8}
                  className={`p-3.5 rounded-2xl border flex-row items-center justify-between bg-white shadow-sm ${
                    isSelected ? 'border-blue-600 border-[2px]' : 'border-slate-200/80'
                  }`}
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className={`w-9 h-9 rounded-xl justify-center items-center mr-3 ${
                      clinic.name.toLowerCase().includes('cardiology') ? 'bg-rose-50' :
                      clinic.name.toLowerCase().includes('dental') ? 'bg-blue-600' :
                      clinic.name.toLowerCase().includes('eye') ? 'bg-sky-50' : 'bg-indigo-50'
                    }`}>
                      {clinic.name.toLowerCase().includes('cardiology') && <Ionicons name="heart" size={16} color="#f43f5e" />}
                      {clinic.name.toLowerCase().includes('dental') && <FontAwesome5 name="tooth" size={14} color="#ffffff" />} 
                      {clinic.name.toLowerCase().includes('eye') && <Ionicons name="eye" size={16} color="#0284c7" />}
                      {!clinic.name.toLowerCase().includes('cardiology') && 
                       !clinic.name.toLowerCase().includes('dental') && 
                       !clinic.name.toLowerCase().includes('eye') && (
                        <Ionicons name="close" size={16} color="#6366f1" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text style={{ fontSize: getFontSize(13) }} className="font-black text-slate-900" numberOfLines={1}>
                        {clinic.name}
                      </Text>
                      <Text style={{ fontSize: getFontSize(11) }} className="text-slate-400 mt-0.5">
                        {clinic.room} • {clinic.floor}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2.5">
                    <View className={`px-2.5 py-1 rounded-full ${isSelected ? 'bg-blue-50' : 'bg-slate-100'}`}>
                      <Text style={{ fontSize: getFontSize(10) }} className={`font-semibold ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                        {clinic.wait}
                      </Text>
                    </View>
                    
                    <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Reason for Visit */}
        <Text style={{ fontSize: getFontSize(11) }} className="font-bold text-slate-400 tracking-wider mb-1.5 uppercase">
          Reason for Visit <Text className="text-slate-300 font-normal">(optional)</Text>
        </Text>

        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Enter reason for visit..."
          placeholderTextColor="#94a3b8"
          multiline
          style={{ fontSize: getFontSize(12) }}
          className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-3.5 text-slate-800 h-20 mb-5"
          textAlignVertical="top"
        />

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={handleContinue}
          className="bg-blue-600 py-3.5 rounded-2xl items-center justify-center shadow-md flex-row mb-2.5"
        >
          <Text style={{ fontSize: getFontSize(13) }} className="text-white font-bold tracking-wide mr-2">
            Continue to Confirmation
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-white border border-slate-200 py-3.5 rounded-2xl items-center justify-center"
        >
          <Text style={{ fontSize: getFontSize(13) }} className="text-slate-600 font-bold tracking-wide">
            Cancel / Back to Home
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}