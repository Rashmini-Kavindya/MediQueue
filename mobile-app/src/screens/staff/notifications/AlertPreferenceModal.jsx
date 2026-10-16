import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  updateAlertPreference,
  deleteAlertPreference,
  getErrorMessage,
} from '../../../services/adminNotificationService';
import { LANGS } from './templateMeta';
import { confirmAction } from './messageMeta';

const BLUE = '#0284C7';
const RED = '#EF4444';
const MAX_THRESHOLD = 20;

const Label = ({ children }) => (
  <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 mt-5">
    {children}
  </Text>
);

const StepButton = ({ icon, disabled, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    disabled={disabled}
    onPress={onPress}
    className={`w-10 h-10 rounded-full items-center justify-center ${
      disabled ? 'bg-slate-100' : 'bg-sky-50 border border-sky-100'
    }`}
  >
    <Ionicons name={icon} size={20} color={disabled ? '#CBD5E1' : BLUE} />
  </TouchableOpacity>
);

export default function AlertPreferenceModal({ visible, preference, onClose, onUpdated, onReset }) {
  const [threshold, setThreshold] = useState(5);
  const [sms, setSms] = useState(false);
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !preference) return;
    setThreshold(preference.threshold ?? 5);
    setSms((preference.channels || []).includes('sms'));
    setLanguage(preference.language || 'en');
    setSaving(false);
    setResetting(false);
    setError('');
  }, [visible, preference]);

  if (!preference) return null;

  const name = preference.user?.name;

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await updateAlertPreference(preference.userId, {
        threshold,
        // In-app is always on; SMS is the only optional channel
        channels: sms ? ['app', 'sms'] : ['app'],
        language,
      });
      onUpdated({ ...preference, ...res.data });
    } catch (e) {
      setError(getErrorMessage(e));
      setSaving(false);
    }
  };

  const handleReset = () => {
    confirmAction(
      'Reset to defaults',
      'This removes the saved settings. The patient goes back to: alert at 5 patients ahead, in-app only, English.',
      'Reset',
      async () => {
        setResetting(true);
        try {
          await deleteAlertPreference(preference.userId);
          onReset(preference.userId);
        } catch (e) {
          setError(getErrorMessage(e));
          setResetting(false);
        }
      }
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
                {name || preference.userId}
              </Text>
              {!!name && (
                <Text className="text-[11px] text-slate-400 mt-0.5">{preference.userId}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} className="p-1">
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Threshold */}
            <Label>Alert threshold</Label>
            <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center">
              <View className="flex-row items-center" style={{ gap: 24 }}>
                <StepButton
                  icon="remove"
                  disabled={threshold <= 1}
                  onPress={() => setThreshold((t) => Math.max(1, t - 1))}
                />
                <View className="items-center" style={{ minWidth: 56 }}>
                  <Text className="text-3xl font-bold text-slate-900">{threshold}</Text>
                  <Text className="text-[10px] text-slate-400">patients ahead</Text>
                </View>
                <StepButton
                  icon="add"
                  disabled={threshold >= MAX_THRESHOLD}
                  onPress={() => setThreshold((t) => Math.min(MAX_THRESHOLD, t + 1))}
                />
              </View>
              <Text className="text-[11px] text-slate-500 text-center mt-3">
                "Your turn is approaching" is sent when {threshold} or fewer patients are ahead.
              </Text>
            </View>

            {/* Channels */}
            <Label>Channels</Label>
            <View className="flex-row items-center justify-between py-2.5">
              <View className="flex-row items-center flex-1">
                <Ionicons name="notifications-outline" size={18} color="#475569" />
                <View className="ml-3">
                  <Text className="text-sm font-semibold text-slate-900">In-app</Text>
                  <Text className="text-[11px] text-slate-400">Always on</Text>
                </View>
              </View>
              <Switch
                value
                disabled
                trackColor={{ false: '#CBD5E1', true: BLUE }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View className="flex-row items-center justify-between py-2.5 border-t border-slate-100">
              <View className="flex-row items-center flex-1">
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#475569" />
                <View className="ml-3 flex-1 pr-3">
                  <Text className="text-sm font-semibold text-slate-900">SMS</Text>
                  <Text className="text-[11px] text-slate-400">
                    Token booked, turn approaching and your turn only
                  </Text>
                </View>
              </View>
              <Switch
                value={sms}
                onValueChange={setSms}
                trackColor={{ false: '#CBD5E1', true: BLUE }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#CBD5E1"
              />
            </View>

            {/* Language */}
            <Label>Language</Label>
            <View className="flex-row flex-wrap">
              {LANGS.map((l) => (
                <TouchableOpacity
                  key={l.key}
                  activeOpacity={0.8}
                  onPress={() => setLanguage(l.key)}
                  className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${
                    language === l.key ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      language === l.key ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {!!error && (
              <View className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 flex-row">
                <Ionicons name="alert-circle" size={15} color={RED} style={{ marginTop: 1 }} />
                <Text className="text-xs text-red-600 ml-2 flex-1">{error}</Text>
              </View>
            )}

            <View className="flex-row mt-5" style={{ gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleReset}
                disabled={resetting || saving}
                className="flex-1 py-3.5 rounded-2xl items-center bg-red-50 border border-red-100"
              >
                {resetting ? (
                  <ActivityIndicator color={RED} />
                ) : (
                  <Text className="text-sm font-bold text-red-600">Reset</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={saving || resetting}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}