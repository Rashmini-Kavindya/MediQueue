import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StaffScreen from '../../components/staff/StaffScreen';
import StatusPill from '../../components/staff/StatusPill';

const STATUS_OPTIONS = ['WAITING', 'CALLED', 'CONSULTING', 'COMPLETED', 'HOLD', 'NO SHOW'];

// TODO: replace with API data
const INITIAL_PATIENTS = [
  { token: 'A-119', name: 'Sunil Perera', dept: 'General OPD', status: 'CONSULTING' },
  { token: 'A-118', name: 'Kamal Silva', dept: 'General OPD', status: 'COMPLETED' },
  { token: 'A-120', name: 'Nimal Jayasuriya', dept: 'General OPD', status: 'CALLED' },
];

export default function ConsultationScreen({ navigation }) {
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [selectedToken, setSelectedToken] = useState('A-119');
  const selected = patients.find((p) => p.token === selectedToken);
  const [newStatus, setNewStatus] = useState(selected?.status || 'WAITING');

  const selectPatient = (p) => {
    setSelectedToken(p.token);
    setNewStatus(p.status);
  };

  const updateStatus = () => {
    setPatients((prev) => prev.map((p) => (p.token === selectedToken ? { ...p, status: newStatus } : p)));
    // TODO: PATCH /queue/:token { status: newStatus }
  };

  const activeCount = patients.filter((p) => p.status === 'CONSULTING' || p.status === 'CALLED').length;

  const footer = (
    <View className="px-4 py-3 bg-white border-t border-slate-100">
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={!selected}
        onPress={() =>
          navigation.navigate('AddPrescription', { token: selected?.token, name: selected?.name })
        }
        className="bg-[#0F3FCC] rounded-xl py-3.5 items-center"
        style={{ opacity: selected ? 1 : 0.5 }}
      >
        <Text className="text-white font-bold text-xs tracking-wide">ADD PRESCRIPTION</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <StaffScreen title="CONSULTATION STATUS" footer={footer}>
      {/* Update status */}
      <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-[11px] font-bold text-slate-800 tracking-wide">UPDATE STATUS</Text>
          <Text className="text-[9px] font-semibold text-slate-400">ACTION REQUIRED</Text>
        </View>

        <View className="bg-slate-50 border border-slate-200 rounded-xl p-4 items-center mb-4">
          <View className="flex-row items-center bg-blue-50 rounded-full px-2.5 py-1">
            <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5" />
            <Text className="text-[8px] font-bold text-blue-700 tracking-wider">SELECTED PATIENT</Text>
          </View>
          <Text className="text-3xl font-extrabold text-slate-900 mt-2">{selected?.token || '—'}</Text>
          <Text className="text-xs text-slate-700 mt-1">
            <Text className="font-bold">{selected?.name || 'No patient selected'}</Text>
            {selected ? `  (${selected.dept})` : ''}
          </Text>
        </View>

        <Text className="text-[9px] font-bold text-slate-500 tracking-wider mb-2">SELECT NEW STATUS:</Text>
        <View className="flex-row flex-wrap justify-between">
          {STATUS_OPTIONS.map((s) => {
            const active = newStatus === s;
            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.7}
                onPress={() => setNewStatus(s)}
                className={`w-[48.5%] rounded-lg border py-3 items-center mb-2 ${
                  active ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-[10px] font-bold tracking-wide ${active ? 'text-white' : 'text-slate-600'}`}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={updateStatus}
          className="bg-slate-900 rounded-xl py-3.5 flex-row items-center justify-center mt-2"
        >
          <Text className="text-white font-bold text-xs tracking-wide mr-2">UPDATE STATUS</Text>
          <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Current consultations */}
      <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-[11px] font-bold text-slate-800 tracking-wide">CURRENT CONSULTATIONS</Text>
          <Text className="text-[9px] font-semibold text-slate-400">{activeCount} ACTIVE</Text>
        </View>

        <View className="flex-row px-4 py-2 bg-slate-50">
          <Text className="w-14 text-[9px] font-bold text-slate-400 tracking-wider">TOKEN</Text>
          <Text className="flex-1 text-[9px] font-bold text-slate-400 tracking-wider">PATIENT</Text>
          <Text className="w-28 text-right text-[9px] font-bold text-slate-400 tracking-wider">STATUS</Text>
        </View>

        {patients.map((p) => (
          <TouchableOpacity
            key={p.token}
            activeOpacity={0.7}
            onPress={() => selectPatient(p)}
            className={`flex-row items-center px-4 py-3.5 border-t border-slate-100 ${
              p.token === selectedToken ? 'bg-blue-50' : 'bg-white'
            }`}
          >
            <Text className="w-14 text-xs font-bold text-slate-900">{p.token}</Text>
            <Text className="flex-1 text-xs text-slate-700" numberOfLines={1}>
              {p.name}
            </Text>
            <View className="w-28 items-end">
              <StatusPill status={p.status} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </StaffScreen>
  );
}