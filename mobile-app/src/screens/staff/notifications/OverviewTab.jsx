import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStats, getErrorMessage } from '../../../services/adminNotificationService';

const BLUE = '#0284C7';
const RED = '#EF4444';
const GRAY = '#94A3B8';

const TYPE_LABELS = {
  booked: 'Token booked',
  near: 'Turn approaching',
  called: 'Your turn',
  update: 'Updates & announcements',
  QUEUE_UPDATE: 'Queue update',
  YOUR_TURN: 'Your turn',
  TURN_NEAR: 'Turn approaching',
};

const Card = ({ children, className = '' }) => (
  <View className={`bg-white rounded-2xl border border-slate-100 p-4 ${className}`}>
    {children}
  </View>
);

const ProgressBar = ({ percent, color = BLUE }) => (
  <View className="h-2 rounded-full bg-slate-100 overflow-hidden">
    <View
      style={{ width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: color }}
      className="h-2 rounded-full"
    />
  </View>
);

const StatCard = ({ icon, color, label, value }) => (
  <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-3.5">
    <View
      style={{ backgroundColor: `${color}1A` }}
      className="w-8 h-8 rounded-xl items-center justify-center mb-2.5"
    >
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text className="text-xl font-bold text-slate-900">{value}</Text>
    <Text className="text-[11px] font-medium text-slate-500 mt-0.5">{label}</Text>
  </View>
);

const SectionTitle = ({ children }) => (
  <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-5 mb-2 px-1">
    {children}
  </Text>
);

export default function OverviewTab({ refreshKey, onOpenTab }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getStats();
      setStats(res.data);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  // Initial load + header refresh button
  useEffect(() => {
    let alive = true;
    load().finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load, refreshKey]);

  const onPull = async () => {
    setPulling(true);
    await load();
    setPulling(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={BLUE} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-14 h-14 rounded-2xl bg-red-50 items-center justify-center mb-3">
          <Ionicons name="cloud-offline-outline" size={26} color={RED} />
        </View>
        <Text className="text-sm font-bold text-slate-800">Could not load stats</Text>
        <Text className="text-xs text-slate-400 text-center mt-1">{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
          className="mt-4 bg-sky-600 px-5 py-2.5 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-xs font-bold text-white">Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { notifications, delivery, sms, byType } = stats;

  const smsTotal = sms.sent + sms.failed + sms.pending;
  const smsRate = smsTotal ? Math.round((sms.sent / smsTotal) * 100) : 0;

  const typeRows = Object.entries(byType || {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const maxType = typeRows.length ? typeRows[0].count : 1;

  const rateColor = delivery.total === 0 || delivery.successRate >= 80 ? BLUE : RED;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={onPull}
          tintColor={BLUE}
          colors={[BLUE]}
        />
      }
    >
      {/* Error while we still have older data */}
      {!!error && (
        <View className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100">
          <Text className="text-xs font-semibold text-red-600">Refresh failed: {error}</Text>
        </View>
      )}

      {/* Failed deliveries alert */}
      {delivery.failed > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onOpenTab && onOpenTab('logs')}
          className="mb-3 flex-row items-center p-3.5 rounded-2xl bg-red-50 border border-red-100"
        >
          <Ionicons name="alert-circle" size={20} color={RED} />
          <View className="flex-1 ml-2.5">
            <Text className="text-xs font-bold text-red-600">
              {delivery.failed} failed {delivery.failed === 1 ? 'delivery' : 'deliveries'}
            </Text>
            <Text className="text-[11px] text-red-500 mt-0.5">Tap to review the logs</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={RED} />
        </TouchableOpacity>
      )}

      {/* Delivery success hero */}
      <Card>
        <View className="flex-row items-end justify-between mb-3">
          <View>
            <Text className="text-[11px] font-semibold text-slate-500">Delivery success rate</Text>
            <Text style={{ color: rateColor }} className="text-3xl font-bold mt-1">
              {delivery.total === 0 ? '--' : `${delivery.successRate}%`}
            </Text>
          </View>
          <Text className="text-[11px] text-slate-400 mb-1">{delivery.total} attempts</Text>
        </View>

        <ProgressBar percent={delivery.successRate} color={rateColor} />

        <View className="flex-row mt-4">
          {[
            { label: 'Sent', value: delivery.sent, color: BLUE },
            { label: 'Failed', value: delivery.failed, color: RED },
            { label: 'Pending', value: delivery.pending, color: GRAY },
          ].map((item) => (
            <View key={item.label} className="flex-1 flex-row items-center">
              <View
                style={{ backgroundColor: item.color }}
                className="w-2 h-2 rounded-full mr-2"
              />
              <View>
                <Text className="text-sm font-bold text-slate-900">{item.value}</Text>
                <Text className="text-[10px] text-slate-500">{item.label}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Stat cards */}
      <View className="flex-row mt-3" style={{ gap: 12 }}>
        <StatCard
          icon="notifications-outline"
          color={BLUE}
          label="Total notifications"
          value={notifications.total}
        />
        <StatCard
          icon="mail-unread-outline"
          color={BLUE}
          label="Unread"
          value={notifications.unread}
        />
      </View>
      <View className="flex-row mt-3" style={{ gap: 12 }}>
        <StatCard
          icon="speedometer-outline"
          color="#475569"
          label="Avg delivery time"
          value={`${delivery.avgLatencyMs} ms`}
        />
        <StatCard
          icon="close-circle-outline"
          color={delivery.failed > 0 ? RED : GRAY}
          label="Failed deliveries"
          value={delivery.failed}
        />
      </View>

      {/* SMS */}
      <SectionTitle>SMS</SectionTitle>
      <Card>
        {smsTotal === 0 ? (
          <View className="flex-row items-center">
            <Ionicons name="chatbox-outline" size={18} color={GRAY} />
            <Text className="text-xs text-slate-500 ml-2.5 flex-1">
              No SMS sent yet. Patients receive SMS only if they enable it in their alert settings.
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-xs font-bold text-slate-900">SMS delivery</Text>
              <Text className="text-xs font-bold text-slate-900">{smsRate}%</Text>
            </View>
            <ProgressBar percent={smsRate} color={smsRate >= 80 ? BLUE : RED} />
            <View className="flex-row justify-between mt-3">
              <Text className="text-[11px] text-slate-500">
                <Text className="font-bold text-slate-900">{sms.sent}</Text> sent
              </Text>
              <Text className="text-[11px] text-slate-500">
                <Text className="font-bold text-red-600">{sms.failed}</Text> failed
              </Text>
              <Text className="text-[11px] text-slate-500">
                <Text className="font-bold text-slate-900">{sms.pending}</Text> pending
              </Text>
            </View>
          </>
        )}
      </Card>

      {/* By type */}
      <SectionTitle>By notification type</SectionTitle>
      <Card>
        {typeRows.length === 0 ? (
          <Text className="text-xs text-slate-500">No notifications yet.</Text>
        ) : (
          typeRows.map((row, index) => (
            <View key={row.type} className={index === typeRows.length - 1 ? '' : 'mb-3.5'}>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-semibold text-slate-700">
                  {TYPE_LABELS[row.type] || row.type}
                </Text>
                <Text className="text-xs font-bold text-slate-900">{row.count}</Text>
              </View>
              <ProgressBar percent={(row.count / maxType) * 100} />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}