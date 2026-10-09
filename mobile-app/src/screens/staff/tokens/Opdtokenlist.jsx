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
import { useFocusEffect } from '@react-navigation/native';
import { getAdminTokens, getErrorMessage } from '../../../services/Admintokenservice';
import { STATUS_META, FILTERS, formatClock } from './Tokenmeta';

const BLUE = '#0284C7';
const RED = '#EF4444';
const LIMIT = 30;

const Chip = ({ label, count, active, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    className={`flex-row items-center px-3 py-1.5 rounded-full border mr-2 ${
      active ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'
    }`}
  >
    <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>
      {label}
    </Text>
    {count !== undefined && (
      <View className={`ml-1.5 px-1.5 rounded-full ${active ? 'bg-white/25' : 'bg-slate-100'}`}>
        <Text className={`text-[10px] font-bold ${active ? 'text-white' : 'text-slate-500'}`}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

const TokenRow = ({ token, onPress }) => {
  const meta = STATUS_META[token.status] || STATUS_META.waiting;
  const live = token.status === 'called' || token.status === 'in-consultation';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(token)}
      className={`flex-row items-center bg-white rounded-2xl border p-3 mb-2.5 ${
        live ? 'border-sky-300' : 'border-slate-100'
      }`}
    >
      <View
        className={`w-14 h-14 rounded-2xl items-center justify-center mr-3 ${
          live ? 'bg-sky-600' : 'bg-slate-50 border border-slate-100'
        }`}
      >
        <Text className={`text-base font-black ${live ? 'text-white' : 'text-slate-900'}`}>
          {token.tokenNo}
        </Text>
      </View>

      <View className="flex-1 pr-2">
        <View className="flex-row items-center">
          <Text className="text-xs font-bold text-slate-900 flex-shrink" numberOfLines={1}>
            {token.patientName || token.patientId}
          </Text>
          {token.priority > 0 && (
            <Ionicons name="flag" size={12} color={RED} style={{ marginLeft: 6 }} />
          )}
        </View>
        <Text className="text-[11px] text-slate-400 mt-0.5" numberOfLines={1}>
          #{token.tokenSequence} • Booked {formatClock(token.bookedAt || token.createdAt)}
        </Text>
      </View>

      <View className={`px-2.5 py-1 rounded-full ${meta.bg}`}>
        <Text className={`text-[10px] font-bold ${meta.text}`}>{meta.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function OpdTokenList({ opd, queueDate, refreshKey, onOpenToken }) {
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState('');

  const requestRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (pageNum, mode, silent = false) => {
      const id = ++requestRef.current;

      try {
        const params = { opdId: opd.opdId, queueDate, page: pageNum, limit: LIMIT };
        if (filter) params.status = filter;
        if (query) params.search = query;

        const res = await getAdminTokens(params);
        if (id !== requestRef.current) return;

        setItems((prev) => {
          if (mode !== 'append') return res.data;
          const seen = new Set(prev.map((t) => t.tokenId));
          return [...prev, ...res.data.filter((t) => !seen.has(t.tokenId))];
        });
        setCounts(res.statusCounts);
        setPage(res.pagination.page);
        setPages(res.pagination.pages);
        setTotal(res.pagination.total);
        setError('');
      } catch (e) {
        if (id === requestRef.current && !silent) setError(getErrorMessage(e));
      } finally {
        if (id === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setPulling(false);
        }
      }
    },
    [opd.opdId, queueDate, filter, query]
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(1, 'replace');
  }, [fetchPage, refreshKey]);

  // Quietly refresh the first page while the screen is in front
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        if (page === 1) fetchPage(1, 'replace', true);
      }, 20000);
      return () => clearInterval(timer);
    }, [fetchPage, page])
  );

  const loadMore = () => {
    if (loading || loadingMore || pulling || page >= pages) return;
    setLoadingMore(true);
    fetchPage(page + 1, 'append');
  };

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
          <Text className="text-sm font-bold text-slate-800">Could not load tokens</Text>
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
          <Ionicons name="ticket-outline" size={26} color="#94A3B8" />
        </View>
        <Text className="text-sm font-bold text-slate-800">No tokens found</Text>
        <Text className="text-xs text-slate-400 text-center mt-1">
          {query || filter !== '' ? 'Try another filter or search.' : 'No tokens booked for this date.'}
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
            placeholder="Search token, patient name or ID"
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
          className="flex-grow-0"
        >
          {FILTERS.map((f) => {
            const key = f.countKey || f.key || 'all';
            return (
              <Chip
                key={f.key || 'all'}
                label={f.label}
                count={counts ? counts[key === 'active' ? 'active' : key] : undefined}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            );
          })}
        </ScrollView>

        {!loading && !error && (
          <Text className="text-[11px] text-slate-400 px-5 mt-2.5">
            {total} {total === 1 ? 'token' : 'tokens'} in queue order
          </Text>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.tokenId}
        renderItem={({ item }) => <TokenRow token={item} onPress={onOpenToken} />}
        contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 32, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => {
              setPulling(true);
              fetchPage(1, 'replace');
            }}
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
            <Text className="text-[11px] text-slate-400 text-center py-4">End of list</Text>
          ) : null
        }
      />
    </View>
  );
}