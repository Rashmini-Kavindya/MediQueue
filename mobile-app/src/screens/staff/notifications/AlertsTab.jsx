import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAlertPreferences, getErrorMessage } from '../../../services/adminNotificationService';
import AlertPreferenceModal from './AlertPreferenceModal';
import { LANGS } from './templateMeta';
import { formatTime } from './messageMeta';

const BLUE = '#0284C7';
const RED = '#EF4444';
const LIMIT = 20;

const LANGUAGE_FILTERS = [{ key: '', label: 'All' }, ...LANGS.map((l) => ({ key: l.key, label: l.label }))];

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

const PreferenceItem = ({ item, onPress }) => {
  const smsOn = (item.channels || []).includes('sms');
  const lang = LANGS.find((l) => l.key === item.language);
  const name = item.user?.name;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      className="bg-white rounded-2xl border border-slate-100 p-3.5 mb-2.5"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
            {name || item.userId}
          </Text>
          <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
            {[name ? item.userId : null, item.user?.role].filter(Boolean).join('  •  ') ||
              'Unknown user'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </View>

      <View className="flex-row flex-wrap items-center mt-3">
        <View className="flex-row items-center px-2.5 py-1 rounded-lg bg-slate-100 mr-2 mb-1">
          <Ionicons name="people-outline" size={12} color="#475569" />
          <Text className="text-[11px] font-semibold text-slate-700 ml-1.5">
            Alert at {item.threshold} ahead
          </Text>
        </View>

        <View className="px-2.5 py-1 rounded-lg bg-sky-50 mr-2 mb-1">
          <Text className="text-[11px] font-semibold text-sky-700">In-app</Text>
        </View>

        {smsOn && (
          <View className="px-2.5 py-1 rounded-lg bg-sky-600 mr-2 mb-1">
            <Text className="text-[11px] font-semibold text-white">SMS</Text>
          </View>
        )}

        <View className="px-2.5 py-1 rounded-lg bg-slate-100 mb-1">
          <Text className="text-[11px] font-semibold text-slate-700">
            {lang ? lang.short : String(item.language).toUpperCase()}
          </Text>
        </View>
      </View>

      <Text className="text-[10px] text-slate-400 mt-1.5">Updated {formatTime(item.updatedAt)}</Text>
    </TouchableOpacity>
  );
};

export default function AlertsTab({ refreshKey }) {
  const [language, setLanguage] = useState('');
  const [smsOnly, setSmsOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, smsEnabled: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const requestRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (pageNum, mode) => {
      const id = ++requestRef.current;

      try {
        const params = { page: pageNum, limit: LIMIT };
        if (language) params.language = language;
        if (smsOnly) params.channel = 'sms';
        if (query) params.search = query;

        const res = await getAlertPreferences(params);
        if (id !== requestRef.current) return;

        setItems((prev) => {
          if (mode !== 'append') return res.data;
          const seen = new Set(prev.map((p) => p._id));
          return [...prev, ...res.data.filter((p) => !seen.has(p._id))];
        });
        setSummary(res.summary || { total: 0, smsEnabled: 0 });
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
    [language, smsOnly, query]
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

  const openEdit = (item) => {
    setSelected(item);
    setModalVisible(true);
  };

  const handleUpdated = (updated) => {
    setItems((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setModalVisible(false);
    // SMS counts in the summary may have changed
    fetchPage(1, 'replace');
  };

  const handleReset = (userId) => {
    setItems((prev) => prev.filter((p) => p.userId !== userId));
    setTotal((t) => Math.max(0, t - 1));
    setModalVisible(false);
    fetchPage(1, 'replace');
  };

  const filtered = !!(language || smsOnly || query);

  const renderHeader = () => (
    <View className="flex-row mb-3" style={{ gap: 12 }}>
      <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-3.5">
        <Text className="text-xl font-bold text-slate-900">{summary.total}</Text>
        <Text className="text-[11px] font-medium text-slate-500 mt-0.5">Saved preferences</Text>
      </View>
      <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-3.5">
        <Text className="text-xl font-bold text-sky-700">{summary.smsEnabled}</Text>
        <Text className="text-[11px] font-medium text-slate-500 mt-0.5">SMS enabled</Text>
      </View>
    </View>
  );

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
          <Text className="text-sm font-bold text-slate-800">Could not load preferences</Text>
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
      <View className="items-center px-8 pt-12">
        <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center mb-3">
          <Ionicons name="options-outline" size={26} color="#94A3B8" />
        </View>
        <Text className="text-sm font-bold text-slate-800">No preferences found</Text>
        <Text className="text-xs text-slate-400 text-center mt-1">
          {filtered
            ? 'Try changing the filters or search.'
            : 'A preference is saved when a patient changes their alert settings.'}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <View className="pb-1">
        <View className="mx-4 mb-2 flex-row items-center bg-white border border-slate-200 rounded-xl px-3">
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by user ID"
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

        <View className="flex-row flex-wrap px-4">
          {LANGUAGE_FILTERS.map((f) => (
            <Chip
              key={f.key || 'all'}
              label={f.label}
              active={language === f.key}
              onPress={() => setLanguage(f.key)}
            />
          ))}
          <Chip label="SMS on" active={smsOnly} onPress={() => setSmsOnly((v) => !v)} />
        </View>

        {!loading && !error && (
          <Text className="text-[11px] text-slate-400 px-5 mt-2.5">
            {total} {total === 1 ? 'preference' : 'preferences'}
          </Text>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PreferenceItem item={item} onPress={openEdit} />}
        ListHeaderComponent={!loading && !error ? renderHeader : null}
        contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 32, flexGrow: 1 }}
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

      <AlertPreferenceModal
        visible={modalVisible}
        preference={selected}
        onClose={() => setModalVisible(false)}
        onUpdated={handleUpdated}
        onReset={handleReset}
      />
    </View>
  );
}