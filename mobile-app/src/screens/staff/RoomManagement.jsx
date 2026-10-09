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

export default function RoomManagement({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [roomNumber, setRoomNumber] = useState('');
  const [name, setName] = useState('');
  const [opdId, setOpdId] = useState('');

  // Fetch Rooms from API
  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/rooms');
      if (res.data?.success) {
        setRooms(res.data.data || []);
      }
    } catch (err) {
      console.log('Error fetching rooms:', err.message);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load rooms data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  // Filtered Rooms List
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    const query = searchQuery.toLowerCase();
    return rooms.filter(
      (room) =>
        room.roomNumber?.toLowerCase().includes(query) ||
        room.name?.toLowerCase().includes(query) ||
        room.opdId?.toLowerCase().includes(query) ||
        room.roomId?.toLowerCase().includes(query)
    );
  }, [rooms, searchQuery]);

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setName('');
    setOpdId('');
    setModalVisible(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item) => {
    setEditingRoom(item);
    setRoomNumber(item.roomNumber || '');
    setName(item.name || '');
    setOpdId(item.opdId || '');
    setModalVisible(true);
  };

  // Submit Handler (Create / Update)
  const handleSubmit = async () => {
    if (!roomNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a Room Number');
      return;
    }

    setSubmitting(true);

    const payload = {
      roomNumber: roomNumber.trim(),
      name: name.trim(),
      opdId: opdId.trim(),
    };

    try {
      if (editingRoom) {
        const res = await api.put(`/rooms/${editingRoom.roomId}`, payload);
        if (res.data?.success) {
          Alert.alert('Success', 'Room details updated successfully');
        }
      } else {
        const res = await api.post('/rooms', payload);
        if (res.data?.success) {
          Alert.alert('Success', 'New room created successfully');
        }
      }
      setModalVisible(false);
      fetchRooms();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Deactivate Room Handler
  const handleDelete = (roomId, num) => {
    Alert.alert(
      'Deactivate Room',
      `Are you sure you want to deactivate Room ${num}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/rooms/${roomId}`);
              if (res.data?.success) {
                setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
                Alert.alert('Success', 'Room deactivated successfully');
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not deactivate room');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Header title="Room Management" />

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
                Hospital Rooms
              </Text>
              <Text className="text-xs font-medium text-slate-500 mt-1">
                Manage consultation rooms & OPD allocations
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenCreateModal}
              className="bg-blue-600 px-4 py-3 rounded-2xl flex-row items-center shadow-lg shadow-blue-500/30"
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white ml-1 tracking-wide uppercase">
                Add Room
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats Bar */}
          <View className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-row items-center mb-4">
            <View className="w-12 h-12 bg-blue-500/10 rounded-2xl items-center justify-center mr-3">
              <FontAwesome5 name="door-open" size={20} color="#2563EB" />
            </View>
            <View>
              <Text className="text-2xl font-black text-slate-900">{rooms.length}</Text>
              <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">
                Active Rooms
              </Text>
            </View>
          </View>

          {/* Search Box */}
          <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <Ionicons name="search-outline" size={20} color="#2563EB" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search room number, name or OPD..."
              placeholderTextColor="#94A3B8"
              className="flex-1 ml-3 text-xs font-semibold text-slate-800 p-0"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Room Card List */}
        <View className="px-5 mt-2">
          {loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#2563EB" />
              <Text className="text-xs font-semibold text-slate-500 mt-3">
                Loading rooms data...
              </Text>
            </View>
          ) : filteredRooms.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center justify-center border border-slate-200/60 mt-2 shadow-sm">
              <FontAwesome5 name="door-closed" size={44} color="#CBD5E1" />
              <Text className="text-sm font-bold text-slate-700 mt-3">
                No Rooms Found
              </Text>
              <Text className="text-xs text-slate-400 text-center mt-1">
                {searchQuery
                  ? 'Try clearing the search query.'
                  : 'Click "+ Add Room" button to create a new room.'}
              </Text>
            </View>
          ) : (
            filteredRooms.map((item) => (
              <View
                key={item.roomId}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4"
              >
                {/* Header Section */}
                <View className="flex-row justify-between items-start">
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl items-center justify-center mr-3">
                      <FontAwesome5 name="hospital-alt" size={20} color="#2563EB" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center flex-wrap gap-2">
                        <Text className="text-base font-extrabold text-slate-900">
                          Room {item.roomNumber}
                        </Text>
                        <View className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          <Text className="text-[10px] font-black text-blue-700">
                            {item.roomId}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs font-bold text-slate-500 mt-0.5">
                        {item.name || 'General Consultation Room'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
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
                      onPress={() => handleDelete(item.roomId, item.roomNumber)}
                      className="w-9 h-9 bg-red-50 rounded-xl items-center justify-center border border-red-100 ml-2"
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Footer Details */}
                <View className="flex-row items-center justify-between pt-4 border-t border-slate-100 mt-4">
                  <View className="flex-row items-center bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-2xl">
                    <Ionicons name="git-network-outline" size={14} color="#2563EB" />
                    <Text className="text-[11px] font-bold text-slate-700 ml-1.5">
                      OPD: {item.opdId || 'Unassigned'}
                    </Text>
                  </View>

                  <View className="flex-row items-center bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-2xl">
                    <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                    <Text className="text-[11px] font-extrabold text-emerald-700 capitalize">
                      {item.status || 'Active'}
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
          <View className="bg-white rounded-t-[32px] p-6 shadow-2xl">
            <View className="items-center mb-3">
              <View className="w-12 h-1 bg-slate-200 rounded-full" />
            </View>

            <View className="flex-row justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <Text className="text-lg font-black text-slate-900">
                {editingRoom ? 'Edit Room Details' : 'Add New Room'}
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
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Room Number *</Text>
                <TextInput
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                  placeholder="e.g. 101 or 101-A"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800"
                />
              </View>

              <View className="mt-3">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Room Name / Label</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Cardiology Consultation Room"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800"
                />
              </View>

              <View className="mt-3">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Assigned OPD Name / ID</Text>
                <TextInput
                  value={opdId}
                  onChangeText={setOpdId}
                  placeholder="e.g. OPD-01 or General Medicine"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800"
                />
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
                    {editingRoom ? 'Update Room' : 'Create Room'}
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