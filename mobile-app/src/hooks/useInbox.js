import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteMyNotification,
  getErrorMessage,
} from '../services/inboxService';

// Every useInbox instance (bell + inbox tab) reloads when any of them changes something,
// so the badge and the lists always agree.
const listeners = new Set();
const emitChange = () => listeners.forEach((fn) => fn());

const showNotice = (message) => {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('Error', message);
  }
};

export default function useInbox({ limit } = {}) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getMyNotifications(limit ? { limit } : {});
      setItems(res.data);
      setUnreadCount(
        typeof res.unreadCount === 'number'
          ? res.unreadCount
          : res.data.filter((n) => !n.isRead).length
      );
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    listeners.add(load);
    return () => listeners.delete(load);
  }, [load]);

  const markRead = async (item) => {
    if (item.isRead) return;

    setItems((prev) =>
      prev.map((n) => (n.notificationId === item.notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await markNotificationRead(item.notificationId);
      emitChange();
    } catch (e) {
      showNotice(getErrorMessage(e));
      load();
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
      emitChange();
    } catch (e) {
      showNotice(getErrorMessage(e));
      load();
    }
  };

  const remove = async (item) => {
    setItems((prev) => prev.filter((n) => n.notificationId !== item.notificationId));
    if (!item.isRead) setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await deleteMyNotification(item.notificationId);
      emitChange();
    } catch (e) {
      showNotice(getErrorMessage(e));
      load();
    }
  };

  return { items, unreadCount, loading, error, load, markRead, markAllRead, remove };
}