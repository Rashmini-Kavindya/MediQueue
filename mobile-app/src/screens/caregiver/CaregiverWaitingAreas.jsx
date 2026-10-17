import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';
import { getWaitingAreas } from '../../services/caregiverApi';

// iOS system colors (same palette as the patient screens)
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.14)',
  greenDark: '#248A3D',
  red: '#FF3B30',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  chevron: '#C7C7CC',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
  groupedBg: '#F2F2F7',
  white: '#FFFFFF'
};
const cardShadow = {
  shadowColor: '#0B1B3A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 2
};

// Localized text for this new screen; no existing translation file is overwritten.
const COPY = {
  en: {
    title: 'Waiting Areas', subtitle: 'Find a comfortable place while you wait',
    search: 'Search by name, location or landmark...', all: 'All',
    lobby: 'Lobby', canteen: 'Canteen', hall: 'Waiting Hall', other: 'Other',
    capacity: 'Total seating capacity', seats: 'seats', near: 'Nearby',
    active: 'Active', areas: 'waiting areas', refresh: 'Refresh',
    empty: 'No waiting areas found', emptyDetail: 'Try a different search or filter.',
    none: 'No active waiting areas are available right now.',
    error: 'Unable to load waiting areas. Please try again.', retry: 'Try Again'
  },
  si: {
    title: 'රැඳී සිටින ස්ථාන', subtitle: 'රැඳී සිටීමට සුදුසු ස්ථානයක් සොයා ගන්න',
    search: 'නම, ස්ථානය හෝ ආසන්න සලකුණ සොයන්න...', all: 'සියල්ල',
    lobby: 'ප්‍රධාන ශාලාව', canteen: 'ආපන ශාලාව', hall: 'රැඳී සිටින ශාලාව', other: 'වෙනත්',
    capacity: 'මුළු ආසන ධාරිතාව', seats: 'ආසන', near: 'ආසන්නයේ',
    active: 'සක්‍රීය', areas: 'රැඳී සිටින ස්ථාන', refresh: 'නැවුම් කරන්න',
    empty: 'ස්ථාන හමු නොවීය', emptyDetail: 'වෙනත් සෙවීමක් හෝ පෙරහනක් භාවිත කරන්න.',
    none: 'දැනට සක්‍රීය රැඳී සිටින ස්ථාන නොමැත.',
    error: 'රැඳී සිටින ස්ථාන ලබා ගැනීමට නොහැකි විය.', retry: 'නැවත උත්සාහ කරන්න'
  },
  ta: {
    title: 'காத்திருப்பு இடங்கள்', subtitle: 'காத்திருக்க ஏற்ற இடத்தைத் தேர்ந்தெடுக்கவும்',
    search: 'பெயர், இடம் அல்லது அருகிலுள்ள அடையாளத்தைத் தேடுங்கள்...', all: 'அனைத்தும்',
    lobby: 'வரவேற்பு மண்டபம்', canteen: 'உணவகம்', hall: 'காத்திருப்பு மண்டபம்', other: 'மற்றவை',
    capacity: 'மொத்த இருக்கை எண்ணிக்கை', seats: 'இருக்கைகள்', near: 'அருகில்',
    active: 'செயலில்', areas: 'காத்திருப்பு இடங்கள்', refresh: 'புதுப்பிக்கவும்',
    empty: 'இடங்கள் கிடைக்கவில்லை', emptyDetail: 'வேறு தேடல் அல்லது வடிகட்டியை முயற்சிக்கவும்.',
    none: 'தற்போது செயலில் உள்ள காத்திருப்பு இடங்கள் இல்லை.',
    error: 'காத்திருப்பு இடங்களை ஏற்ற முடியவில்லை.', retry: 'மீண்டும் முயற்சிக்கவும்'
  }
};

const FILTERS = ['all', 'lobby', 'canteen', 'waiting-hall', 'other'];
const normalizeType = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
const iconForType = (type) => type === 'canteen' ? 'cafe-outline' :
  type === 'lobby' ? 'business-outline' : 'people-outline';

