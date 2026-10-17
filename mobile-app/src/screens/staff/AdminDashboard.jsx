import React, { useState, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import Header from '../../components/admin/Header';

const BRAND = '#0052CC';
const POLL_MS = 15000; // auto refresh while the dashboard is focused

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// iOS-style soft card shadow (elevation on Android)
const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 },
});

const NAV = [
  { label: 'Home', icon: 'grid', iconOff: 'grid-outline', screen: null },
  { label: 'Queue', icon: 'ticket', iconOff: 'ticket-outline', screen: 'QueueManagement' },
  { label: 'OPDs', icon: 'business', iconOff: 'business-outline', screen: 'OPDManagement' },
  { label: 'Patients', icon: 'people', iconOff: 'people-outline', screen: 'PatientsManagement' },
  { label: 'Settings', icon: 'settings', iconOff: 'settings-outline', screen: 'SystemSettings' },
];

// what each token status means in the activity feed
const STATUS_META = {
  waiting: { verb: 'booked', dot: 'bg-amber-500' },
  called: { verb: 'called', dot: 'bg-blue-500' },
  hold: { verb: 'put on hold', dot: 'bg-orange-500' },
  skipped: { verb: 'skipped', dot: 'bg-slate-400' },
  'in-consultation': { verb: 'started consultation', dot: 'bg-indigo-500' },
  completed: { verb: 'completed', dot: 'bg-emerald-500' },
  cancelled: { verb: 'cancelled', dot: 'bg-red-500' },
};

const PILL = {
  called: { label: 'CALLED', box: 'bg-blue-50', text: 'text-blue-600' },
  'in-consultation': { label: 'IN CONSULTATION', box: 'bg-indigo-50', text: 'text-indigo-600' },
};

// ---------- helpers ----------
const ts = (d) => (d ? new Date(d).getTime() : 0);
const isActive = (t) => t.status === 'called' || t.status === 'in-consultation';
const byRecentCall = (a, b) => ts(b.calledAt) - ts(a.calledAt) || b.tokenSequence - a.tokenSequence;
// same order the backend uses in call-next: priority desc, then sequence
const byQueueOrder = (a, b) => (b.priority || 0) - (a.priority || 0) || a.tokenSequence - b.tokenSequence;

