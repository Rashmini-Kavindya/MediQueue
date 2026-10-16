import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useInbox from '../../../hooks/useInbox';
import InboxRow from '../../../components/staff/InboxRow';

const BLUE = '#0284C7';
const RED = '#EF4444';

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

// The logged-in admin's own notifications (same data as the header bell)
export default function MyInboxView({ refreshKey }) {
  const { items, unreadCount, loading, error, load, markRead, markAllRead, remove } = useInbox({
    limit: 100,
  });
  const [filter, setFilter] = useState('all');
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const onPull = async () => {
    setPulling(true);
    await load();
    setPulling(false);
  };

  const shown = filter === 'unread' ? items.filter((n) => !n.isRead) : items;

  const renderEmpty = () => {
    if (loading) {
      return (
        <View className="items-center justify-center pt-20">
          <ActivityIndicator color={BLUE} />
        </View>
      );
    }

    if (error && items.length === 0) {
      return (
        <View className="items-center px-8 pt-16">
          <View className="w-14 h-14 rounded-2xl bg-red-50 items-center justify-center mb-3">
            <Ionicons name="cloud-offline-outline" size={26} color={RED} />
          </View>
          <Text className="text-sm font-bold text-slate-800">Could not load your inbox</Text>
          <Text className="text-xs text-slate-400 text-center mt-1">{error}</Text>
          <TouchableOpacity onPress={load} className="mt-4 bg-sky-600 px-5 py-2.5 rounded-xl">
            <Text className="text-xs font-bold text-white">Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="items-center px-8 pt-16">
        <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center mb-3">
          <Ionicons name="checkmark-done-outline" size={26} color="#94A3B8" />
        </View>
        <Text className="text-sm font-bold text-slate-800">You're all caught up</Text>
        <Text className="text-xs text-slate-400 text-center mt-1">
          {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 pb-2">
        <View className="flex-row">
          <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip
            label={`Unread${unreadCount ? ` (${unreadCount})` : ''}`}
            active={filter === 'unread'}
            onPress={() => setFilter('unread')}
          />
        </View>

        <TouchableOpacity
          onPress={markAllRead}
          disabled={unreadCount === 0}
          activeOpacity={0.8}
          className={`flex-row items-center px-3 py-1.5 rounded-full ${
            unreadCount === 0 ? 'bg-slate-100' : 'bg-sky-50 border border-sky-100'
          }`}
        >
          <Ionicons
            name="checkmark-done"
            size={14}
            color={unreadCount === 0 ? '#CBD5E1' : BLUE}
          />
          <Text
            className={`text-[11px] font-bold ml-1 ${
              unreadCount === 0 ? 'text-slate-300' : 'text-sky-700'
            }`}
          >
            Read all
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(item) => item.notificationId}
        renderItem={({ item }) => (
          <InboxRow item={item} onMarkRead={markRead} onDelete={remove} />
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 32, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={BLUE} colors={[BLUE]} />
        }
      />
    </View>
  );
}