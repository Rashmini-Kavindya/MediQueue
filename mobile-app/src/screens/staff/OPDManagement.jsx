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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../../services/api';
import Header from '../../components/admin/Header';

export default function OPDManagement({ navigation }) {
  const [opds, setOpds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Create / Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOpd, setEditingOpd] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [roomId, setRoomId] = useState('');
  const [avgConsultMinutes, setAvgConsultMinutes] = useState('10');
  const [doctorIds, setDoctorIds] = useState('');

  // Fetch OPDs List
  const fetchOpds = useCallback(async () => {
    try {
      const res = await api.get('/opd');
      if (res.data?.success) {
        setOpds(res.data.data || []);
      }
    } catch (err) {
      console.log('Error fetching OPDs:', err.message);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load OPDs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOpds();
  }, [fetchOpds]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOpds();
  };

  // Filtered OPDs based on Search Query
  const filteredOpds = useMemo(() => {
    if (!searchQuery.trim()) return opds;
    const query = searchQuery.toLowerCase();
    return opds.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.department?.toLowerCase().includes(query) ||
        item.opdId?.toLowerCase().includes(query) ||
        item.roomId?.toLowerCase().includes(query)
    );
  }, [opds, searchQuery]);

  // Total Doctors Calculation
  const totalDoctorsCount = useMemo(() => {
    return opds.reduce((acc, curr) => acc + (curr.doctorIds?.length || 0), 0);
  }, [opds]);

  // Open Modal for New OPD
  const handleOpenCreateModal = () => {
    setEditingOpd(null);
    setName('');
    setDepartment('');
    setRoomId('');
    setAvgConsultMinutes('10');
    setDoctorIds('');
    setModalVisible(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item) => {
    setEditingOpd(item);
    setName(item.name || '');
    setDepartment(item.department || '');
    setRoomId(item.roomId || '');
    setAvgConsultMinutes(String(item.avgConsultMinutes || '10'));
    setDoctorIds(item.doctorIds ? item.doctorIds.join(', ') : '');
    setModalVisible(true);
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!name.trim() || !department.trim()) {
      Alert.alert('Validation Error', 'Please enter OPD Name and Department');
      return;
    }

    setSubmitting(true);
    const parsedDoctors = doctorIds
      ? doctorIds.split(',').map((doc) => doc.trim()).filter(Boolean)
      : [];

    const payload = {
      name: name.trim(),
      department: department.trim(),
      roomId: roomId.trim(),
      avgConsultMinutes: Number(avgConsultMinutes) || 10,
      doctorIds: parsedDoctors,
    };

    try {
      if (editingOpd) {
        const res = await api.put(`/opd/${editingOpd.opdId}`, payload);
        if (res.data?.success) {
          Alert.alert('Success', 'OPD details updated successfully');
        }
      } else {
        const res = await api.post('/opd', payload);
        if (res.data?.success) {
          Alert.alert('Success', 'New OPD created successfully');
        }
      }
      setModalVisible(false);
      fetchOpds();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / Deactivate OPD Handler
  const handleDelete = (opdId, opdName) => {
    Alert.alert(
      'Deactivate OPD',
      `Are you sure you want to deactivate ${opdName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/opd/${opdId}`);
              if (res.data?.success) {
                setOpds((prev) => prev.filter((o) => o.opdId !== opdId));
                Alert.alert('Success', 'OPD deactivated successfully');
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to deactivate');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      {/* Header */}
      <Header title="OPD Management" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />
        }
      >
        {/* Banner Section */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-4 gap-2">
            <View className="flex-1 pr-2">
              <Text className="text-xl font-black text-slate-900 tracking-tight">
                Clinics & OPDs
              </Text>
              <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                Manage outpatient departments and room allocations
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenCreateModal}
              className="bg-[#0052CC] px-3.5 py-2.5 rounded-2xl flex-row items-center border border-blue-700 shadow-md shadow-blue-500/20 shrink-0"
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white ml-1 uppercase tracking-wider">
                Add OPD
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stat Cards with Blue & Emerald Accents */}
          <View className="flex-row space-x-2.5 mb-4 gap-2.5">
            <View className="flex-1 bg-white p-3.5 rounded-2xl border-2 border-blue-100 shadow-sm flex-row items-center">
              <View className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center mr-3 shadow-sm">
                <Ionicons name="business" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-lg font-black text-slate-900">{opds.length}</Text>
                <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                  Active OPDs
                </Text>
              </View>
            </View>

            <View className="flex-1 bg-white p-3.5 rounded-2xl border-2 border-emerald-100 shadow-sm flex-row items-center">
              <View className="w-10 h-10 bg-emerald-600 rounded-xl items-center justify-center mr-3 shadow-sm">
                <FontAwesome5 name="user-md" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-lg font-black text-slate-900">
                  {totalDoctorsCount}
                </Text>
                <Text className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
                  Assigned Docs
                </Text>
              </View>
            </View>
          </View>

          {/* Modern Search Box */}
          <View className="flex-row items-center bg-white border-2 border-slate-200 rounded-2xl px-3.5 py-2.5 mb-2 shadow-sm">
            <Ionicons name="search-outline" size={18} color="#0052CC" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search OPD name, dept or room..."
              placeholderTextColor="#94A3B8"
              className="flex-1 ml-2 text-xs font-semibold text-slate-800 p-0"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* OPD Cards List */}
        <View className="px-5">
          {loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#0052CC" />
              <Text className="text-xs font-semibold text-slate-500 mt-2">
                Fetching OPDs...
              </Text>
            </View>
          ) : filteredOpds.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center justify-center border-2 border-slate-200 mt-2 shadow-sm">
              <MaterialCommunityIcons name="hospital-building" size={48} color="#94A3B8" />
              <Text className="text-sm font-bold text-slate-700 mt-3">No OPDs Found</Text>
              <Text className="text-xs text-slate-500 text-center mt-1">
                {searchQuery
                  ? 'No results matched your search query.'
                  : 'Click the "+ Add OPD" button to register a new clinic or department.'}
              </Text>
            </View>
          ) : (
            filteredOpds.map((item) => (
              <View
                key={item.opdId}
                className="bg-white rounded-2xl p-4 border-2 border-slate-200 shadow-sm mb-3.5"
              >
                {/* Card Header & Badges */}
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center flex-wrap gap-1.5">
                      <Text className="text-base font-extrabold text-slate-900">{item.name}</Text>
                      <View className="bg-blue-600 px-2.5 py-0.5 rounded-md shadow-sm">
                        <Text className="text-[10px] font-black text-white">
                          {item.opdId}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs font-semibold text-slate-500 mt-1">
                      Department:{' '}
                      <Text className="font-extrabold text-blue-900">{item.department}</Text>
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row items-center space-x-1.5">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleOpenEditModal(item)}
                      className="w-8 h-8 bg-blue-50 rounded-xl items-center justify-center border border-blue-200"
                    >
                      <Ionicons name="create-outline" size={16} color="#0052CC" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDelete(item.opdId, item.name)}
                      className="w-8 h-8 bg-red-50 rounded-xl items-center justify-center border border-red-200 ml-1.5"
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Bottom Stats Badges */}
                <View className="flex-row items-center justify-between pt-3 border-t border-slate-100 mt-3.5">
                  <View className="flex-row items-center bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-xl">
                    <Ionicons name="log-in-outline" size={14} color="#0052CC" />
                    <Text className="text-[11px] font-bold text-blue-900 ml-1">
                      {item.roomId || 'No Room'}
                    </Text>
                  </View>

                  <View className="flex-row items-center bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                    <Ionicons name="time-outline" size={14} color="#475569" />
                    <Text className="text-[11px] font-bold text-slate-700 ml-1">
                      {item.avgConsultMinutes} mins / patient
                    </Text>
                  </View>

                  <View className="flex-row items-center bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-xl">
                    <Ionicons name="people-outline" size={14} color="#059669" />
                    <Text className="text-[11px] font-bold text-emerald-900 ml-1">
                      {item.doctorIds?.length || 0} Docs
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
          className="flex-1 bg-slate-900/60 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-6 border-t-2 border-blue-600 max-h-[90%] shadow-2xl">
            <View className="items-center mb-2">
              <View className="w-12 h-1.5 bg-slate-300 rounded-full mb-3" />
            </View>

            <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <Text className="text-base font-black text-slate-900">
                {editingOpd ? 'Edit OPD Configuration' : 'Add New Outpatient Dept'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-1.5 bg-slate-100 border border-slate-200 rounded-full"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="space-y-3.5">
              <View>
                <Text className="text-xs font-bold text-slate-700 mb-1">OPD / Clinic Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Cardiology Clinic A"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800"
                />
              </View>

              <View className="mt-3">
                <Text className="text-xs font-bold text-slate-700 mb-1">Department Name *</Text>
                <TextInput
                  value={department}
                  onChangeText={setDepartment}
                  placeholder="e.g. Cardiology"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800"
                />
              </View>

              <View className="flex-row space-x-3 mt-3 gap-2">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700 mb-1">Room No / Location</Text>
                  <TextInput
                    value={roomId}
                    onChangeText={setRoomId}
                    placeholder="e.g. Room 204"
                    placeholderTextColor="#94A3B8"
                    className="bg-slate-50 border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700 mb-1">Avg Consult (Mins)</Text>
                  <TextInput
                    value={avgConsultMinutes}
                    onChangeText={setAvgConsultMinutes}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#94A3B8"
                    className="bg-slate-50 border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800"
                  />
                </View>
              </View>

              <View className="mt-3">
                <Text className="text-xs font-bold text-slate-700 mb-1">
                  Assigned Doctor IDs (Comma Separated)
                </Text>
                <TextInput
                  value={doctorIds}
                  onChangeText={setDoctorIds}
                  placeholder="e.g. DOC-01, DOC-02, DOC-03"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSubmit}
                disabled={submitting}
                className="bg-[#0052CC] py-3.5 rounded-xl items-center justify-center mt-5 mb-6 border border-blue-700 shadow-lg shadow-blue-500/30"
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-black text-xs tracking-wider uppercase">
                    {editingOpd ? 'Save Changes' : 'Create OPD'}
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