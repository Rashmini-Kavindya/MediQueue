import React, { useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import StaffScreen from '../../components/staff/StaffScreen';
import api from '../../services/api';

/**
 * Returns today's date as "YYYY-MM-DD" in the Asia/Colombo timezone (UTC+05:30).
 * Matches the same helper used in QueueScreen to keep date conventions consistent.
 */
function getColomboDayString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const STAT_CONFIG = [
  { key: 'inQueue',        label: 'IN QUEUE',        color: 'text-amber-600' },
  { key: 'inConsultation', label: 'IN CONSULTATION',  color: 'text-blue-600' },
  { key: 'completed',      label: 'COMPLETED',        color: 'text-emerald-600' },
  { key: 'avgWait',        label: 'AVG. WAIT',        color: 'text-slate-900' },
];

const ACTIONS = [
  { label: 'Manage queue',  icon: 'people-outline',        tab: 'Queue' },
  { label: 'Consultations', icon: 'clipboard-outline',     tab: 'Consult' },
  { label: 'View reports',  icon: 'document-text-outline', tab: 'Reports' },
];

const EMPTY_STATS = { inQueue: null, inConsultation: null, completed: null, avgWait: null };

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [stats, setStats]     = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const isMounted = useRef(true);

  /**
   * Fetches all active OPDs then, for each OPD, fetches today's full token list
   * via GET /api/tokens/opd/:opdId?queueDate=YYYY-MM-DD (used by ConsultationScreen).
   * Aggregates counts and computes average wait from calledAt – bookedAt.
   * A single pass per OPD means we reuse the same endpoint already consumed by
   * existing screens without inventing any new routes.
   */
  const fetchStats = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError('');

    try {
      const colomboDate = getColomboDayString();

      // 1. Fetch all active OPDs (public endpoint, no auth required per opdRoutes.js)
      const opdResp = await api.get('/opds');
      const opds = opdResp.data?.data || [];

      if (opds.length === 0) {
        if (isMounted.current) {
          setStats({ inQueue: 0, inConsultation: 0, completed: 0, avgWait: null });
          setLoading(false);
        }
        return;
      }

      // 2. Fetch today's token list for every OPD in parallel.
      //    GET /api/tokens/opd/:opdId  →  { success, totalCount, data: Token[] }
      //    The Token model includes: status, bookedAt, calledAt
      const tokenResponses = await Promise.allSettled(
        opds.map((opd) =>
          api.get(`/tokens/opd/${encodeURIComponent(opd.opdId)}`, {
            params: { queueDate: colomboDate },
          })
        )
      );

      let inQueue = 0;
      let inConsultation = 0;
      let completed = 0;
      const waitMinutes = [];

      tokenResponses.forEach((result) => {
        if (result.status !== 'fulfilled') return;
        const tokens = result.value?.data?.data || [];
        tokens.forEach((token) => {
          if (token.status === 'waiting')         inQueue++;
          else if (token.status === 'in-consultation') inConsultation++;
          else if (token.status === 'completed')   completed++;

          // Average wait = time from booking until first called, for tokens that
          // have been called today.  Both timestamps come from the Token model.
          if (token.calledAt && token.bookedAt) {
            const waitMs = new Date(token.calledAt) - new Date(token.bookedAt);
            if (waitMs > 0) waitMinutes.push(waitMs / 60000);
          }
        });
      });

      const avgWait =
        waitMinutes.length > 0
          ? Math.round(waitMinutes.reduce((a, b) => a + b, 0) / waitMinutes.length)
          : null;

      if (isMounted.current) {
        setStats({ inQueue, inConsultation, completed, avgWait });
      }
    } catch (err) {
      console.error('Dashboard stats fetch failed:', err.response?.data || err.message);
      if (isMounted.current) {
        setError(
          err.response?.data?.message ||
            'Could not load statistics. Check your connection.'
        );
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // Refresh whenever the Dashboard tab gains focus; clean up on unmount.
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchStats();
      return () => {
        isMounted.current = false;
      };
    }, [fetchStats])
  );

  /**
   * Format a stat value for display.
   * – null  → '—'  (data unavailable / not calculable)
   * – avgWait key appends 'm' suffix
   */
  const formatValue = (key, value) => {
    if (loading) return '—';
    if (value === null || value === undefined) return '—';
    if (key === 'avgWait') return `${value}m`;
    return String(value);
  };

  return (
    <StaffScreen title="DASHBOARD">
      {/* Welcome card */}
      <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <Text className="text-xs text-slate-400">Welcome back</Text>
        <Text className="text-lg font-bold text-slate-900 mt-0.5">
          {user?.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : 'Staff member'}
        </Text>
        <Text className="text-[11px] text-slate-500 mt-1 capitalize">
          {user?.role || 'staff'}
        </Text>
      </View>

      {/* Error banner */}
      {!!error && (
        <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex-row items-center">
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text className="text-xs text-red-700 ml-2 flex-1">{error}</Text>
          <TouchableOpacity onPress={fetchStats}>
            <Text className="text-xs font-bold text-red-700 ml-2">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats grid */}
      <View className="flex-row flex-wrap justify-between">
        {STAT_CONFIG.map((s) => (
          <View
            key={s.key}
            className="w-[48.5%] bg-white border border-slate-200 rounded-2xl p-4 mb-3"
          >
            <Text className="text-[9px] font-bold text-slate-500 tracking-wider">
              {s.label}
            </Text>
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#0052CC"
                style={{ marginTop: 10, alignSelf: 'flex-start' }}
              />
            ) : (
              <Text className={`text-3xl font-bold mt-2 ${s.color}`}>
                {formatValue(s.key, stats[s.key])}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text className="text-[11px] font-bold text-slate-500 tracking-wider mt-2 mb-2">
        QUICK ACTIONS
      </Text>
      {ACTIONS.map((a) => (
        <TouchableOpacity
          key={a.tab}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(a.tab)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-2 flex-row items-center"
        >
          <Ionicons name={a.icon} size={20} color="#0052CC" />
          <Text className="flex-1 ml-3 text-sm font-semibold text-slate-800">
            {a.label}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>
      ))}

      {/* Log out */}
      {typeof logout === 'function' && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          className="mt-4 border border-red-200 bg-red-50 rounded-xl py-3 items-center"
        >
          <Text className="text-xs font-bold text-red-600">Log out</Text>
        </TouchableOpacity>
      )}
    </StaffScreen>
  );
}