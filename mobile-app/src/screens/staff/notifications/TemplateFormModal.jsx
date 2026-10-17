import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createTemplate,
  updateTemplate,
  getErrorMessage,
} from '../../../services/adminNotificationService';
import { TYPES, LANGS, renderPreview } from './templateMeta';

const BLUE = '#0284C7';
const RED = '#EF4444';

const Label = ({ children }) => (
  <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 mt-4">
    {children}
  </Text>
);

const Option = ({ label, active, disabled, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    disabled={disabled}
    onPress={onPress}
    className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${
      active ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'
    } ${disabled && !active ? 'opacity-40' : ''}`}
  >
    <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function TemplateFormModal({
  visible,
  mode,
  template,
  presetType,
  existing = [],
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit';

  const [type, setType] = useState('booked');
  const [language, setLanguage] = useState('en');
  const [body, setBody] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    setSaving(false);

    if (isEdit && template) {
      setType(template.type);
      setLanguage(template.language);
      setBody(template.body);
      setActive(template.status === 'active');
    } else {
      const t = presetType || 'booked';
      // Pick the first language that does not have a template yet
      const free = LANGS.find(
        (l) => !existing.some((x) => x.type === t && x.language === l.key)
      );
      setType(t);
      setLanguage(free ? free.key : 'en');
      setBody('');
      setActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isEdit, template, presetType]);

  const typeMeta = TYPES.find((t) => t.key === type);
  const smsLimit = language === 'en' ? 160 : 70;
  const overLimit = body.length > smsLimit;

  const insertPlaceholder = (name) => {
    setBody((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}{{${name}}}`);
  };

  const handleSave = async () => {
    const trimmed = body.trim();

    if (!trimmed) {
      setError('Message body is required');
      return;
    }
    if (!isEdit && existing.some((x) => x.type === type && x.language === language)) {
      setError('A template for this type and language already exists. Edit that one instead.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const status = active ? 'active' : 'inactive';
      const res = isEdit
        ? await updateTemplate(template._id, { body: trimmed, status })
        : await createTemplate({ type, language, body: trimmed, status });

      onSaved(res.data, isEdit);
    } catch (e) {
      setError(getErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/40 justify-end"
      >
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '90%' }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">
              {isEdit ? 'Edit template' : 'New template'}
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
            {/* Type */}
            <Label>Type</Label>
            <View className="flex-row flex-wrap">
              {TYPES.map((t) => (
                <Option
                  key={t.key}
                  label={t.label}
                  active={type === t.key}
                  disabled={isEdit}
                  onPress={() => setType(t.key)}
                />
              ))}
            </View>
            {!!typeMeta && (
              <Text className="text-[11px] text-slate-400 -mt-1">{typeMeta.hint}</Text>
            )}

            {/* Language */}
            <Label>Language</Label>
            <View className="flex-row flex-wrap">
              {LANGS.map((l) => (
                <Option
                  key={l.key}
                  label={l.label}
                  active={language === l.key}
                  disabled={isEdit}
                  onPress={() => setLanguage(l.key)}
                />
              ))}
            </View>
            {isEdit && (
              <Text className="text-[11px] text-slate-400 -mt-1">
                Type and language cannot be changed. Create a new template instead.
              </Text>
            )}

            {/* Body */}
            <Label>Message</Label>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
              placeholder="e.g. Your turn is approaching. Token {{tokenNo}}"
              placeholderTextColor="#94A3B8"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900"
              style={{ minHeight: 96 }}
            />

            <View className="flex-row items-center justify-between mt-1.5">
              <Text className={`text-[10px] ${overLimit ? 'text-red-500' : 'text-slate-400'}`}>
                {body.length}/{smsLimit} characters
                {overLimit ? ' (SMS may be split)' : ''}
              </Text>
            </View>

            {/* Placeholder chips */}
            <Text className="text-[11px] text-slate-500 mt-3 mb-1.5">Tap to insert:</Text>
            <View className="flex-row flex-wrap">
              {(typeMeta?.placeholders || []).map((p) => (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.8}
                  onPress={() => insertPlaceholder(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-100 mr-2 mb-2"
                >
                  <Text className="text-[11px] font-semibold text-sky-700">{`{{${p}}}`}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            {!!body.trim() && (
              <>
                <Label>Preview</Label>
                <View className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                  <Text className="text-xs text-slate-700">{renderPreview(body)}</Text>
                </View>
              </>
            )}

            {/* Status */}
            <View className="flex-row items-center justify-between mt-5">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-slate-900">Active</Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Inactive templates are skipped and the English / built-in message is used.
                </Text>
              </View>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: '#CBD5E1', true: BLUE }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#CBD5E1"
              />
            </View>

            {!!error && (
              <View className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex-row">
                <Ionicons name="alert-circle" size={15} color={RED} style={{ marginTop: 1 }} />
                <Text className="text-xs text-red-600 ml-2 flex-1">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={saving}
              className={`mt-5 py-3.5 rounded-2xl items-center ${
                saving ? 'bg-sky-400' : 'bg-sky-600'
              }`}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  {isEdit ? 'Save changes' : 'Create template'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}