import React, { useEffect, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminToken } from '../../../services/Admintokenservice';
import { STATUS_META, formatDateTime, formatDuration } from './Tokenmeta';

const BLUE = '#0284C7';
const RED = '#EF4444';

const Label = ({ children }) => (
  <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 mt-5">
    {children}
  </Text>
);

const InfoRow = ({ label, value, selectable }) => (
  <View className="flex-row justify-between py-2.5 border-b border-slate-50">
    <Text className="text-xs text-slate-500">{label}</Text>
    <Text
      selectable={selectable}
      className="text-xs font-semibold text-slate-900 ml-4 flex-1 text-right"
      numberOfLines={1}
    >
      {value || '-'}
    </Text>
  </View>
);

const Metric = ({ label, value }) => (
  <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 items-center">
    <Text className="text-sm font-bold text-slate-900">{value}</Text>
    <Text className="text-[10px] text-slate-500 mt-0.5">{label}</Text>
  </View>
);

export default function TokenDetailModal({ visible, token, opdName, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const tokenId = token?.tokenId;

  useEffect(() => {
    if (!visible || !tokenId) return;

    setDetail(null);
    setLoading(true);

    let alive = true;
    getAdminToken(tokenId)
      .then((res) => alive && setDetail(res.data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [visible, tokenId]);

  if (!token) return null;

  // Show the list data straight away, enrich when the detail request returns
  const t = { ...token, ...(detail || {}) };
  const meta = STATUS_META[t.status] || STATUS_META.waiting;

  const timeline = [
    { label: 'Booked', time: t.bookedAt || t.createdAt, icon: 'ticket-outline', color: '#64748B' },
    { label: 'Called', time: t.calledAt, icon: 'megaphone-outline', color: BLUE },
    { label: 'Consultation started', time: t.consultationStartedAt, icon: 'medkit-outline', color: BLUE },
    { label: 'Completed', time: t.completedAt, icon: 'checkmark-done-outline', color: '#0F172A' },
    { label: 'Cancelled', time: t.cancelledAt, icon: 'close-circle-outline', color: RED },
  ].filter((step) => step.time);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">Token details</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} className="p-1">
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 28 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View className="items-center pt-5">
              <View className="w-24 h-24 rounded-3xl bg-sky-50 border-2 border-sky-500 items-center justify-center">
                <Text className="text-3xl font-black text-sky-700">{t.tokenNo}</Text>
              </View>
              <View className={`mt-3 px-3.5 py-1.5 rounded-full flex-row items-center ${meta.bg}`}>
                <Ionicons
                  name={meta.icon}
                  size={13}
                  color={meta.text === 'text-white' ? '#FFFFFF' : meta.color}
                />
                <Text className={`text-xs font-bold ml-1.5 ${meta.text}`}>{meta.label}</Text>
              </View>
              {t.status === 'cancelled' && !!t.cancelReason && (
                <Text className="text-[11px] text-red-600 mt-2 text-center">{t.cancelReason}</Text>
              )}
            </View>

            {/* Quick numbers */}
            <View className="flex-row mt-5" style={{ gap: 10 }}>
              <Metric
                label="Patients ahead"
                value={
                  loading && !detail
                    ? '...'
                    : t.patientsAhead === null || t.patientsAhead === undefined
                    ? '-'
                    : t.patientsAhead
                }
              />
              <Metric
                label="Waited"
                value={loading && !detail ? '...' : formatDuration(t.metrics?.waitMinutes)}
              />
              <Metric
                label="Consultation"
                value={loading && !detail ? '...' : formatDuration(t.metrics?.consultationMinutes)}
              />
            </View>

            {/* Info */}
            <Label>Details</Label>
            <InfoRow label="OPD" value={t.opdName || opdName || t.opdId} />
            <InfoRow label="Queue date" value={t.queueDate} />
            <InfoRow label="Queue position" value={`#${t.tokenSequence}`} />
            <InfoRow label="Patient" value={t.patientName} />
            <InfoRow label="Patient ID" value={t.patientId} selectable />
            {t.userId && t.userId !== t.patientId && (
              <InfoRow label="Booked by" value={t.userId} selectable />
            )}
            <InfoRow label="Doctor" value={t.doctorId} />
            <InfoRow label="Room" value={t.roomId} />
            <InfoRow label="Priority" value={t.priority > 0 ? `Priority ${t.priority}` : 'Normal'} />
            <InfoRow label="Tracking code" value={t.trackingCode} selectable />
            <InfoRow label="Token ID" value={t.tokenId} selectable />

            {/* Timeline */}
            <Label>Timeline</Label>
            {timeline.map((step, index) => (
              <View key={step.label} className="flex-row">
                <View className="items-center mr-3">
                  <View
                    style={{ backgroundColor: `${step.color}1A` }}
                    className="w-8 h-8 rounded-full items-center justify-center"
                  >
                    <Ionicons name={step.icon} size={15} color={step.color} />
                  </View>
                  {index < timeline.length - 1 && <View className="w-px flex-1 bg-slate-200 my-1" />}
                </View>
                <View className={index < timeline.length - 1 ? 'pb-4 flex-1' : 'flex-1'}>
                  <Text className="text-xs font-bold text-slate-900 mt-1.5">{step.label}</Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(step.time)}</Text>
                </View>
              </View>
            ))}

            {loading && !detail && (
              <View className="pt-4">
                <ActivityIndicator color={BLUE} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}