export default function CaregiverWaitingAreas({ navigation }) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const T = COPY[language] || COPY.en;

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadAreas = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await getWaitingAreas();
      if (response?.success === false) throw new Error(response?.message || 'Request failed');
      const incoming = Array.isArray(response?.data) ? response.data : [];
      // The public API already returns active areas; guard the UI as well.
      setAreas(incoming.filter((area) => area?.status === 'active'));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Request failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Loads the newest Admin-managed waiting areas whenever this screen is opened.
  useFocusEffect(useCallback(() => { loadAreas(); }, [loadAreas]));

  const filteredAreas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return areas.filter((area) => {
      const type = normalizeType(area.type);
      if (typeFilter !== 'all' && type !== typeFilter) return false;
      if (!term) return true;
      const haystack = [area.name, area.type, area.location, area.landmark, area.nearbyLandmark]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [areas, search, typeFilter]);

  const typeLabel = (type) => {
    switch (normalizeType(type)) {
      case 'lobby': return T.lobby;
      case 'canteen': return T.canteen;
      case 'waiting-hall': return T.hall;
      default: return T.other;
    }
  };

  const isFiltering = Boolean(search.trim()) || typeFilter !== 'all';

  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <CaregiverHeader title={T.title} navigation={navigation} showBack />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAreas(true)} tintColor={IOS.tertiaryLabel} colors={[IOS.blue]} />}
        >
          <View style={styles.headingRow}>
            <View style={styles.headingContent}>
              <Text style={styles.heading}>{T.title}</Text>
              <Text style={styles.subtitle}>{T.subtitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => loadAreas(true)}
              accessibilityRole="button"
              accessibilityLabel={T.refresh}
              disabled={loading || refreshing}
            >
              <Ionicons name="refresh" size={20} color={IOS.blue} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={IOS.tertiaryLabel} />
            <TextInput
              style={styles.searchInput}
              placeholder={T.search}
              placeholderTextColor="#8E8E93"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel={T.search}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search" accessibilityRole="button">
                <Ionicons name="close-circle" size={20} color={IOS.chevron} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((value) => {
              const selected = typeFilter === value;
              const label = value === 'all' ? T.all : typeLabel(value);
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => setTypeFilter(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color={IOS.tertiaryLabel} />
            </View>
          ) : error ? (
            <View style={styles.messageCard}>
              <Ionicons name="alert-circle-outline" size={34} color={IOS.red} />
              <Text style={styles.errorText}>{T.error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadAreas()}>
                <Text style={styles.retryText}>{T.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.countLabel}>{filteredAreas.length} {T.areas}</Text>
              {filteredAreas.length === 0 ? (
                <View style={styles.messageCard}>
                  <Ionicons name="location-outline" size={36} color={IOS.tertiaryLabel} />
                  <Text style={styles.emptyTitle}>{T.empty}</Text>
                  <Text style={styles.emptyDetail}>{isFiltering ? T.emptyDetail : T.none}</Text>
                </View>
              ) : filteredAreas.map((area) => {
                const type = normalizeType(area.type);
                const landmark = area.landmark || area.nearbyLandmark;
                return (
                  <View style={styles.areaCard} key={area.waitingAreaId || area._id}>
                    <View style={styles.cardTop}>
                      <View style={styles.areaIcon}>
                        <Ionicons name={iconForType(type)} size={22} color={IOS.blue} />
                      </View>
                      <View style={styles.areaInfo}>
                        <Text style={styles.areaName}>{area.name}</Text>
                        <Text style={styles.areaType}>{typeLabel(type)}</Text>
                      </View>
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeText}>{T.active}</Text>
                      </View>
                    </View>

                    <View style={styles.detailLine}>
                      <Ionicons name="location-outline" size={18} color={IOS.tertiaryLabel} />
                      <Text style={styles.detailText}>{area.location}</Text>
                    </View>
                    {landmark ? (
                      <View style={styles.detailLine}>
                        <Ionicons name="navigate-outline" size={18} color={IOS.tertiaryLabel} />
                        <Text style={styles.detailText}>{T.near}: {landmark}</Text>
                      </View>
                    ) : null}
                    <View style={styles.capacityRow}>
                      <Ionicons name="people-outline" size={18} color={IOS.blue} />
                      <Text style={styles.capacityText}>{T.capacity}: {area.seating ?? '—'} {T.seats}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
        <CaregiverBottomNav navigation={navigation} activeRoute="" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: IOS.groupedBg },
  screen: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: IOS.groupedBg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 28 },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, paddingHorizontal: 4 },
  headingContent: { flex: 1 },
  heading: { fontSize: 28, fontWeight: '700', letterSpacing: 0.3, color: IOS.label },
  subtitle: { fontSize: 14, color: IOS.tertiaryLabel, marginTop: 4, lineHeight: 20 },
  refreshButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: IOS.blueSoft, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  searchBox: { minHeight: 50, borderRadius: 16, borderCurve: 'continuous', backgroundColor: IOS.fill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  searchInput: { flex: 1, color: IOS.label, fontSize: 15, marginLeft: 8, minWidth: 0, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 20 },
  filterChip: { borderRadius: 999, backgroundColor: IOS.fill, paddingHorizontal: 16, paddingVertical: 9, minHeight: 36, justifyContent: 'center' },
  filterChipActive: { backgroundColor: IOS.blue },
  filterText: { fontSize: 13, color: IOS.secondaryLabel, fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  countLabel: { fontSize: 13, color: IOS.tertiaryLabel, fontWeight: '600', marginBottom: 12, paddingHorizontal: 6, letterSpacing: 0.4 },
  centerBlock: { paddingTop: 70, alignItems: 'center' },
  messageCard: { borderRadius: 26, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,60,67,0.12)', backgroundColor: IOS.white, padding: 30, alignItems: 'center', gap: 12, ...cardShadow },
  errorText: { color: IOS.red, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, borderCurve: 'continuous', backgroundColor: IOS.blue },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  emptyTitle: { color: IOS.label, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptyDetail: { color: IOS.tertiaryLabel, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  areaCard: { borderRadius: 26, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,60,67,0.12)', backgroundColor: IOS.white, padding: 16, marginBottom: 18, ...cardShadow },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  areaIcon: { width: 46, height: 46, borderRadius: 14, borderCurve: 'continuous', backgroundColor: IOS.blueSoft, alignItems: 'center', justifyContent: 'center' },
  areaInfo: { flex: 1, marginLeft: 12, paddingRight: 4, minWidth: 0 },
  areaName: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, color: IOS.label },
  areaType: { fontSize: 12, color: IOS.tertiaryLabel, marginTop: 3 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: IOS.greenSoft },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: IOS.green, marginRight: 5 },
  activeText: { color: IOS.greenDark, fontSize: 11, fontWeight: '600' },
  detailLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  detailText: { flex: 1, fontSize: 14, lineHeight: 20, color: IOS.secondaryLabel },
  capacityRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: IOS.surface },
  capacityText: { flex: 1, color: IOS.blue, fontSize: 13, fontWeight: '600' }
});