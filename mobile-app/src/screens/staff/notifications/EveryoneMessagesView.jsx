import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, getErrorMessage } from '../../../services/adminNotificationService';
import MessageFormModal from './MessageFormModal';
import MessageDetailModal from './MessageDetailModal';
import { TYPE_LABELS, TYPE_ICONS, formatTime, formatAudience, showNotice } from './messageMeta';

const BLUE = '#0284C7';
const RED = '#EF4444';
const LIMIT = 20;

const TYPE_FILTERS = [
  { key: '', label: 'All types' },
  { key: 'booked', label: 'Booked' },
  { key: 'near', label: 'Approaching' },
  { key: 'called', label: 'Your turn' },
  { key: 'update', label: 'Update' },
];

const READ_FILTERS = [
  { key: '', label: 'All' },
  { key: 'false', label: 'Unread' },
  { key: 'true', label: 'Read' },
];

const SOURCE_FILTERS = [
  { key: '', label: 'Any source' },
  { key: 'system', label: 'System' },
  { key: 'admin', label: 'Admin' },
];

const Chip = ({ label, active, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    className={`px-3 py-1.5 rounded-full border mr-2 ${
      active ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'
    }`}
  >
    <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

const MessageItem = ({ item, onPress }) => {
  const title = item.title || TYPE_LABELS[item.type] || 'Notification';
  const isAdmin = item.source === 'admin';

  const isBroadcast = !!item.isBroadcast;
  const meta = isBroadcast
    ? [
        `To: ${formatAudience(item.audience)}`,
        `${item.recipientCount} ${item.recipientCount === 1 ? 'user' : 'users'}`,
        `${item.readCount} read`,
        formatTime(item.sentAt),
      ].join('  •  ')
    : [item.userId, item.tokenId, formatTime(item.sentAt)].filter(Boolean).join('  •  ');

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      className="bg-white rounded-2xl border border-slate-100 p-3.5 mb-2.5"
    >
      <View className="flex-row items-start">
        <View className="w-9 h-9 rounded-xl bg-sky-50 items-center justify-center mr-3">
          <Ionicons
            name={isBroadcast ? 'people-outline' : TYPE_ICONS[item.type] || 'notifications-outline'}
            size={17}
            color={BLUE}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              {!isBroadcast && !item.isRead && <View className="w-2 h-2 rounded-full bg-sky-600 mr-1.5" />}
              <Text className="text-xs font-bold text-slate-900 flex-1" numberOfLines={1}>
                {title}
              </Text>
            </View>
            <View className={`px-2 py-0.5 rounded-full ${isAdmin ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <Text
                className={`text-[10px] font-bold ${isAdmin ? 'text-white' : 'text-slate-500'}`}
              >
                {isAdmin ? 'Admin' : 'System'}
              </Text>
            </View>
          </View>

          <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={2}>
            {item.message}
          </Text>
          <Text className="text-[10px] text-slate-400 mt-2">{meta}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function EveryoneMessagesView({ refreshKey }) {
  const [type, setType] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);

  const requestRef = useRef(0);

  // Wait for the admin to stop typing before searching
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (pageNum, mode) => {
      const id = ++requestRef.current;

      try {
        const params = { page: pageNum, limit: LIMIT };
        if (type) params.type = type;
        if (readFilter) params.isRead = readFilter;
        if (source) params.source = source;
        if (query) params.search = query;

        const res = await getNotifications(params);
        if (id !== requestRef.current) return;

        setItems((prev) => {
          if (mode !== 'append') return res.data;
          const seen = new Set(prev.map((n) => n._id));
          return [...prev, ...res.data.filter((n) => !seen.has(n._id))];
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
    [type, readFilter, source, query]
  );

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

  const openDetail = (item) => {
    setSelected(item);
    setDetailVisible(true);
  };

  const handleUpdated = (updated) => {
    setItems((prev) =>
      prev.map((n) =>
        (n.broadcastId && n.broadcastId === updated.broadcastId) || n._id === updated._id
          ? { ...n, ...updated, _id: n._id }
          : n
      )
    );
    setSelected(updated);
  };

  const handleDeleted = (notificationId) => {
    setItems((prev) =>
      prev.filter((n) => n.notificationId !== notificationId && n.broadcastId !== notificationId)
    );
    setTotal((t) => Math.max(0, t - 1));
    setDetailVisible(false);
  };

  const handleCreated = (res) => {
    setCreateVisible(false);
    showNotice('Sent', res.message || 'Notification sent');
    setLoading(true);
    fetchPage(1, 'replace');
  };

  const filtered = !!(type || readFilter || source || query);

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
          <Text className="text-sm font-bold text-slate-800">Could not load notifications</Text>
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
          <Ionicons name="chatbubble-ellipses-outline" size={26} color="#94A3B8" />
        </View>
        <Text className="text-sm font-bold text-slate-800">No notifications found</Text>
        <Text className="text-xs text-slate-400 text-center mt-1">
          {filtered ? 'Try changing the filters or search.' : 'Tap + to send the first one.'}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1">
      {/* Search + filters */}
      <View className="pb-1">
        <View className="mx-4 mb-2 flex-row items-center bg-white border border-slate-200 rounded-xl px-3">
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search message, user or token"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 py-2.5 px-2 text-xs text-slate-900"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="mb-2 flex-grow-0"
        >
          {TYPE_FILTERS.map((f) => (
            <Chip
              key={f.key || 'all'}
              label={f.label}
              active={type === f.key}
              onPress={() => setType(f.key)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
          className="flex-grow-0"
        >
          {READ_FILTERS.map((f) => (
            <Chip
              key={`r-${f.key || 'all'}`}
              label={f.label}
              active={readFilter === f.key}
              onPress={() => setReadFilter(f.key)}
            />
          ))}
          <View className="w-px h-4 bg-slate-300 mr-2" />
          {SOURCE_FILTERS.map((f) => (
            <Chip
              key={`s-${f.key || 'all'}`}
              label={f.label}
              active={source === f.key}
              onPress={() => setSource(f.key)}
            />
          ))}
        </ScrollView>

        {!loading && !error && (
          <Text className="text-[11px] text-slate-400 px-5 mt-2.5">
            {total} {total === 1 ? 'notification' : 'notifications'}
          </Text>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <MessageItem item={item} onPress={openDetail} />}
        contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={BLUE} colors={[BLUE]} />
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator color={BLUE} />
            </View>
          ) : items.length > 0 && page >= pages ? (
            <Text className="text-[11px] text-slate-400 text-center py-4">End of list</Text>
          ) : null
        }
      />

      {/* Floating add button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setCreateVisible(true)}
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-sky-600 items-center justify-center"
        style={{
          shadowColor: '#0284C7',
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <MessageFormModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={handleCreated}
      />

      <MessageDetailModal
        visible={detailVisible}
        notification={selected}
        onClose={() => setDetailVisible(false)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </View>
  );
}