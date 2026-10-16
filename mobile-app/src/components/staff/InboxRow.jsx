import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TYPE_LABELS,
  TYPE_ICONS,
  formatTime,
} from '../../screens/staff/notifications/messageMeta';

const BLUE = '#0284C7';
const RED = '#EF4444';

// One notification in the logged-in user's inbox.
// compact = used inside the header popup, otherwise a card for the Messages tab.
export default function InboxRow({ item, compact = false, onMarkRead, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const unread = !item.isRead;
  const title = item.title || TYPE_LABELS[item.type] || 'Notification';

  const handlePress = () => {
    setExpanded((e) => !e);
    if (unread && onMarkRead) onMarkRead(item);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      className={
        compact
          ? `flex-row items-start px-3.5 py-3 border-b border-slate-100 ${
              unread ? 'bg-sky-50/60' : 'bg-white'
            }`
          : `flex-row items-start rounded-2xl border p-3.5 mb-2.5 bg-white ${
              unread ? 'border-sky-100' : 'border-slate-100'
            }`
      }
    >
      <View
        className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
          unread ? 'bg-sky-100' : 'bg-slate-100'
        }`}
      >
        <Ionicons
          name={TYPE_ICONS[item.type] || 'notifications-outline'}
          size={17}
          color={unread ? BLUE : '#94A3B8'}
        />
      </View>

      <View className="flex-1 mr-2">
        <View className="flex-row items-center">
          {unread && <View className="w-2 h-2 rounded-full bg-sky-600 mr-1.5" />}
          <Text
            className={`text-xs flex-1 ${
              unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'
            }`}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <Text
          className="text-[11px] text-slate-500 mt-0.5"
          numberOfLines={expanded ? undefined : 2}
        >
          {item.message}
        </Text>
        <Text className="text-[10px] text-slate-400 mt-1.5">{formatTime(item.sentAt)}</Text>
      </View>

      <View className="items-center" style={{ gap: 6 }}>
        {unread && (
          <TouchableOpacity
            onPress={() => onMarkRead && onMarkRead(item)}
            hitSlop={6}
            className="w-7 h-7 rounded-lg bg-sky-50 items-center justify-center"
          >
            <Ionicons name="checkmark" size={15} color={BLUE} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete && onDelete(item)}
          hitSlop={6}
          className="w-7 h-7 rounded-lg bg-red-50 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={14} color={RED} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}