import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StaffScreen from '../../components/staff/StaffScreen';
import StatusPill from '../../components/staff/StatusPill';

// TODO: replace this mock data with API calls (GET /queue, POST /queue/call-next ...)
const INITIAL_QUEUE = [
  { token: 'A-120', status: 'WAITING' },
  { token: 'A-121', status: 'WAITING' },
  { token: 'A-122', status: 'WAITING' },
];

export default function QueueScreen() {
  const [current, setCurrent] = useState('A-119');
  const [queue, setQueue] = useState(INITIAL_QUEUE);

  const waitingCount = queue.filter((q) => q.status === 'WAITING').length;

  const callNext = () => {
    const next = queue.find((q) => q.status === 'WAITING');
    if (!next) {
      Alert.alert('Queue is empty', 'There are no waiting patients.');
      return;
    }
    setCurrent(next.token);
    setQueue((prev) => prev.filter((q) => q.token !== next.token));
  };

  const recall = () => {
    if (!current) return;
    Alert.alert('Recall', `Calling ${current} again.`);
  };

  const hold = () => {
    if (!current) return;
    setQueue((prev) => [...prev, { token: current, status: 'HOLD' }]);
    setCurrent(null);
  };

  const skip = () => {
    if (!current) return;
    Alert.alert('Skip patient', `Skip ${current}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip', style: 'destructive', onPress: () => setCurrent(null) },
    ]);
  };

  return (
    <StaffScreen title="QUEUE MANAGEMENT">
      {/* Currently serving */}
      <View className="bg-white border border-slate-200 rounded-2xl p-5 items-center mb-4">
        <View className="flex-row items-center bg-slate-100 rounded-full px-3 py-1">
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          <Text className="text-[9px] font-bold text-slate-600 tracking-wider">CURRENTLY SERVING</Text>
        </View>

        <Text className="text-6xl font-extrabold text-slate-900 my-5">{current || '—'}</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={callNext}
          className="w-full bg-[#0052CC] rounded-xl py-3.5 flex-row items-center justify-center"
        >
          <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
          <Text className="text-white font-bold text-xs tracking-wide ml-2">CALL NEXT PATIENT</Text>
        </TouchableOpacity>

        <View className="flex-row w-full mt-2.5" style={{ gap: 8 }}>
          {[
            { label: 'RECALL', icon: 'refresh-outline', onPress: recall },
            { label: 'HOLD', icon: 'pause-circle-outline', onPress: hold },
            { label: 'SKIP', icon: 'play-skip-forward-outline', onPress: skip },
          ].map((b) => (
            <TouchableOpacity
              key={b.label}
              activeOpacity={0.7}
              onPress={b.onPress}
              className="flex-1 border border-slate-200 rounded-xl py-2.5 flex-row items-center justify-center"
            >
              <Ionicons name={b.icon} size={14} color="#475569" />
              <Text className="text-[10px] font-bold text-slate-600 ml-1">{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Upcoming queue */}
      <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <View className="flex-row items-center justify-between px-4 py-3 bg-slate-50">
          <Text className="text-[11px] font-bold text-slate-800 tracking-wide">UPCOMING QUEUE</Text>
          <View className="bg-slate-200 rounded-full px-2 py-0.5">
            <Text className="text-[9px] font-bold text-slate-600">{waitingCount} Waiting</Text>
          </View>
        </View>

        <View className="flex-row px-4 py-2 border-b border-slate-100">
          <Text className="flex-1 text-[9px] font-bold text-slate-400 tracking-wider">TOKEN NUMBER</Text>
          <Text className="flex-1 text-[9px] font-bold text-slate-400 tracking-wider">STATUS</Text>
          <Text className="w-16 text-right text-[9px] font-bold text-slate-400 tracking-wider">ACTIONS</Text>
        </View>

        {queue.length === 0 ? (
          <Text className="text-center text-xs text-slate-400 py-6">No patients in the queue.</Text>
        ) : (
          queue.map((q) => (
            <View key={q.token} className="flex-row items-center px-4 py-3.5 border-b border-slate-100">
              <Text className="flex-1 text-sm font-bold text-slate-900">{q.token}</Text>
              <View className="flex-1">
                <StatusPill status={q.status} />
              </View>
              <TouchableOpacity
                className="w-16 items-end"
                onPress={() => Alert.alert('Details', `Details for ${q.token} coming soon.`)}
              >
                <Text className="text-[11px] font-bold text-blue-600">Details ›</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </StaffScreen>
  );
}