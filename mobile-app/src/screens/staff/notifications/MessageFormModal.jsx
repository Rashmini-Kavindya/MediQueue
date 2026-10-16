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
const GROUPS = [AUDIENCE_ALL, ...ROLES];

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

export default function MessageFormModal({ visible, onClose, onCreated }) {
  const [mode, setMode] = useState('user'); // 'user' | 'role'
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState(ROLES[0].key);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMode('user');
    setUserId('');
    setRole(ROLES[0].key);
    setTitle('');
    setMessage('');
    setSending(false);
    setError('');
  }, [visible]);

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
    if (mode === 'user' && !userId.trim()) {
      setError('Enter the user ID');
      return;
    }
    if (!message.trim()) {
      setError('Message is required');
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
              <TextInput
                value={userId}
                onChangeText={setUserId}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="User ID"
                placeholderTextColor="#94A3B8"
                className="mt-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900"
              />
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
              onChangeText={setTitle}
              placeholder="Announcement"
              placeholderTextColor="#94A3B8"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900"
            />

            <Label>Message</Label>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              placeholder="Type your message"
              placeholderTextColor="#94A3B8"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900"
              style={{ minHeight: 96 }}
            />

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