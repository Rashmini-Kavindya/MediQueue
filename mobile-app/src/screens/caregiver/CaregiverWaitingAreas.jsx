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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAreas(true)} tintColor="#155EEF" />}
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
              <Ionicons name="refresh" size={19} color="#155EEF" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder={T.search}
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel={T.search}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search" accessibilityRole="button">
                <Ionicons name="close-circle" size={19} color="#94A3B8" />
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
              <ActivityIndicator size="large" color="#155EEF" />
            </View>
          ) : error ? (
            <View style={styles.messageCard}>
              <Ionicons name="alert-circle-outline" size={31} color="#B91C1C" />
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
                  <Ionicons name="location-outline" size={34} color="#94A3B8" />
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
                        <Ionicons name={iconForType(type)} size={22} color="#155EEF" />
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
                      <Ionicons name="location-outline" size={17} color="#64748B" />
                      <Text style={styles.detailText}>{area.location}</Text>
                    </View>
                    {landmark ? (
                      <View style={styles.detailLine}>
                        <Ionicons name="navigate-outline" size={17} color="#64748B" />
                        <Text style={styles.detailText}>{T.near}: {landmark}</Text>
                      </View>
                    ) : null}
                    <View style={styles.capacityRow}>
                      <Ionicons name="people-outline" size={17} color="#155EEF" />
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
  outer: { flex: 1, backgroundColor: '#EDF1F5' },
  screen: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: '#F9F7FF' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28 },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  headingContent: { flex: 1 },
  heading: { fontSize: 21, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 16 },
  refreshButton: { width: 41, height: 41, borderRadius: 12, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  searchBox: { minHeight: 48, borderWidth: 1, borderColor: '#D5DEEC', borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  searchInput: { flex: 1, color: '#111827', fontSize: 12, marginLeft: 8, minWidth: 0, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13, marginBottom: 19 },
  filterChip: { borderWidth: 1, borderColor: '#C8D5EA', borderRadius: 20, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9, minHeight: 36, justifyContent: 'center' },
  filterChipActive: { borderColor: '#155EEF', backgroundColor: '#EDF4FF' },
  filterText: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  filterTextActive: { color: '#155EEF' },
  countLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', marginBottom: 12 },
  centerBlock: { paddingTop: 70, alignItems: 'center' },
  messageCard: { borderRadius: 16, borderWidth: 1, borderColor: '#E0E5EC', backgroundColor: '#FFFFFF', padding: 30, alignItems: 'center', gap: 12 },
  errorText: { color: '#B91C1C', fontSize: 12, textAlign: 'center', lineHeight: 19 },
  retryButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#155EEF' },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
  emptyTitle: { color: '#111827', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptyDetail: { color: '#64748B', fontSize: 11, lineHeight: 18, textAlign: 'center' },
  areaCard: { borderWidth: 1, borderColor: '#E0E5EC', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  areaIcon: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' },
  areaInfo: { flex: 1, marginLeft: 10, paddingRight: 4, minWidth: 0 },
  areaName: { fontSize: 13, fontWeight: '800', color: '#111827' },
  areaType: { fontSize: 10, color: '#64748B', marginTop: 4 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#ECFDF3' },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16A34A', marginRight: 4 },
  activeText: { color: '#15803D', fontSize: 9, fontWeight: '800' },
  detailLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  detailText: { flex: 1, fontSize: 11, lineHeight: 17, color: '#334155' },
  capacityRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: '#F3F7FF' },
  capacityText: { flex: 1, color: '#155EEF', fontSize: 11, fontWeight: '800' }
});
