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
  createNotification,
  getErrorMessage,
} from '../../../services/adminNotificationService';
import { ROLES, AUDIENCE_ALL, confirmAction } from './messageMeta';

const RED = '#EF4444';
const GREEN = '#16A34A';
const GROUPS = [AUDIENCE_ALL, ...ROLES];

// Validation limits (adjust if the backend uses different limits)
const USER_ID_MIN = 3;
const USER_ID_MAX = 50;
const TITLE_MAX = 80;
const MESSAGE_MIN = 3;
const MESSAGE_MAX = 500;

const Label = ({ children }) => (
  <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 mt-4">
    {children}
  </Text>
);

const Segment = ({ label, active, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    className={`flex-1 items-center py-2 rounded-[10px] ${active ? 'bg-white' : ''}`}
  >
    <Text className={`text-xs ${active ? 'font-bold text-sky-700' : 'font-semibold text-slate-500'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

// Message shown under a field: red error or green "looks good"
const FieldFeedback = ({ status, message }) => {
  if (status !== 'error' && status !== 'valid') return null;
  const color = status === 'error' ? RED : GREEN;
  const icon = status === 'error' ? 'alert-circle' : 'checkmark-circle';
  return (
    <View className="flex-row items-center mt-1.5 px-1">
      <Ionicons name={icon} size={14} color={color} />
      <Text className="text-xs ml-1.5 flex-1" style={{ color }}>
        {message}
      </Text>
    </View>
  );
};

export default function MessageFormModal({ visible, onClose, onCreated }) {
  const [mode, setMode] = useState('user'); // 'user' | 'role'
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState(ROLES[0].key);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // UI only: which fields the user has started typing in / left
  const [touched, setTouched] = useState({});

  const markTouched = (key) =>
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  useEffect(() => {
    if (!visible) return;
    setMode('user');
    setUserId('');
    setRole(ROLES[0].key);
    setTitle('');
    setMessage('');
    setSending(false);
    setError('');
    setTouched({});
  }, [visible]);

  /* ---------------- Live validation (derived) ---------------- */

  const cleanUserId = userId.trim();
  const cleanTitle = title.trim();
  const cleanMessage = message.trim();

  let userIdState = { status: 'idle' };
  if (!cleanUserId) {
    if (touched.userId) userIdState = { status: 'error', message: 'Enter the user ID' };
  } else if (/\s/.test(cleanUserId)) {
    userIdState = { status: 'error', message: 'User ID cannot contain spaces' };
  } else if (cleanUserId.length < USER_ID_MIN) {
    userIdState = { status: 'error', message: `User ID must be at least ${USER_ID_MIN} characters` };
  } else if (cleanUserId.length > USER_ID_MAX) {
    userIdState = { status: 'error', message: `User ID must be at most ${USER_ID_MAX} characters` };
  } else {
    userIdState = { status: 'valid', message: 'Looks good' };
  }

  // Title is optional
  let titleState = { status: 'idle' };
  if (title.length > TITLE_MAX) {
    titleState = { status: 'error', message: `Title must be at most ${TITLE_MAX} characters` };
  }

  let messageState = { status: 'idle' };
  if (!cleanMessage) {
    if (touched.message) messageState = { status: 'error', message: 'Message is required' };
  } else if (cleanMessage.length < MESSAGE_MIN) {
    messageState = { status: 'error', message: `Message must be at least ${MESSAGE_MIN} characters` };
  } else if (message.length > MESSAGE_MAX) {
    messageState = { status: 'error', message: `Message must be at most ${MESSAGE_MAX} characters` };
  } else {
    messageState = { status: 'valid', message: 'Looks good' };
  }

  const borderFor = (state) =>
    state.status === 'error' ? 'border-red-300' : 'border-slate-200';

  const send = async () => {
    setSending(true);
    setError('');

    try {
      const payload = {
        message: message.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(mode === 'user' ? { userId: userId.trim() } : { role }),
      };
      const res = await createNotification(payload);
      onCreated(res);
    } catch (e) {
      setError(getErrorMessage(e));
      setSending(false);
    }
  };

  const handleSend = () => {
    // Show every field's error state after a send attempt
    setTouched({ userId: true, message: true });

    if (mode === 'user') {
      if (!cleanUserId) {
        setError('Enter the user ID');
        return;
      }
      if (userIdState.status === 'error') {
        setError(userIdState.message);
        return;
      }
    }
    if (!cleanMessage) {
      setError('Message is required');
      return;
    }
    if (messageState.status === 'error') {
      setError(messageState.message);
      return;
    }
    if (titleState.status === 'error') {
      setError(titleState.message);
      return;
    }
    setError('');

    if (mode === 'role') {
      const label = GROUPS.find((r) => r.key === role)?.label || role;
      confirmAction(
        role === 'all' ? 'Send to everyone?' : `Send to all ${label.toLowerCase()}?`,
        role === 'all'
          ? 'This will send the message to every active user, in all roles.'
          : `This will send the message to all active ${label.toLowerCase()}.`,
        'Send',
        send
      );
      return;
    }

    send();
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
            <Text className="text-base font-bold text-slate-900">New notification</Text>
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
            <Label>Send to</Label>
            <View className="flex-row bg-slate-200/70 rounded-xl p-0.5">
              <Segment label="One user" active={mode === 'user'} onPress={() => setMode('user')} />
              <Segment label="A group" active={mode === 'role'} onPress={() => setMode('role')} />
            </View>

            {mode === 'user' ? (
              <View>
                <TextInput
                  value={userId}
                  onChangeText={(v) => {
                    setUserId(v);
                    markTouched('userId');
                    if (error) setError('');
                  }}
                  onBlur={() => markTouched('userId')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="User ID"
                  placeholderTextColor="#94A3B8"
                  className={`mt-3 bg-slate-50 border ${borderFor(userIdState)} rounded-xl px-3.5 py-3 text-sm text-slate-900`}
                />
                <FieldFeedback status={userIdState.status} message={userIdState.message} />
              </View>
            ) : (
              <View className="flex-row flex-wrap mt-3">
                {GROUPS.map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    activeOpacity={0.8}
                    onPress={() => setRole(r.key)}
                    className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${
                      role === r.key ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        role === r.key ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Label>Title (optional)</Label>
            <TextInput
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                if (error) setError('');
              }}
              placeholder="Announcement"
              placeholderTextColor="#94A3B8"
              className={`bg-slate-50 border ${borderFor(titleState)} rounded-xl px-3.5 py-3 text-sm text-slate-900`}
            />
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <FieldFeedback status={titleState.status} message={titleState.message} />
              </View>
              <Text className="text-[11px] text-slate-400 mt-1.5 ml-2">
                {title.length}/{TITLE_MAX}
              </Text>
            </View>

            <Label>Message</Label>
            <TextInput
              value={message}
              onChangeText={(v) => {
                setMessage(v);
                markTouched('message');
                if (error) setError('');
              }}
              onBlur={() => markTouched('message')}
              multiline
              textAlignVertical="top"
              placeholder="Type your message"
              placeholderTextColor="#94A3B8"
              className={`bg-slate-50 border ${borderFor(messageState)} rounded-xl px-3.5 py-3 text-sm text-slate-900`}
              style={{ minHeight: 96 }}
            />
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <FieldFeedback status={messageState.status} message={messageState.message} />
              </View>
              <Text
                className="text-[11px] mt-1.5 ml-2"
                style={{ color: message.length > MESSAGE_MAX ? RED : '#94A3B8' }}
              >
                {message.length}/{MESSAGE_MAX}
              </Text>
            </View>

            <Text className="text-[11px] text-slate-400 mt-2">
              Delivered in the app only. SMS is used just for token booked, turn approaching and
              your turn alerts.
            </Text>

            {!!error && (
              <View className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex-row">
                <Ionicons name="alert-circle" size={15} color={RED} style={{ marginTop: 1 }} />
                <Text className="text-xs text-red-600 ml-2 flex-1">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSend}
              disabled={sending}
              className={`mt-5 py-3.5 rounded-2xl items-center ${
                sending ? 'bg-sky-400' : 'bg-sky-600'
              }`}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-bold text-white">Send notification</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}