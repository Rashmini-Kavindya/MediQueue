import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getTemplates,
  updateTemplate,
  deleteTemplate,
  getErrorMessage,
} from '../../../services/adminNotificationService';
import TemplateFormModal from './TemplateFormModal';
import { TYPES, LANGS } from './templateMeta';

const BLUE = '#0284C7';
const RED = '#EF4444';

const showNotice = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const confirmDelete = (message, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Delete template', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
};

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

const TemplateCard = ({ template, busy, onEdit, onToggle, onDelete }) => {
  const isActive = template.status === 'active';
  const lang = LANGS.find((l) => l.key === template.language);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onEdit(template)}
      className={`bg-white rounded-2xl border border-slate-100 p-3.5 mb-2 ${
        isActive ? '' : 'opacity-60'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="px-2 py-0.5 rounded-md bg-sky-50">
            <Text className="text-[10px] font-bold text-sky-700">
              {lang ? lang.short : template.language.toUpperCase()}
            </Text>
          </View>
          <Text className="text-[11px] text-slate-400 ml-2">{lang ? lang.label : ''}</Text>
        </View>

        <View className="flex-row items-center">
          <Text className="text-[11px] font-semibold text-slate-500 mr-1">
            {isActive ? 'Active' : 'Inactive'}
          </Text>
          <Switch
            value={isActive}
            disabled={busy}
            onValueChange={() => onToggle(template)}
            trackColor={{ false: '#CBD5E1', true: BLUE }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#CBD5E1"
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </View>
      </View>

      <Text className="text-xs text-slate-700 mt-1.5" numberOfLines={3}>
        {template.body}
      </Text>

      <View className="flex-row items-center justify-between mt-3">
        <Text className="text-[10px] text-slate-400">Tap to edit</Text>
        <TouchableOpacity
          onPress={() => onDelete(template)}
          hitSlop={8}
          className="p-1.5 rounded-lg bg-red-50"
        >
          <Ionicons name="trash-outline" size={14} color={RED} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function TemplatesTab({ refreshKey }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [busyId, setBusyId] = useState('');

  const [modal, setModal] = useState({ visible: false, mode: 'create', template: null, presetType: null });

  const load = useCallback(async () => {
    try {
      const res = await getTemplates();
      setTemplates(res.data);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, refreshKey]);

  const onPull = async () => {
    setPulling(true);
    await load();
    setPulling(false);
  };

  const openCreate = (presetType = null) =>
    setModal({ visible: true, mode: 'create', template: null, presetType });

  const openEdit = (template) =>
    setModal({ visible: true, mode: 'edit', template, presetType: null });

  const closeModal = () => setModal((m) => ({ ...m, visible: false }));

  const handleSaved = (saved, isEdit) => {
    setTemplates((prev) =>
      isEdit ? prev.map((t) => (t._id === saved._id ? saved : t)) : [...prev, saved]
    );
    closeModal();
  };

  const handleToggle = async (template) => {
    const nextStatus = template.status === 'active' ? 'inactive' : 'active';
    setBusyId(template._id);

    try {
      const res = await updateTemplate(template._id, { status: nextStatus });
      setTemplates((prev) => prev.map((t) => (t._id === template._id ? res.data : t)));
    } catch (e) {
      showNotice('Error', getErrorMessage(e));
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = (template) => {
    const typeLabel = TYPES.find((t) => t.key === template.type)?.label || template.type;
    const langLabel = LANGS.find((l) => l.key === template.language)?.label || template.language;

    confirmDelete(`Delete the ${langLabel} "${typeLabel}" template?`, async () => {
      try {
        await deleteTemplate(template._id);
        setTemplates((prev) => prev.filter((t) => t._id !== template._id));
      } catch (e) {
        showNotice('Error', getErrorMessage(e));
      }
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={BLUE} />
      </View>
    );
  }

  if (error && templates.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-14 h-14 rounded-2xl bg-red-50 items-center justify-center mb-3">
          <Ionicons name="cloud-offline-outline" size={26} color={RED} />
        </View>
        <Text className="text-sm font-bold text-slate-800">Could not load templates</Text>
        <Text className="text-xs text-slate-400 text-center mt-1">{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
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
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={BLUE} colors={[BLUE]} />
        }
      >
        {/* How it works */}
        <View className="flex-row p-3.5 rounded-2xl bg-sky-50 border border-sky-100 mb-3">
          <Ionicons name="information-circle" size={17} color={BLUE} style={{ marginTop: 1 }} />
          <Text className="text-[11px] text-sky-800 ml-2 flex-1">
            Patients get the template in their preferred language. If it is missing or inactive, the
            English template is used, then the built-in message.
          </Text>
        </View>

        {/* Language filter */}
        <View className="flex-row mb-1">
          <Chip label="All" active={langFilter === ''} onPress={() => setLangFilter('')} />
          {LANGS.map((l) => (
            <Chip
              key={l.key}
              label={l.label}
              active={langFilter === l.key}
              onPress={() => setLangFilter(l.key)}
            />
          ))}
        </View>

        {/* Groups by type */}
        {TYPES.map((type) => {
          const ofType = templates.filter((t) => t.type === type.key);
          const visible = ofType
            .filter((t) => !langFilter || t.language === langFilter)
            .sort(
              (a, b) =>
                LANGS.findIndex((l) => l.key === a.language) -
                LANGS.findIndex((l) => l.key === b.language)
            );
          const missing = LANGS.filter((l) => !ofType.some((t) => t.language === l.key));

          return (
            <View key={type.key} className="mt-5">
              <View className="flex-row items-center justify-between mb-2 px-1">
                <View className="flex-1 pr-3">
                  <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    {type.label}
                  </Text>
                  {missing.length > 0 && (
                    <Text className="text-[10px] text-slate-400 mt-0.5">
                      Missing: {missing.map((l) => l.short).join(', ')}
                    </Text>
                  )}
                </View>
                {missing.length > 0 && (
                  <TouchableOpacity
                    onPress={() => openCreate(type.key)}
                    hitSlop={8}
                    className="flex-row items-center"
                  >
                    <Ionicons name="add-circle-outline" size={15} color={BLUE} />
                    <Text className="text-[11px] font-bold text-sky-700 ml-1">Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              {visible.length === 0 ? (
                <View className="p-3.5 rounded-2xl bg-white border border-dashed border-slate-200">
                  <Text className="text-[11px] text-slate-400 text-center">
                    {ofType.length === 0
                      ? 'No templates yet. The built-in English message is used.'
                      : 'No templates in this language.'}
                  </Text>
                </View>
              ) : (
                visible.map((t) => (
                  <TemplateCard
                    key={t._id}
                    template={t}
                    busy={busyId === t._id}
                    onEdit={openEdit}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openCreate(null)}
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-sky-600 items-center justify-center"
        style={{
          shadowColor: '#0284C7',
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <TemplateFormModal
        visible={modal.visible}
        mode={modal.mode}
        template={modal.template}
        presetType={modal.presetType}
        existing={templates}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </View>
  );
}