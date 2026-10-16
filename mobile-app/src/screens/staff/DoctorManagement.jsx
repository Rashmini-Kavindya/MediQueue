import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import api from '../../services/api';
import Header from '../../components/admin/Header';

export default function DoctorManagement({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpdFilter, setSelectedOpdFilter] = useState('ALL');

  // Modal State for Create / Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedOpds, setSelectedOpds] = useState([]); // Selected OPD array
  const [customOpdInput, setCustomOpdInput] = useState(''); // For adding new OPD dynamically

  // Fetch Doctors List
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.get('/doctors');
      if (res.data?.success) {
        setDoctors(res.data.data || []);
      }
    } catch (err) {
      console.log('Error fetching doctors:', err.message);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load doctors data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctors();
  };

  // Get Unique OPD List dynamically from doctors data
  const availableOpds = useMemo(() => {
    const opdSet = new Set();
    doctors.forEach((doc) => {
      if (Array.isArray(doc.opdIds)) {
        doc.opdIds.forEach((opd) => opdSet.add(opd.trim()));
      }
    });
    // Default fallback OPDs if empty
    if (opdSet.size === 0) {
      return ['OPD-01', 'OPD-02', 'OPD-03', 'OPD-04'];
    }
    return Array.from(opdSet);
  }, [doctors]);

  // Filtered Doctors based on Search Query & Selected OPD Filter
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // OPD Filter Check
      const matchesOpd =
        selectedOpdFilter === 'ALL' ||
        (doc.opdIds && doc.opdIds.includes(selectedOpdFilter));

      // Search Query Check
      if (!searchQuery.trim()) return matchesOpd;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        doc.name?.toLowerCase().includes(query) ||
        doc.specialization?.toLowerCase().includes(query) ||
        doc.doctorId?.toLowerCase().includes(query) ||
        doc.roomId?.toLowerCase().includes(query) ||
        doc.opdIds?.some((opd) => opd.toLowerCase().includes(query));

      return matchesOpd && matchesSearch;
    });
  }, [doctors, searchQuery, selectedOpdFilter]);

  // Unique Specializations Count
  const specializationsCount = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization).filter(Boolean));
    return specs.size;
  }, [doctors]);

  // Open Modal for New Doctor
  const handleOpenCreateModal = () => {
    setEditingDoctor(null);
    setName('');
    setSpecialization('');
    setRoomId('');
    setSelectedOpds([]);
    setCustomOpdInput('');
    setModalVisible(true);
  };

  // Open Modal for Edit Doctor
  const handleOpenEditModal = (item) => {
    setEditingDoctor(item);
    setName(item.name || '');
    setSpecialization(item.specialization || '');
    setRoomId(item.roomId || '');
    setSelectedOpds(item.opdIds || []);
    setCustomOpdInput('');
    setModalVisible(true);
  };

  // Toggle Selection of OPD in Modal
  const toggleOpdSelection = (opd) => {
    if (selectedOpds.includes(opd)) {
      setSelectedOpds(selectedOpds.filter((id) => id !== opd));
    } else {
      setSelectedOpds([...selectedOpds, opd]);
    }
  };

  // Add Custom OPD to selection
  const handleAddCustomOpd = () => {
    const trimmed = customOpdInput.trim().toUpperCase();
    if (trimmed && !selectedOpds.includes(trimmed)) {
      setSelectedOpds([...selectedOpds, trimmed]);
      setCustomOpdInput('');
    }
  };

  // Submit Handler (Create or Update)
  const handleSubmit = async () => {
    if (!name.trim() || !specialization.trim()) {
      Alert.alert('Invalid Input', 'Please enter Doctor Name and Specialization');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      specialization: specialization.trim(),
      roomId: roomId.trim(),
      opdIds: selectedOpds,
    };

    try {
      if (editingDoctor) {
        const res = await api.put(`/doctors/${editingDoctor.doctorId}`, payload);
        if (res.data?.success) {
          Alert.alert('Success', 'Doctor details updated successfully');
        }
      } else {
        const res = await api.post('/doctors', payload);
        if (res.data?.success) {
          Alert.alert('Success', 'New Doctor registered successfully');
        }
      }
      setModalVisible(false);
      fetchDoctors();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Deactivate Doctor Handler
  const handleDelete = (doctorId, docName) => {
    Alert.alert(
      'Deactivate Doctor',
      `Are you sure you want to deactivate ${docName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/doctors/${doctorId}`);
              if (res.data?.success) {
                setDoctors((prev) => prev.filter((d) => d.doctorId !== doctorId));
                Alert.alert('Success', 'Doctor deactivated successfully');
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not deactivate doctor');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Header title="Doctor Management" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Banner Section */}
        <View className="px-5 pt-5 pb-3">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-2">
              <Text className="text-2xl font-black text-slate-900 tracking-tight">
                Medical Officers
              </Text>
              <Text className="text-xs font-medium text-slate-500 mt-1">
                Manage consultants, specialties, and OPD allocations
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenCreateModal}
              className="bg-blue-600 px-4 py-3 rounded-2xl flex-row items-center shadow-lg shadow-blue-500/30"
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white ml-1 tracking-wide uppercase">
                Add Doctor
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stat Cards */}
          <View className="flex-row space-x-3 mb-4 gap-3">
            <View className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-row items-center">
              <View className="w-12 h-12 bg-blue-500/10 rounded-2xl items-center justify-center mr-3">
                <FontAwesome5 name="user-md" size={20} color="#2563EB" />
              </View>
              <View>
                <Text className="text-2xl font-black text-slate-900">{doctors.length}</Text>
                <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">
                  Active Doctors
                </Text>
              </View>
            </View>

            <View className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-row items-center">
              <View className="w-12 h-12 bg-emerald-500/10 rounded-2xl items-center justify-center mr-3">
                <FontAwesome5 name="stethoscope" size={18} color="#059669" />
              </View>
              <View>
                <Text className="text-2xl font-black text-slate-900">{specializationsCount}</Text>
                <Text className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                  Specialties
                </Text>
              </View>
            </View>
          </View>

          {/* Search Box */}
          <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm mb-3">
            <Ionicons name="search-outline" size={20} color="#2563EB" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search name, specialty, room or OPD..."
              placeholderTextColor="#94A3B8"
              className="flex-1 ml-3 text-xs font-semibold text-slate-800 p-0"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal OPD Filter Chips Bar */}
          <View className="mt-1">
            <Text className="text-[11px] font-bold text-slate-500 uppercase mb-2 tracking-wider">
              Filter By OPD
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {/* All Option */}
              <TouchableOpacity
                onPress={() => setSelectedOpdFilter('ALL')}
                className={`px-4 py-2 rounded-2xl mr-2 border ${
                  selectedOpdFilter === 'ALL'
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedOpdFilter === 'ALL' ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  All OPDs
                </Text>
              </TouchableOpacity>

              {/* Dynamic OPD Chips */}
              {availableOpds.map((opd) => {
                const isSelected = selectedOpdFilter === opd;
                return (
                  <TouchableOpacity
                    key={opd}
                    onPress={() => setSelectedOpdFilter(opd)}
                    className={`px-4 py-2 rounded-2xl mr-2 border ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {opd}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Doctors Card List */}
        <View className="px-5 mt-2">
          {loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#2563EB" />
              <Text className="text-xs font-semibold text-slate-500 mt-3">
                Loading doctors data...
              </Text>
            </View>
          ) : filteredDoctors.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center justify-center border border-slate-200/60 mt-2 shadow-sm">
              <FontAwesome5 name="user-nurse" size={44} color="#CBD5E1" />
              <Text className="text-sm font-bold text-slate-700 mt-3">
                No Doctors Found
              </Text>
              <Text className="text-xs text-slate-400 text-center mt-1">
                {searchQuery || selectedOpdFilter !== 'ALL'
                  ? 'Try clearing filters or search query.'
                  : 'Click "+ Add Doctor" button to register a new doctor.'}
              </Text>
            </View>
          ) : (
            filteredDoctors.map((item) => (
              <View
                key={item.doctorId}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4"
              >
                {/* Header & Avatar */}
                <View className="flex-row justify-between items-start">
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl items-center justify-center mr-3">
                      <FontAwesome5 name="user-md" size={20} color="#2563EB" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center flex-wrap gap-2">
                        <Text className="text-base font-extrabold text-slate-900">{item.name}</Text>
                        <View className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          <Text className="text-[10px] font-black text-blue-700">
                            {item.doctorId}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs font-bold text-emerald-600 mt-1">
                        {item.specialization || 'General Practitioner'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleOpenEditModal(item)}
                      className="w-9 h-9 bg-slate-50 rounded-xl items-center justify-center border border-slate-200"
                    >
                      <Ionicons name="create-outline" size={18} color="#2563EB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDelete(item.doctorId, item.name)}
                      className="w-9 h-9 bg-red-50 rounded-xl items-center justify-center border border-red-100 ml-2"
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Info Pills */}
                <View className="flex-row items-center justify-between pt-4 border-t border-slate-100 mt-4 gap-2">
                  <View className="flex-row items-center bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-2xl">
                    <Ionicons name="business-outline" size={14} color="#2563EB" />
                    <Text className="text-[11px] font-bold text-slate-700 ml-1.5">
                      Room: {item.roomId || 'Unassigned'}
                    </Text>
                  </View>

                  <View className="flex-row items-center bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-2xl flex-1 justify-center">
                    <Ionicons name="git-network-outline" size={14} color="#64748B" />
                    <Text className="text-[11px] font-bold text-slate-700 ml-1.5" numberOfLines={1}>
                      OPDs: {item.opdIds?.length ? item.opdIds.join(', ') : 'None'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-slate-900/40 justify-end"
        >
          <View className="bg-white rounded-t-[32px] p-6 max-h-[90%] shadow-2xl">
            <View className="items-center mb-3">
              <View className="w-12 h-1 bg-slate-200 rounded-full" />
            </View>

            <View className="flex-row justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <Text className="text-lg font-black text-slate-900">
                {editingDoctor ? 'Edit Doctor Profile' : 'Register New Doctor'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-2 bg-slate-100 rounded-full"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
              <View>
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Doctor Full Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Dr. John Doe"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800"
                />
              </View>

              <View className="mt-3">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Specialization *</Text>
                <TextInput
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="e.g. Cardiologist, Neurologist"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800"
                />
              </View>

              <View className="mt-3">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Assigned Room / Chamber</Text>
                <TextInput
                  value={roomId}
                  onChangeText={setRoomId}
                  placeholder="e.g. Room 102"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800"
                />
              </View>

              {/* Multi-Select OPD Chips Section */}
              <View className="mt-3">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">
                  Select OPDs (Tap to toggle)
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {availableOpds.map((opd) => {
                    const isSelected = selectedOpds.includes(opd);
                    return (
                      <TouchableOpacity
                        key={opd}
                        onPress={() => toggleOpdSelection(opd)}
                        className={`px-3 py-2 rounded-xl border ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-white' : 'text-slate-700'
                          }`}
                        >
                          {isSelected ? '✓ ' : ''}{opd}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom OPD Add Field */}
                <View className="flex-row items-center space-x-2 mt-2">
                  <TextInput
                    value={customOpdInput}
                    onChangeText={setCustomOpdInput}
                    placeholder="Add new OPD (e.g. OPD-05)"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                  />
                  <TouchableOpacity
                    onPress={handleAddCustomOpd}
                    className="bg-slate-800 px-4 py-2.5 rounded-2xl ml-2"
                  >
                    <Text className="text-white text-xs font-bold">Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 py-4 rounded-2xl items-center justify-center mt-6 mb-6 shadow-lg shadow-blue-500/30"
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-bold text-xs tracking-wider uppercase">
                    {editingDoctor ? 'Update Profile' : 'Register Doctor'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}