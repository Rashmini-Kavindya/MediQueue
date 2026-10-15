import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  listWaitingAreasAdmin, createWaitingAreaAdmin,
  updateWaitingAreaAdmin, deleteWaitingAreaAdmin
} from '../../services/adminManagementApi';

const BLUE = '#155EEF';
const ADMIN_LANGUAGE_KEY = '@mediqueue_admin_management_language_v1';
const LANGUAGE_OPTIONS = [['English','en'], ['සිංහල','si'], ['தமிழ்','ta']];
const TYPE_LABEL = { lobby: 'Lobby', canteen: 'Canteen', waiting_hall: 'Waiting Hall', other: 'Other' };
const BLANK = { name: '', type: 'lobby', location: '', nearbyLandmark: '', seating: '', status: 'active' };
const apiMessage = (e) => e?.response?.data?.message || e?.message || 'Something went wrong.';
const WAITING_TEXT = {
  "en": {
    "title": "Waiting Areas",
    "subtitle": "Hospital management",
    "heading": "Waiting Area Management",
    "hint": "Manage locations and seating capacity",
    "addArea": "Add Area",
    "search": "Search name, location or landmark...",
    "type": "Type",
    "status": "Status",
    "all": "All",
    "lobby": "Lobby",
    "canteen": "Canteen",
    "waiting_hall": "Waiting Hall",
    "other": "Other",
    "active": "Active",
    "inactive": "Inactive",
    "count": "waiting areas",
    "empty": "No waiting areas found.",
    "location": "Location",
    "capacity": "Seating capacity",
    "seats": "seats",
    "nearby": "Nearby",
    "edit": "Edit",
    "delete": "Delete",
    "addModal": "Add Waiting Area",
    "editModal": "Edit Waiting Area",
    "deleteModal": "Delete Waiting Area?",
    "areaName": "Area name",
    "areaType": "Area type",
    "locationField": "Location (building / floor)",
    "landmarkField": "Nearby landmark (optional)",
    "landmarkExample": "e.g. Near the pharmacy",
    "capacityField": "Seating capacity",
    "save": "Save Changes",
    "add": "Add Waiting Area",
    "deleteForever": "Delete Permanently",
    "cancel": "Cancel",
    "close": "Close",
    "deleteConfirm": "Permanently delete “{name}”?",
    "deleteInfo": "This waiting-area record will be removed from MongoDB. This cannot be undone. Patient accounts, tokens, and other waiting areas are not deleted.",
    "validation": "Enter a name, location and whole-number seating capacity (0–10000).",
    "added": "Waiting area added successfully.",
    "updated": "Waiting area updated successfully.",
    "deleted": "Waiting area permanently deleted.",
    "languageTitle": "Display language",
    "languageHint": "Choose the screen language",
    "languageButton": "Change display language",
    "menu": "Open menu",
    "refresh": "Refresh",
    "results": "waiting area",
    "resultsPlural": "waiting areas"
  },
  "si": {
    "title": "පොරොත්තු ප්‍රදේශ",
    "subtitle": "රෝහල් කළමනාකරණය",
    "heading": "පොරොත්තු ප්‍රදේශ කළමනාකරණය",
    "hint": "ස්ථාන සහ ආසන ධාරිතාව කළමනාකරණය",
    "addArea": "ප්‍රදේශය එක් කරන්න",
    "search": "නම, ස්ථානය හෝ ආසන්න සලකුණ සොයන්න...",
    "type": "වර්ගය",
    "status": "තත්ත්වය",
    "all": "සියල්ල",
    "lobby": "පිවිසුම් ශාලාව",
    "canteen": "ආපනශාලාව",
    "waiting_hall": "පොරොත්තු ශාලාව",
    "other": "වෙනත්",
    "active": "සක්‍රීය",
    "inactive": "අක්‍රීය",
    "count": "පොරොත්තු ප්‍රදේශ",
    "empty": "පොරොත්තු ප්‍රදේශ හමු නොවීය.",
    "location": "ස්ථානය",
    "capacity": "ආසන ධාරිතාව",
    "seats": "ආසන",
    "nearby": "ආසන්නයේ",
    "edit": "සංස්කරණය",
    "delete": "මකන්න",
    "addModal": "පොරොත්තු ප්‍රදේශය එක් කරන්න",
    "editModal": "පොරොත්තු ප්‍රදේශය සංස්කරණය",
    "deleteModal": "පොරොත්තු ප්‍රදේශය මකන්නද?",
    "areaName": "ප්‍රදේශයේ නම",
    "areaType": "ප්‍රදේශ වර්ගය",
    "locationField": "ස්ථානය (ගොඩනැගිල්ල / මහල)",
    "landmarkField": "ආසන්න සලකුණ (විකල්ප)",
    "landmarkExample": "උදා: ඖෂධ ශාලාව අසල",
    "capacityField": "ආසන ධාරිතාව",
    "save": "වෙනස්කම් සුරකින්න",
    "add": "පොරොත්තු ප්‍රදේශය එක් කරන්න",
    "deleteForever": "ස්ථිරව මකන්න",
    "cancel": "අවලංගු කරන්න",
    "close": "වසන්න",
    "deleteConfirm": "“{name}” ස්ථිරව මකන්නද?",
    "deleteInfo": "මෙම වාර්තාව MongoDB වෙතින් ස්ථිරව ඉවත් කෙරේ. මෙය ආපසු හැරවිය නොහැක. රෝගී ගිණුම්, ටෝකන සහ වෙනත් පොරොත්තු ප්‍රදේශ මැකෙන්නේ නැත.",
    "validation": "නම, ස්ථානය සහ 0–10000 අතර පූර්ණ සංඛ්‍යා ආසන ධාරිතාවක් ඇතුළත් කරන්න.",
    "added": "පොරොත්තු ප්‍රදේශය එක් කරන ලදී.",
    "updated": "පොරොත්තු ප්‍රදේශය යාවත්කාලීන කරන ලදී.",
    "deleted": "පොරොත්තු ප්‍රදේශය ස්ථිරව මකා දැමුණි.",
    "languageTitle": "දර්ශන භාෂාව",
    "languageHint": "තිරයේ භාෂාව තෝරන්න",
    "languageButton": "දර්ශන භාෂාව වෙනස් කරන්න",
    "menu": "මෙනුව විවෘත කරන්න",
    "refresh": "නැවුම් කරන්න",
    "results": "පොරොත්තු ප්‍රදේශය",
    "resultsPlural": "පොරොත්තු ප්‍රදේශ"
  },
  "ta": {
    "title": "காத்திருப்பு பகுதிகள்",
    "subtitle": "மருத்துவமனை மேலாண்மை",
    "heading": "காத்திருப்பு பகுதி மேலாண்மை",
    "hint": "இடங்களையும் இருக்கை எண்ணிக்கையையும் நிர்வகிக்கவும்",
    "addArea": "பகுதியைச் சேர்",
    "search": "பெயர், இடம் அல்லது அருகிலுள்ள அடையாளம் தேடுக...",
    "type": "வகை",
    "status": "நிலை",
    "all": "அனைத்தும்",
    "lobby": "முகப்பு மண்டபம்",
    "canteen": "உணவகம்",
    "waiting_hall": "காத்திருப்பு மண்டபம்",
    "other": "மற்றவை",
    "active": "செயலில்",
    "inactive": "செயலற்றது",
    "count": "காத்திருப்பு பகுதிகள்",
    "empty": "காத்திருப்பு பகுதிகள் எதுவும் இல்லை.",
    "location": "இடம்",
    "capacity": "இருக்கை கொள்ளளவு",
    "seats": "இருக்கைகள்",
    "nearby": "அருகில்",
    "edit": "திருத்து",
    "delete": "நீக்கு",
    "addModal": "காத்திருப்பு பகுதியைச் சேர்",
    "editModal": "காத்திருப்பு பகுதியைத் திருத்து",
    "deleteModal": "காத்திருப்பு பகுதியை நீக்கவா?",
    "areaName": "பகுதியின் பெயர்",
    "areaType": "பகுதியின் வகை",
    "locationField": "இடம் (கட்டிடம் / தளம்)",
    "landmarkField": "அருகிலுள்ள அடையாளம் (விருப்பம்)",
    "landmarkExample": "எ.கா. மருந்தகம் அருகில்",
    "capacityField": "இருக்கை கொள்ளளவு",
    "save": "மாற்றங்களைச் சேமி",
    "add": "காத்திருப்பு பகுதியைச் சேர்",
    "deleteForever": "நிரந்தரமாக நீக்கு",
    "cancel": "ரத்து செய்",
    "close": "மூடு",
    "deleteConfirm": "“{name}” பகுதியை நிரந்தரமாக நீக்கவா?",
    "deleteInfo": "இந்த பதிவு MongoDB இலிருந்து நிரந்தரமாக அகற்றப்படும். இதை மீட்டெடுக்க முடியாது. நோயாளர் கணக்குகள், டோக்கன்கள், பிற காத்திருப்பு பகுதிகள் நீக்கப்படாது.",
    "validation": "பெயர், இடம் மற்றும் 0–10000 இடையே முழு எண் இருக்கை கொள்ளளவை உள்ளிடவும்.",
    "added": "காத்திருப்பு பகுதி சேர்க்கப்பட்டது.",
    "updated": "காத்திருப்பு பகுதி புதுப்பிக்கப்பட்டது.",
    "deleted": "காத்திருப்பு பகுதி நிரந்தரமாக நீக்கப்பட்டது.",
    "languageTitle": "காட்சி மொழி",
    "languageHint": "திரையின் மொழியைத் தேர்ந்தெடுக்கவும்",
    "languageButton": "காட்சி மொழியை மாற்று",
    "menu": "பட்டியைத் திற",
    "refresh": "புதுப்பி",
    "results": "காத்திருப்பு பகுதி",
    "resultsPlural": "காத்திருப்பு பகுதிகள்"
  }
};

