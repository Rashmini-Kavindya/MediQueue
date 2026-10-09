import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLogs, getErrorMessage } from '../../../services/adminNotificationService';

const BLUE = '#0284C7';
const RED = '#EF4444';
const LIMIT = 20;

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'failed', label: 'Failed' },
  { key: 'sent', label: 'Sent' },
  { key: 'pending', label: 'Pending' },
];

const CHANNEL_FILTERS = [
  { key: '', label: 'All channels' },
  { key: 'app', label: 'In-app' },
  { key: 'sms', label: 'SMS' },
];

const STATUS_STYLES = {
  sent: { label: 'Sent', bg: 'bg-sky-50', text: 'text-sky-700' },
  failed: { label: 'Failed', bg: 'bg-red-50', text: 'text-red-600' },
  pending: { label: 'Pending', bg: 'bg-slate-100', text: 'text-slate-500' },
};

const TYPE_LABELS = {
  booked: 'Token booked',
  near: 'Turn approaching',
  called: 'Your turn',
  update: 'Update',
  QUEUE_UPDATE: 'Queue update',
  YOUR_TURN: 'Your turn',
  TURN_NEAR: 'Turn approaching',
};

const formatTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
};

const Chip = ({ label, active, onPress, danger }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    className={`px-3 py-1.5 rounded-full border mr-2 ${
      active
        ? danger
          ? 'bg-red-500 border-red-500'
          : 'bg-sky-600 border-sky-600'
        : 'bg-white border-slate-200'
    }`}
  >
    <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

const LogItem = ({ log }) => {
  const failed = log.deliveryStatus === 'failed';
  const notification = log.notification;
  const isSms = String(log.channel).toLowerCase() === 'sms';
  const badge = STATUS_STYLES[log.deliveryStatus] || STATUS_STYLES.pending;

  const title =
    notification?.title || TYPE_LABELS[notification?.type] || 'Notification';
  const user = notification?.userId || log.userId;

  const meta = [
    isSms ? 'SMS' : 'In-app',
    user,
    notification?.tokenId,
    formatTime(log.sentAt),
    `${log.latencyMs ?? 0} ms`,
  ]
    .filter(Boolean)
    .join('  •  ');

  return (
    <View
      className={`bg-white rounded-2xl p-3.5 mb-2.5 border ${
        failed ? 'border-red-100' : 'border-slate-100'
      }`}
    >
      <View className="flex-row items-start">
        <View
          className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
            failed ? 'bg-red-50' : 'bg-sky-50'
          }`}
        >
          <Ionicons
            name={isSms ? 'chatbubble-ellipses-outline' : 'notifications-outline'}
            size={17}
            color={failed ? RED : BLUE}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-slate-900 flex-1 mr-2" numberOfLines={1}>
              {title}
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
              <Text className={`text-[10px] font-bold ${badge.text}`}>{badge.label}</Text>
            </View>
          </View>

          <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={2}>
            {notification?.message || 'Original notification was deleted'}
          </Text>

          {failed && !!log.errorMessage && (
            <View className="mt-2 flex-row p-2 rounded-lg bg-red-50">
              <Ionicons name="warning-outline" size={12} color={RED} style={{ marginTop: 1 }} />
              <Text className="text-[11px] text-red-600 ml-1.5 flex-1">{log.errorMessage}</Text>
            </View>
          )}

          <Text className="text-[10px] text-slate-400 mt-2">{meta}</Text>
        </View>
      </View>
    </View>
  );
};

export default function LogsTab({ refreshKey }) {
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState('');

  // Ignore responses that belong to an older filter / request
  const requestRef = useRef(0);

  const fetchPage = useCallback(
    async (pageNum, mode) => {
      const id = ++requestRef.current;

      try {
        const params = { page: pageNum, limit: LIMIT };
        if (status) params.status = status;
        if (channel) params.channel = channel;

        const res = await getLogs(params);
        if (id !== requestRef.current) return;

        setItems((prev) => {
          if (mode !== 'append') return res.data;
          const seen = new Set(prev.map((l) => l._id));
          return [...prev, ...res.data.filter((l) => !seen.has(l._id))];
        });
        setPage(res.pagination.page);
        setPages(res.pagination.pages);
        setTotal(res.pagination.total);
        setError('');
      } catch (e) {
        if (id === requestRef.current) setError(getErrorMessage(e));
      } finally {
        if (id === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setPulling(false);
        }
      }
    },
    [status, channel]
  );

  // First load, filter change, header refresh button
  useEffect(() => {
    setLoading(true);
    fetchPage(1, 'replace');
  }, [fetchPage, refreshKey]);

  const onPull = () => {
    setPulling(true);
    fetchPage(1, 'replace');
  };

  const loadMore = () => {
    if (loading || loadingMore || pulling || page >= pages) return;
    setLoadingMore(true);
    fetchPage(page + 1, 'append');
  };

  const filtered = !!status || !!channel;

  const renderEmpty = () => {
    if (loading) {
      return (
        <View className="items-center justify-center pt-20">
          <ActivityIndicator color={BLUE} />
        </View>
      );
    }

    if (error) {
      return (
        <View className="items-center px-8 pt-16">
          <View className="w-14 h-14 rounded-2xl bg-red-50 items-center justify-center mb-3">
            <Ionicons name="cloud-offline-outline" size={26} color={RED} />
          </View>
          <Text className="text-sm font-bold text-slate-800">Could not load logs</Text>
          <Text className="text-xs text-slate-400 text-center mt-1">{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              fetchPage(1, 'replace');
            }}
            className="mt-4 bg-sky-600 px-5 py-2.5 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-xs font-bold text-white">Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="items-center px-8 pt-16">
        <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center mb-3">
          <Ionicons name="list-outline" size={26} color="#94A3B8" />
        </View>
        <Text className="text-sm font-bold text-slate-800">No logs found</Text>
        <Text className="text-xs text-slate-400 text-center mt-1">
          {filtered ? 'Try changing the filters.' : 'Delivery logs will appear here.'}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1">
      {/* Filters */}
      <View className="pb-1">
        <View className="flex-row px-4 pb-2">
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.key || 'all'}
              label={f.label}
              active={status === f.key}
              danger={f.key === 'failed'}
              onPress={() => setStatus(f.key)}
            />
          ))}
        </View>
        <View className="flex-row px-4">
          {CHANNEL_FILTERS.map((f) => (
            <Chip
              key={f.key || 'all'}
              label={f.label}
              active={channel === f.key}
              onPress={() => setChannel(f.key)}
            />
          ))}
        </View>
        {!loading && !error && (
          <Text className="text-[11px] text-slate-400 px-5 mt-2.5">
            {total} {total === 1 ? 'log' : 'logs'}
          </Text>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <LogItem log={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 32, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={onPull}
            tintColor={BLUE}
            colors={[BLUE]}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator color={BLUE} />
            </View>
          ) : items.length > 0 && page >= pages ? (
            <Text className="text-[11px] text-slate-400 text-center py-4">End of logs</Text>
          ) : null
        }
      />
    </View>
  );
}