const todayLabel = () => {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const timeAgo = (t) => {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
};

export default function AdminDashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [data, setData] = useState({ opds: [], doctors: [], queues: [] });
  const [selectedOpdId, setSelectedOpdId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Only navigate if the screen is registered in AdminNavigator,
  // otherwise show a notice instead of a "not handled by any navigator" error.
  const navigateSafely = (screenName) => {
    const routeNames = navigation.getState?.()?.routeNames || [];
    if (routeNames.includes(screenName)) {
      navigation.navigate(screenName);
    } else {
      Alert.alert('Notice', `${screenName} screen is under development.`);
    }
  };

  // ---------- data ----------
  // GET /opds, GET /doctors, then GET /tokens/opd/:opdId for every OPD (today's tokens)
  const fetchDashboard = useCallback(async () => {
    try {
      const [opdRes, docRes] = await Promise.all([
        api.get('/opds'),
        api.get('/doctors').catch(() => null), // doctors are optional for the dashboard
      ]);
      const opds = opdRes.data?.data || [];
      const doctors = docRes?.data?.data || [];

      const queues = await Promise.all(
        opds.map(async (opd) => {
          try {
            const r = await api.get(`/tokens/opd/${opd.opdId}`);
            return { opd, tokens: r.data?.data || [] };
          } catch (e) {
            return { opd, tokens: [] };
          }
        })
      );

      setData({ opds, doctors, queues });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      const id = setInterval(fetchDashboard, POLL_MS);
      return () => clearInterval(id);
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // ---------- derived values ----------
  const view = useMemo(() => {
    const { queues } = data;
    const all = queues.flatMap((q) => q.tokens.map((t) => ({ ...t, opdName: q.opd.name })));

    const serving = all.filter(isActive).sort(byRecentCall)[0] || null;
    const waitingCount = all.filter((t) => t.status === 'waiting').length;
    const completedCount = all.filter((t) => t.status === 'completed').length;

    // latest 6 changes across all OPDs (status-driven, uses updatedAt)
    const activity = all
      .map((t) => ({
        key: t.tokenId,
        at: ts(t.updatedAt) || ts(t.createdAt),
        tokenNo: t.tokenNo,
        opdName: t.opdName,
        meta: STATUS_META[t.status] || STATUS_META.waiting,
      }))
      .filter((a) => a.at > 0)
      .sort((a, b) => b.at - a.at)
      .slice(0, 6);

    // Live Queue Control card: chosen OPD, else the first one with an active token
    const cardOpdId =
      selectedOpdId ||
      queues.find((q) => q.tokens.some(isActive))?.opd.opdId ||
      queues[0]?.opd.opdId ||
      null;
    const cardQueue = queues.find((q) => q.opd.opdId === cardOpdId);
    const cardTokens = cardQueue?.tokens || [];

    return {
      serving,
      waitingCount,
      completedCount,
      activity,
      cardOpdId,
      cardCurrent: cardTokens.filter(isActive).sort(byRecentCall)[0] || null,
      cardWaiting: cardTokens.filter((t) => t.status === 'waiting').sort(byQueueOrder),
    };
  }, [data, selectedOpdId]);

  const stats = [
    { label: 'Waiting', value: view.waitingCount, icon: 'people', tint: '#FF9500', bg: '#FFF4E5' },
    { label: 'OPD Units', value: data.opds.length, icon: 'business', tint: '#007AFF', bg: '#E5F1FF' },
    { label: 'Doctors', value: data.doctors.length, icon: 'medkit', tint: '#34C759', bg: '#E8F8ED' },
    { label: 'Served Today', value: view.completedCount, icon: 'checkmark-done', tint: '#AF52DE', bg: '#F5E9FB' },
  ];

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Administrator';
  const initials = `${user?.firstName?.[0] || 'A'}${user?.lastName?.[0] || ''}`.toUpperCase();
  const cardPill = view.cardCurrent ? PILL[view.cardCurrent.status] : null;

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: '#F2F2F7' }}>
      {/* Top bar (drawer menu lives inside Header) */}
      <Header
        title="MediQueue"
        rightElement={
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigateSafely('Alerts')}
              className="w-9 h-9 rounded-full bg-white items-center justify-center"
              style={CARD_SHADOW}
            >
              <Ionicons name="notifications-outline" size={18} color="#334155" />
              <View className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-2 border border-white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.openDrawer?.()}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: BRAND }}
            >
              <Text className="text-white text-xs font-bold">{initials}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {/* Status + date */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center bg-white rounded-full px-3 py-1.5" style={CARD_SHADOW}>
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            <Text className="text-[10px] font-bold text-emerald-700 tracking-wider">LIVE</Text>
          </View>
          <Text className="text-xs font-semibold text-slate-500">{todayLabel()}</Text>
        </View>

        {/* Large title (iOS style) */}
        <Text className="text-sm font-medium text-slate-500 mt-2">
          {greeting()}, {user?.firstName || 'Admin'}
        </Text>
        <Text className="text-[34px] font-bold text-slate-900 mb-1" style={{ letterSpacing: -0.8 }}>
          Dashboard
        </Text>
        <Text className="text-xs text-slate-500 mb-5">
          Signed in as <Text className="font-semibold text-slate-700">{fullName}</Text>
        </Text>

        {!!error && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={fetchDashboard}
            className="bg-red-50 border border-red-100 rounded-2xl p-3.5 mb-4"
          >
            <Text className="text-xs text-red-700 text-center">{error}</Text>
            <Text className="text-[10px] font-bold text-red-600 text-center mt-1">Tap to retry</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View className="py-24 items-center">
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : (
          <>
            {/* Hero: active calling token */}
            <View
              className="mb-4 overflow-hidden"
              style={{ backgroundColor: BRAND, borderRadius: 28, padding: 24, ...CARD_SHADOW }}
            >
              <View
                style={{
                  position: 'absolute', right: -50, top: -50, width: 180, height: 180,
                  borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              />
              <View
                style={{
                  position: 'absolute', left: -30, bottom: -60, width: 150, height: 150,
                  borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              />
              <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                <Text className="text-[10px] font-bold text-white tracking-wider">ACTIVE CALLING TOKEN</Text>
              </View>
              <Text className="text-white font-extrabold mt-3" style={{ fontSize: 60, letterSpacing: -1.5 }}>
                {view.serving?.tokenNo || '---'}
              </Text>
              <Text className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {view.serving
                  ? `${view.serving.opdName} · ${
                      view.serving.status === 'called' ? 'Called, waiting for patient' : 'In consultation'
                    }`
                  : 'No patient has been called yet'}
              </Text>
            </View>

            {/* Stats grid */}
            <View className="flex-row flex-wrap justify-between">
              {stats.map((s) => (
                <View
                  key={s.label}
                  className="bg-white p-4 mb-3"
                  style={{ width: '48.5%', borderRadius: 20, ...CARD_SHADOW }}
                >
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mb-3"
                    style={{ backgroundColor: s.bg }}
                  >
                    <Ionicons name={s.icon} size={18} color={s.tint} />
                  </View>
                  <Text className="text-[26px] font-bold text-slate-900" style={{ letterSpacing: -0.5 }}>
                    {s.value}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Live queue control */}
            <View className="bg-white p-5 mt-1 mb-4" style={{ borderRadius: 24, ...CARD_SHADOW }}>
              <Text className="text-base font-bold text-slate-900 mb-3">Live Queue</Text>

              {data.opds.length === 0 ? (
                <Text className="text-xs text-slate-400 py-4 text-center">
                  No OPD units yet. Create one in OPD Management.
                </Text>
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                    {data.opds.map((o) => {
                      const active = o.opdId === view.cardOpdId;
                      return (
                        <TouchableOpacity
                          key={o.opdId}
                          activeOpacity={0.7}
                          onPress={() => setSelectedOpdId(o.opdId)}
                          className="mr-2 rounded-full px-3.5 py-2"
                          style={{ backgroundColor: active ? BRAND : '#F1F5F9' }}
                        >
                          <Text className={`text-[11px] font-bold ${active ? 'text-white' : 'text-slate-600'}`}>
                            {o.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View className="flex-row items-center justify-between py-3 border-t border-slate-100">
                    <View>
                      <Text className="text-[10px] font-semibold text-slate-400 tracking-wider">CURRENT TOKEN</Text>
                      <Text className="text-xl font-bold text-slate-900 mt-0.5">
                        {view.cardCurrent?.tokenNo || '---'}
                      </Text>
                    </View>
                    {cardPill ? (
                      <View className={`${cardPill.box} rounded-full px-3 py-1.5`}>
                        <Text className={`${cardPill.text} text-[10px] font-bold`}>{cardPill.label}</Text>
                      </View>
                    ) : (
                      <View className="bg-slate-100 rounded-full px-3 py-1.5">
                        <Text className="text-[10px] font-bold text-slate-500">IDLE</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between py-3 border-t border-slate-100 mb-3">
                    <View>
                      <Text className="text-[10px] font-semibold text-slate-400 tracking-wider">NEXT PATIENT</Text>
                      <Text className="text-xl font-bold text-slate-900 mt-0.5">
                        {view.cardWaiting[0]?.tokenNo || '---'}
                      </Text>
                    </View>
                    <View className="bg-amber-50 rounded-full px-3 py-1.5">
                      <Text className="text-[10px] font-bold text-amber-600">
                        {view.cardWaiting.length} WAITING
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigateSafely('QueueManagement')}
                className="bg-slate-900 py-3.5 flex-row items-center justify-center"
                style={{ borderRadius: 16 }}
              >
                <Text className="text-white font-bold text-xs tracking-wider mr-2">MANAGE ALL QUEUES</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Recent activity */}
            <View className="bg-white p-5" style={{ borderRadius: 24, ...CARD_SHADOW }}>
              <Text className="text-base font-bold text-slate-900 mb-3">Recent Activity</Text>

              {view.activity.length === 0 ? (
                <Text className="text-xs text-slate-400 py-4 text-center">No token activity today.</Text>
              ) : (
                view.activity.map((a, i) => (
                  <View
                    key={a.key}
                    className={`flex-row items-center py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    <View className={`w-2.5 h-2.5 rounded-full mr-3 ${a.meta.dot}`} />
                    <View className="flex-1">
                      <Text className="text-[13px] text-slate-700">
                        Token <Text className="font-bold text-slate-900">{a.tokenNo}</Text> {a.meta.verb}
                      </Text>
                      <Text className="text-[11px] text-slate-400 mt-0.5">{a.opdName}</Text>
                    </View>
                    <Text className="text-[11px] text-slate-400">{timeAgo(a.at)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating bottom bar */}
      <View
        className="absolute left-5 right-5 bg-white flex-row justify-around items-center p-2"
        style={{
          bottom: insets.bottom + 8,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: '#F1F5F9',
          ...Platform.select({
            ios: { shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
            default: { elevation: 8 },
          }),
        }}
      >
        {NAV.map((item) => {
          const active = item.screen === null;
          return (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.7}
              onPress={() => item.screen && navigateSafely(item.screen)}
              className="items-center px-3.5 py-1.5"
              style={{ borderRadius: 22, backgroundColor: active ? '#E8F0FE' : 'transparent' }}
            >
              <Ionicons name={active ? item.icon : item.iconOff} size={21} color={active ? BRAND : '#94A3B8'} />
              <Text
                className="text-[10px] mt-0.5"
                style={{ color: active ? BRAND : '#94A3B8', fontWeight: active ? '700' : '600' }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}