const interpolate = (template, values) => Object.entries(values).reduce(
  (result,[key,value]) => result.split(`{${key}}`).join(String(value)),template
);


export default function WaitingAreaManagement({ navigation }) {
  const safeInsets = useSafeAreaInsets();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...BLANK });
  const [uiLanguage, setUiLanguage] = useState('en');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const t = WAITING_TEXT[uiLanguage] || WAITING_TEXT.en;
  const typeNames = { lobby:t.lobby, canteen:t.canteen, waiting_hall:t.waiting_hall, other:t.other };
  const updateDisplayLanguage = async (language) => {
    setUiLanguage(language);
    setLanguageMenuOpen(false);
    try { await AsyncStorage.setItem(ADMIN_LANGUAGE_KEY, language); }
    catch (storageError) { console.warn('Unable to save Admin language:', storageError); }
  };

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await listWaitingAreasAdmin();
      setAreas(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    load();
    AsyncStorage.getItem(ADMIN_LANGUAGE_KEY)
      .then(value => { if (active && ['en','si','ta'].includes(value)) setUiLanguage(value); })
      .catch(() => {});
    return () => { active = false; };
  }, [load]));

  const refresh = () => { setRefreshing(true); load(); };
  const openCreate = () => { setSelected(null); setForm({ ...BLANK }); setError(''); setModal('form'); };
  const openEdit = (area) => {
    setSelected(area);
    setForm({
      name: area.name || '', type: area.type || 'lobby',
      location: area.location || '', nearbyLandmark: area.nearbyLandmark || '',
      seating: String(area.seating ?? ''), status: area.status || 'active'
    });
    setError(''); setModal('form');
  };
  const openDelete = (area) => { setSelected(area); setError(''); setModal('delete'); };
  const close = () => { if (!busy) { setModal(''); setError(''); } };
  const patch = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const save = async () => {
    if (busy) return;
    const name = form.name.trim();
    const location = form.location.trim();
    const seats = Number(form.seating);
    if (!name || !location || form.seating.trim() === '' || !Number.isInteger(seats) || seats < 0 || seats > 10000) {
      setError(t.validation);
      return;
    }
    const payload = {
      name, type: form.type, location,
      nearbyLandmark: form.nearbyLandmark.trim(),
      seating: seats, status: form.status
    };
    setBusy(true); setError('');
    try {
      if (selected) await updateWaitingAreaAdmin(selected.waitingAreaId, payload);
      else await createWaitingAreaAdmin(payload);
      setModal('');
      setNotice(selected ? t.updated : t.added);
      await load();
    } catch (e) { setError(apiMessage(e)); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      await deleteWaitingAreaAdmin(selected.waitingAreaId);
      setModal(''); setSelected(null);
      setNotice(t.deleted);
      await load();
    } catch (e) { setError(apiMessage(e)); }
    finally { setBusy(false); }
  };

  const filtered = areas.filter(area => {
    const q = search.trim().toLowerCase();
    const matchText = !q || [area.name, area.location, area.nearbyLandmark, area.waitingAreaId]
      .some(value => String(value || '').toLowerCase().includes(q));
    return matchText && (typeFilter === 'all' || area.type === typeFilter) &&
      (statusFilter === 'all' || area.status === statusFilter);
  });

  const chip = (label, value, selectedValue, onPress) => (
    <TouchableOpacity key={value} onPress={() => onPress(value)} accessibilityRole="button"
      style={[styles.chip, selectedValue === value && styles.chipActive]}>
      <Text style={[styles.chipText, selectedValue === value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
  const input = (label, value, onChangeText, extra = {}) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={label}
        placeholderTextColor="#94A3B8" style={styles.input}
        editable={true} showSoftInputOnFocus={true} autoCorrect={false} {...extra} />
    </View>
  );

  return (
    <SafeAreaView style={styles.outer} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.topbar}>
          <TouchableOpacity accessibilityLabel={t.menu} onPress={() => navigation.openDrawer()} style={styles.topIcon}>
            <Ionicons name="menu" size={23} color={BLUE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={styles.headerTitle}>{t.title}</Text><Text style={styles.headerSub}>{t.subtitle}</Text></View>
          <TouchableOpacity accessibilityLabel={t.refresh} onPress={refresh} style={styles.topIcon}>
            <Ionicons name="refresh" size={20} color={BLUE} />
          </TouchableOpacity>
        </View>
        <View style={styles.languageMenuRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.languageButton}
              onPress={() => setLanguageMenuOpen(true)} style={styles.languageMenuButton}>
              <Ionicons name="ellipsis-vertical" size={19} color="#475569" />
            </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="none" contentContainerStyle={styles.content}>
          <View style={styles.headingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>{t.heading}</Text>
              <Text style={styles.hint}>{t.hint}</Text>
            </View>
            <TouchableOpacity onPress={openCreate} style={styles.primarySmall}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.primarySmallText}>{t.addArea}</Text>
            </TouchableOpacity>
          </View>
          {!!notice && <TouchableOpacity onPress={() => setNotice('')} style={styles.notice}>
            <Text style={styles.noticeText}>{notice}  ×</Text></TouchableOpacity>}
          {!!error && !modal && <Text style={styles.error}>{error}</Text>}
          <TextInput value={search} onChangeText={setSearch} style={styles.search}
            placeholder={t.search} placeholderTextColor="#94A3B8"
             editable={true} showSoftInputOnFocus={true} autoCorrect={false} />
          <Text style={styles.filterLabel}>{t.type}</Text>
          <View style={styles.chipRow}>{[
            [t.all, 'all'], [t.lobby, 'lobby'], [t.canteen, 'canteen'],
            [t.waiting_hall, 'waiting_hall'], [t.other, 'other']
          ].map(([label, value]) => chip(label, value, typeFilter, setTypeFilter))}</View>
          <Text style={styles.filterLabel}>{t.status}</Text>
          <View style={styles.chipRow}>{[[t.all,'all'], [t.active,'active'], [t.inactive,'inactive']]
            .map(([label,value]) => chip(label,value,statusFilter,setStatusFilter))}</View>
          <Text style={styles.resultText}>{filtered.length} {filtered.length === 1 ? t.results : t.resultsPlural}</Text>
          {loading ? <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 38 }}/> :
            filtered.length === 0 ? <View style={styles.empty}><Ionicons name="business-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>{t.empty}</Text></View> :
              filtered.map(area => <View key={area.waitingAreaId || area._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.areaIcon}><Ionicons name="business-outline" size={19} color={BLUE}/></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.areaName}>{area.name}</Text>
                    <Text style={styles.areaId}>{area.waitingAreaId}</Text>
                  </View>
                  <View style={[styles.badge, area.status === 'active' ? styles.goodBadge : styles.offBadge]}>
                    <Text style={[styles.badgeText, { color: area.status === 'active' ? '#15803D' : '#64748B' }]}>
                      {area.status === 'active' ? t.active : t.inactive}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detail}>{t.type}: {typeNames[area.type] || area.type}</Text>
                <Text style={styles.detail}>{t.location}: {area.location}</Text>
                <Text style={styles.detail}>{t.capacity}: {area.seating ?? 0} {t.seats}</Text>
                {!!area.nearbyLandmark && <Text style={styles.detail}>{t.nearby}: {area.nearbyLandmark}</Text>}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEdit(area)}>
                    <Ionicons name="create-outline" size={15} color={BLUE}/><Text style={styles.editText}>{t.edit}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => openDelete(area)}>
                    <Ionicons name="trash-outline" size={15} color="#DC2626"/><Text style={styles.deleteText}>{t.delete}</Text>
                  </TouchableOpacity>
                </View>
              </View>)
          }
        </ScrollView>
        <Modal visible={!!modal} transparent animationType="fade" onRequestClose={close}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.scrim, { paddingTop: Math.max(16, safeInsets.top + 8), paddingBottom: Math.max(16, safeInsets.bottom + 8) }]}>
            <View style={styles.modalBox}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{modal === 'delete' ? t.deleteModal : selected ? t.editModal : t.addModal}</Text>
                <TouchableOpacity disabled={busy} onPress={close} accessibilityLabel="Close">
                  <Ionicons name="close-circle-outline" color="#64748B" size={25}/>
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {modal === 'form' ? <>
                  {input(t.areaName,form.name,v=>patch('name',v))}
                  <Text style={styles.fieldLabel}>{t.areaType}</Text>
                  <View style={styles.chipRow}>{Object.entries(typeNames).map(([value,label]) => chip(label,value,form.type,v=>patch('type',v)))}</View>
                  {input(t.locationField,form.location,v=>patch('location',v))}
                  {input(t.landmarkField,form.nearbyLandmark,v=>patch('nearbyLandmark',v),{placeholder:t.landmarkExample})}
                  {input(t.capacityField,form.seating,v=>patch('seating',v),{keyboardType:'number-pad'})}
                  <Text style={styles.fieldLabel}>{t.status}</Text>
                  <View style={styles.chipRow}>{[[t.active,'active'],[t.inactive,'inactive']].map(([label,value])=>chip(label,value,form.status,v=>patch('status',v)))}</View>
                </> : <>
                  <View style={styles.warningIcon}><Ionicons name="warning-outline" size={28} color="#DC2626"/></View>
                  <Text style={styles.deleteConfirm}>{interpolate(t.deleteConfirm,{name:selected?.name || ''})}</Text>
                  <Text style={styles.deleteExplanation}>{t.deleteInfo}</Text>
                </>}
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity disabled={busy} onPress={modal === 'delete' ? confirmDelete : save}
                  style={[styles.confirmButton, modal === 'delete' && styles.dangerButton, busy && {opacity:0.6}]}>
                  {busy ? <ActivityIndicator color="#FFFFFF"/> : <Text style={styles.confirmText}>
                    {modal === 'delete' ? t.deleteForever : selected ? t.save : t.add}
                  </Text>}
                </TouchableOpacity>
                <TouchableOpacity disabled={busy} onPress={close} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>{t.cancel}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <Modal visible={languageMenuOpen} transparent animationType="fade"
          onRequestClose={() => setLanguageMenuOpen(false)}>
          <View style={styles.languageOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setLanguageMenuOpen(false)} />
            <View style={[styles.languageMenuPanel, { top: safeInsets.top + 102 }]}>
              <Text style={styles.languageMenuTitle}>{t.languageTitle}</Text>
              <Text style={styles.languageMenuHint}>{t.languageHint}</Text>
              {LANGUAGE_OPTIONS.map(([label,value]) => (
                <TouchableOpacity key={value} accessibilityRole="button"
                  onPress={() => updateDisplayLanguage(value)}
                  style={[styles.languageOption, uiLanguage === value && styles.languageOptionActive]}>
                  <Text style={[styles.languageOptionText, uiLanguage === value && styles.languageOptionTextActive]}>{label}</Text>
                  {uiLanguage === value && <Ionicons name="checkmark" size={18} color={BLUE} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer:{flex:1,backgroundColor:'#EDF1F5'},screen:{flex:1,maxWidth:760,width:'100%',alignSelf:'center',backgroundColor:'#F8F7FC'},
  topbar:{backgroundColor:'#FFFFFF',borderBottomWidth:1,borderColor:'#E5E7EB',padding:14,flexDirection:'row',alignItems:'center',gap:12},
  topIcon:{width:36,height:36,alignItems:'center',justifyContent:'center',backgroundColor:'#EEF4FF',borderRadius:10},
  headerTitle:{fontSize:17,fontWeight:'800',color:'#111827'},headerSub:{fontSize:10,color:'#94A3B8'},
  languageMenuRow:{alignItems:'flex-end',paddingHorizontal:16,paddingTop:4,paddingBottom:2},
  languageMenuButton:{width:34,height:32,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#EFF4FA'},
  languageOverlay:{flex:1,backgroundColor:'rgba(15,23,42,0.10)'},
  languageMenuPanel:{position:'absolute',right:16,width:230,backgroundColor:'#FFFFFF',borderRadius:14,
    padding:10,borderWidth:1,borderColor:'#E2E8F0',elevation:9,shadowColor:'#000',shadowOpacity:0.14,
    shadowOffset:{width:0,height:4},shadowRadius:12},
  languageMenuTitle:{fontSize:13,fontWeight:'800',color:'#111827',paddingHorizontal:9,paddingTop:6},
  languageMenuHint:{fontSize:10,color:'#64748B',paddingHorizontal:9,marginTop:3,marginBottom:7},
  languageOption:{minHeight:43,flexDirection:'row',alignItems:'center',justifyContent:'space-between',
    borderRadius:9,paddingHorizontal:11},
  languageOptionActive:{backgroundColor:'#EEF4FF'},
  languageOptionText:{fontSize:13,color:'#334155',fontWeight:'600'},
  languageOptionTextActive:{color:BLUE,fontWeight:'800'},
  content:{padding:16,paddingBottom:45},headingRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:17},
  pageTitle:{fontSize:16,fontWeight:'800',color:'#111827'},hint:{fontSize:10,color:'#64748B',marginTop:4},
  primarySmall:{backgroundColor:BLUE,borderRadius:10,paddingHorizontal:11,minHeight:38,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:5},
  primarySmallText:{color:'#FFFFFF',fontWeight:'800',fontSize:11},
  search:{height:44,borderWidth:1,borderColor:'#D9E1EC',borderRadius:11,paddingHorizontal:13,backgroundColor:'#FFFFFF',fontSize:12,color:'#111827'},
  filterLabel:{fontSize:10,fontWeight:'700',color:'#64748B',marginTop:14,marginBottom:7},
  chipRow:{flexDirection:'row',gap:7,flexWrap:'wrap',marginBottom:4},chip:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:20,paddingHorizontal:10,paddingVertical:7,backgroundColor:'#FFFFFF'},
  chipActive:{backgroundColor:'#EAF1FF',borderColor:BLUE},chipText:{fontSize:10,color:'#64748B',fontWeight:'600'},chipTextActive:{color:BLUE,fontWeight:'800'},
  resultText:{marginVertical:13,color:'#64748B',fontSize:11,fontWeight:'700'},
  empty:{marginTop:28,alignItems:'center',padding:25,backgroundColor:'#FFFFFF',borderRadius:15},emptyText:{fontSize:12,color:'#64748B',marginTop:8},
  card:{backgroundColor:'#FFFFFF',borderColor:'#E0E5EC',borderWidth:1,borderRadius:15,padding:15,marginBottom:13},
  cardTop:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:12},areaIcon:{height:36,width:36,borderRadius:11,backgroundColor:'#EAF1FF',alignItems:'center',justifyContent:'center'},
  areaName:{fontSize:14,fontWeight:'800',color:'#111827'},areaId:{fontSize:9,color:'#94A3B8',marginTop:3},
  badge:{borderRadius:16,paddingHorizontal:9,paddingVertical:5},goodBadge:{backgroundColor:'#ECFDF3'},offBadge:{backgroundColor:'#F1F5F9'},badgeText:{fontSize:10,fontWeight:'700'},
  detail:{fontSize:11,color:'#475569',marginVertical:3},actionRow:{flexDirection:'row',gap:10,marginTop:13,borderTopWidth:1,borderTopColor:'#F1F5F9',paddingTop:12},
  editButton:{flex:1,backgroundColor:'#EEF4FF',borderRadius:9,justifyContent:'center',alignItems:'center',flexDirection:'row',padding:10,gap:6},
  editText:{color:BLUE,fontSize:11,fontWeight:'800'},deleteButton:{flex:1,borderWidth:1,borderColor:'#FECACA',borderRadius:9,justifyContent:'center',alignItems:'center',flexDirection:'row',padding:10,gap:6},
  deleteText:{color:'#DC2626',fontSize:11,fontWeight:'800'},
  notice:{backgroundColor:'#ECFDF3',padding:12,borderRadius:10,marginBottom:13},noticeText:{color:'#166534',fontSize:11},
  error:{color:'#B91C1C',backgroundColor:'#FEF2F2',borderRadius:8,padding:10,marginVertical:10,fontSize:11},
  scrim:{flex:1,backgroundColor:'rgba(15,23,42,0.56)',justifyContent:'center',padding:16,alignItems:'center'},
  modalBox:{width:'100%',maxWidth:450,maxHeight:'90%',padding:18,backgroundColor:'#FFFFFF',borderRadius:20},
  modalHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},modalTitle:{fontSize:17,fontWeight:'800',color:'#111827',flex:1},
  field:{marginBottom:13},fieldLabel:{fontSize:11,fontWeight:'700',color:'#334155',marginBottom:7},
  input:{height:43,borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,paddingHorizontal:12,color:'#111827',fontSize:12},
  warningIcon:{alignSelf:'center',height:58,width:58,backgroundColor:'#FEF2F2',borderRadius:29,alignItems:'center',justifyContent:'center',marginVertical:12},
  deleteConfirm:{fontSize:15,fontWeight:'800',color:'#111827',textAlign:'center'},
  deleteExplanation:{fontSize:12,color:'#64748B',textAlign:'center',lineHeight:19,marginVertical:15},
  confirmButton:{backgroundColor:BLUE,minHeight:44,borderRadius:10,alignItems:'center',justifyContent:'center',marginTop:12},
  dangerButton:{backgroundColor:'#DC2626'},confirmText:{color:'#FFFFFF',fontSize:12,fontWeight:'800'},
  cancelButton:{minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,marginTop:10},
  cancelText:{fontSize:12,fontWeight:'700',color:'#334155'}
});
