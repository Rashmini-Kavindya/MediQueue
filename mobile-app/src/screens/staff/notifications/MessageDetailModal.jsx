import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getNotification,
  updateNotification,
  deleteNotification,
  getErrorMessage,
} from '../../../services/adminNotificationService';
import { TYPE_LABELS, formatTime, formatAudience, confirmAction } from './messageMeta';

const BLUE = '#0284C7';
const RED = '#EF4444';

const STATUS_STYLES = {
  sent: { label: 'Sent', bg: 'bg-sky-50', text: 'text-sky-700' },
  failed: { label: 'Failed', bg: 'bg-red-50', text: 'text-red-600' },
  pending: { label: 'Pending', bg: 'bg-slate-100', text: 'text-slate-500' },
};

const Label = ({ children }) => (
  <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 mt-5">
    {children}
  </Text>
);

const InfoRow = ({ label, value }) => (
  <View className="flex-row justify-between py-2 border-b border-slate-50">
    <Text className="text-xs text-slate-500">{label}</Text>
    <Text className="text-xs font-semibold text-slate-900 ml-4 flex-1 text-right" numberOfLines={1}>
      {value || '-'}
    </Text>
  </View>
);

export default function MessageDetailModal({ visible, notification, onClose, onUpdated, onDeleted }) {
  const [logs, setLogs] = useState([]);
  const [logSummary, setLogSummary] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const isBroadcast = !!notification?.isBroadcast;
  const id = isBroadcast ? notification?.broadcastId : notification?.notificationId;

  useEffect(() => {
    if (!visible || !notification) return;

    setEditing(false);
    setError('');
    setSaving(false);
    setDeleting(false);
    setTitle(notification.title || '');
    setMessage(notification.message || '');
    setLogs([]);
    setLogSummary([]);
    setLoadingLogs(true);

    let alive = true;
    getNotification(id)
      .then((res) => {
        if (!alive) return;
        setLogs(res.data.logs || []);
        setLogSummary(res.data.logSummary || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoadingLogs(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, id]);

  if (!notification) return null;

  const handleSave = async () => {
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await updateNotification(id, { title: title.trim(), message: message.trim() });
      onUpdated(res.data);
      setEditing(false);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    confirmAction(
      'Delete notification',
      isBroadcast
        ? `This removes it from the inboxes of all ${notification.recipientCount} recipients. Delivery logs are kept.`
        : 'This removes it from the patient\'s inbox. Delivery logs are kept.',
      'Delete',
      async () => {
        setDeleting(true);
        try {
          await deleteNotification(id);
          onDeleted(id);
        } catch (e) {
          setError(getErrorMessage(e));
          setDeleting(false);
        }
      }
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/40 justify-end"
      >
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">
              {editing ? 'Edit notification' : 'Notification details'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} className="p-1">
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {editing ? (
              <>
                {isBroadcast && (
                  <View className="mt-4 p-3 rounded-xl bg-sky-50 border border-sky-100 flex-row">
                    <Ionicons name="information-circle" size={15} color={BLUE} style={{ marginTop: 1 }} />
                    <Text className="text-[11px] text-sky-800 ml-2 flex-1">
                      This changes the notification for all {notification.recipientCount} recipients.
                    </Text>
                  </View>
                )}
                <Label>Title</Label>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Title"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900"
                />
                <Label>Message</Label>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900"
                  style={{ minHeight: 96 }}
                />
              </>
            ) : (
              <>
                <Text className="text-sm font-bold text-slate-900 mt-4">
                  {notification.title || TYPE_LABELS[notification.type] || 'Notification'}
                </Text>
                <View className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mt-2.5">
                  <Text className="text-xs text-slate-700">{notification.message}</Text>
                </View>

                <View className="mt-3">
                  <InfoRow label="Type" value={TYPE_LABELS[notification.type] || notification.type} />
                  <InfoRow label="Source" value={notification.source === 'admin' ? 'Admin' : 'System'} />
                  {isBroadcast ? (
                    <>
                      <InfoRow label="Audience" value={formatAudience(notification.audience)} />
                      <InfoRow label="Recipients" value={String(notification.recipientCount)} />
                    </>
                  ) : (
                    <InfoRow label="Recipient" value={notification.userId} />
                  )}
                  {!isBroadcast && <InfoRow label="Token" value={notification.tokenId} />}
                  <InfoRow label="Sent" value={formatTime(notification.sentAt)} />
                  <InfoRow
                    label="Status"
                    value={
                      isBroadcast
                        ? `${notification.readCount} of ${notification.recipientCount} read`
                        : notification.isRead
                        ? 'Read'
                        : 'Unread'
                    }
                  />
                </View>

                <Label>Delivery</Label>
                {loadingLogs ? (
                  <ActivityIndicator color={BLUE} />
                ) : isBroadcast ? (
                  logSummary.length === 0 ? (
                    <Text className="text-xs text-slate-400">No delivery records.</Text>
                  ) : (
                    logSummary.map((row) => {
                      const badge = STATUS_STYLES[row.deliveryStatus] || STATUS_STYLES.pending;
                      const isSms = String(row.channel).toLowerCase() === 'sms';
                      return (
                        <View
                          key={`${row.channel}-${row.deliveryStatus}`}
                          className="flex-row items-center justify-between py-2 border-b border-slate-50"
                        >
                          <View className="flex-row items-center">
                            <Ionicons
                              name={isSms ? 'chatbubble-ellipses-outline' : 'notifications-outline'}
                              size={14}
                              color="#475569"
                            />
                            <Text className="text-xs font-semibold text-slate-700 ml-2">
                              {isSms ? 'SMS' : 'In-app'}
                            </Text>
                            <Text className="text-[11px] text-slate-400 ml-2">{row.count} users</Text>
                          </View>
                          <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
                            <Text className={`text-[10px] font-bold ${badge.text}`}>{badge.label}</Text>
                          </View>
                        </View>
                      );
                    })
                  )
                ) : logs.length === 0 ? (
                  <Text className="text-xs text-slate-400">No delivery records.</Text>
                ) : (
                  logs.map((log) => {
                    const badge = STATUS_STYLES[log.deliveryStatus] || STATUS_STYLES.pending;
                    const isSms = String(log.channel).toLowerCase() === 'sms';
                    return (
                      <View key={log._id} className="py-2 border-b border-slate-50">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Ionicons
                              name={isSms ? 'chatbubble-ellipses-outline' : 'notifications-outline'}
                              size={14}
                              color="#475569"
                            />
                            <Text className="text-xs font-semibold text-slate-700 ml-2">
                              {isSms ? 'SMS' : 'In-app'}
                            </Text>
                            <Text className="text-[10px] text-slate-400 ml-2">
                              {log.latencyMs ?? 0} ms
                            </Text>
                          </View>
                          <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
                            <Text className={`text-[10px] font-bold ${badge.text}`}>{badge.label}</Text>
                          </View>
                        </View>
                        {log.deliveryStatus === 'failed' && !!log.errorMessage && (
                          <Text className="text-[11px] text-red-600 mt-1.5">{log.errorMessage}</Text>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            )}

            {!!error && (
              <View className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex-row">
                <Ionicons name="alert-circle" size={15} color={RED} style={{ marginTop: 1 }} />
                <Text className="text-xs text-red-600 ml-2 flex-1">{error}</Text>
              </View>
            )}

            {/* Actions */}
            {editing ? (
              <View className="flex-row mt-5" style={{ gap: 12 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setEditing(false);
                    setError('');
                    setTitle(notification.title || '');
                    setMessage(notification.message || '');
                  }}
                  className="flex-1 py-3.5 rounded-2xl items-center bg-slate-100"
                >
                  <Text className="text-sm font-bold text-slate-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSave}
                  disabled={saving}
                  className={`flex-1 py-3.5 rounded-2xl items-center ${
                    saving ? 'bg-sky-400' : 'bg-sky-600'
                  }`}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-sm font-bold text-white">Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row mt-5" style={{ gap: 12 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3.5 rounded-2xl items-center bg-red-50 border border-red-100"
                >
                  {deleting ? (
                    <ActivityIndicator color={RED} />
                  ) : (
                    <Text className="text-sm font-bold text-red-600">Delete</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setEditing(true)}
                  className="flex-1 py-3.5 rounded-2xl items-center bg-sky-600"
                >
                  <Text className="text-sm font-bold text-white">Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}