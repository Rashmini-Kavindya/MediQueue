import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useInbox from '../../hooks/useInbox';
import InboxRow from './InboxRow';

const BLUE = '#0284C7';
const POPUP_LIMIT = 8;

export default function NotificationBell() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const { items, unreadCount, loading, error, load, markRead, markAllRead, remove } = useInbox({
    limit: POPUP_LIMIT,
  });

  // Keep the badge fresh while this screen is in front
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, 30000);
      return () => clearInterval(timer);
    }, [load])
  );

  const routeNames = navigation.getState?.()?.routeNames || [];
  const canSeeAll = routeNames.includes('Notifications');

  const openPopup = () => {
    setOpen(true);
    load();
  };

  const seeAll = () => {
    setOpen(false);
    navigation.navigate('Notifications', { tab: 'messages', scope: 'mine', ts: Date.now() });
  };

  const handleDelete = async (item) => {
    await remove(item);
    load(); // pull in the next notification to fill the list
  };

  return (
    <>
      <TouchableOpacity
        onPress={openPopup}
        hitSlop={8}
        className="p-2 bg-slate-50 rounded-full border border-slate-100"
      >
        <Ionicons name="notifications-outline" size={18} color="#475569" />
        {unreadCount > 0 && (
          <View
            className="absolute bg-red-500 rounded-full items-center justify-center px-1"
            style={{ top: -4, right: -4, minWidth: 16, height: 16 }}
          >
            <Text className="text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setOpen(false)}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.25)' }]}
          />

          <View
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
            style={{
              position: 'absolute',
              top: insets.top + 62,
              right: 12,
              width: Math.min(360, width - 24),
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-3.5 py-3 border-b border-slate-100">
              <View className="flex-row items-center">
                <Text className="text-sm font-bold text-slate-900">Notifications</Text>
                {unreadCount > 0 && (
                  <View className="ml-2 px-2 py-0.5 rounded-full bg-sky-600">
                    <Text className="text-[10px] font-bold text-white">{unreadCount} new</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={markAllRead} disabled={unreadCount === 0} hitSlop={8}>
                <Text
                  className={`text-[11px] font-bold ${
                    unreadCount === 0 ? 'text-slate-300' : 'text-sky-700'
                  }`}
                >
                  Mark all read
                </Text>
              </TouchableOpacity>
            </View>

            {/* List */}
            <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator color={BLUE} />
                </View>
              ) : error && items.length === 0 ? (
                <View className="py-8 px-6 items-center">
                  <Text className="text-xs font-bold text-slate-800">Could not load</Text>
                  <Text className="text-[11px] text-slate-400 text-center mt-1">{error}</Text>
                  <TouchableOpacity onPress={load} className="mt-3">
                    <Text className="text-xs font-bold text-sky-700">Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : items.length === 0 ? (
                <View className="py-10 items-center">
                  <View className="w-12 h-12 rounded-2xl bg-slate-100 items-center justify-center mb-2">
                    <Ionicons name="checkmark-done-outline" size={22} color="#94A3B8" />
                  </View>
                  <Text className="text-xs font-bold text-slate-800">You're all caught up</Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">No notifications yet</Text>
                </View>
              ) : (
                items.map((item) => (
                  <InboxRow
                    key={item.notificationId}
                    item={item}
                    compact
                    onMarkRead={markRead}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </ScrollView>

            {/* Footer */}
            {canSeeAll && (
              <TouchableOpacity
                onPress={seeAll}
                activeOpacity={0.8}
                className="py-3 items-center border-t border-slate-100"
              >
                <Text className="text-xs font-bold text-sky-700">See all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}