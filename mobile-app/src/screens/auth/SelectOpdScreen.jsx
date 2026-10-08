import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

export default function SelectOpdScreen({ navigation, route }) {
  const { t } = useTranslation();

  const [opdList, setOpdList] = useState([]);
  const [filteredOpds, setFilteredOpds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpdId, setSelectedOpdId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpds();
  }, []);

  const fetchOpds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/opds');
      if (res.data?.success) {
        const fetchedData = res.data.data || [];
        setOpdList(fetchedData);
        setFilteredOpds(fetchedData);
        if (fetchedData.length > 0) {
          setSelectedOpdId(fetchedData[0].opdId); // Default select first OPD
        }
      }
    } catch (err) {
      console.log('Fetch OPD Error:', err.response?.data || err.message);
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to load OPDs. Please check backend router.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Search filter with Safe String handling
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredOpds(opdList);
      return;
    }
    const query = text.toLowerCase();
    const filtered = opdList.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.department && item.department.toLowerCase().includes(query))
    );
    setFilteredOpds(filtered);
  };

  // Map OPD department/name to icon
  const getOpdIcon = (name = '', department = '') => {
    const title = `${name} ${department}`.toLowerCase();
    if (title.includes('cardio')) return 'heart-outline';
    if (title.includes('dent')) return 'medical-outline';
    if (title.includes('eye') || title.includes('vision')) return 'eye-outline';
    if (title.includes('ortho') || title.includes('bone')) return 'fitness-outline';
    return 'medkit-outline';
  };

  // Estimated wait time calculation
  const getEstWaitTime = (avgConsultMinutes = 10, currentQueue = 10) => {
    const minWait = Math.max(5, (currentQueue - 2) * avgConsultMinutes);
    const maxWait = currentQueue * avgConsultMinutes;
    return `${minWait}-${maxWait} min`;
  };

  const handleContinue = () => {
    if (!selectedOpdId) {
      Alert.alert('Selection Required', 'Please select an OPD to continue.');
      return;
    }

    const selectedOpd = opdList.find((item) => item.opdId === selectedOpdId);

    // Proceed to next step in workflow
    navigation.navigate('TokenConfirmation', {
      opdId: selectedOpdId,
      opdName: selectedOpd?.name,
      ...route.params
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-slate-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 mr-3">
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">{t('select_opd', 'Select OPD')}</Text>
      </View>

      <View className="flex-1 px-5 pt-4">
        {/* Search Input */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5">
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput
            placeholder={t('search_opd_ph', 'Search OPD...')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearch}
            className="flex-1 ml-3 text-slate-800 text-sm p-0"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Content List */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#0052CC" />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {filteredOpds.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
                <Text className="text-slate-400 text-sm mt-2">No OPD found</Text>
              </View>
            ) : (
              filteredOpds.map((item) => {
                const isSelected = selectedOpdId === item.opdId;
                const currentQueue = item.currentQueue || 12;

                return (
                  <TouchableOpacity
                    key={item.opdId}
                    activeOpacity={0.7}
                    onPress={() => setSelectedOpdId(item.opdId)}
                    className={`flex-row items-center p-4 rounded-2xl mb-3.5 border ${
                      isSelected
                        ? 'border-[#0052CC] bg-white shadow-sm'
                        : 'border-slate-100 bg-white'
                    }`}
                    style={{
                      borderWidth: isSelected ? 2 : 1,
                    }}
                  >
                    {/* Icon Container */}
                    <View
                      className={`w-12 h-12 rounded-2xl justify-center items-center mr-4 ${
                        isSelected ? 'bg-blue-50' : 'bg-slate-50'
                      }`}
                    >
                      <Ionicons
                        name={getOpdIcon(item.name, item.department)}
                        size={22}
                        color={isSelected ? '#0052CC' : '#64748B'}
                      />
                    </View>

                    {/* Information */}
                    <View className="flex-1">
                      <Text className="text-base font-bold text-slate-900 mb-0.5">
                        {item.name}
                      </Text>
                      <Text className="text-xs font-semibold text-slate-600">
                        Current Queue: <Text className="font-bold">{currentQueue}</Text>
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="time-outline" size={14} color="#0052CC" />
                        <Text className="text-xs font-semibold text-blue-600 ml-1">
                          Est. Wait: {getEstWaitTime(item.avgConsultMinutes, currentQueue)}
                        </Text>
                      </View>
                    </View>

                    {/* Chevron Icon */}
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isSelected ? '#0052CC' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Continue Button */}
      <View className="px-5 pb-6 pt-3 bg-white border-t border-slate-100">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleContinue}
          disabled={loading || !selectedOpdId}
          className="bg-[#0052CC] py-4 rounded-xl flex-row items-center justify-center shadow-sm"
          style={{ opacity: loading || !selectedOpdId ? 0.6 : 1 }}
        >
          <Text className="text-white font-bold text-base mr-2">
            {t('continue', 'Continue')}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}