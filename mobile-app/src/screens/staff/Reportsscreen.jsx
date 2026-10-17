import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import StaffScreen from '../../components/staff/StaffScreen';
import api from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BAR_HEIGHT = 90;

/**
 * Morning  = completed/booked before 12:00 Colombo.
 * Afternoon = 12:00 Colombo and later.
 */
const MORNING_CUTOFF_HOUR = 12;

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns today's date as "YYYY-MM-DD" in Asia/Colombo (UTC+05:30).
 * Mirrors the same helper used in QueueScreen / DashboardScreen.
 */
function getColomboDayString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Returns the Colombo local hour (0–23) for a given UTC Date instance.
 * Uses Intl so it works correctly even after midnight UTC before 05:30.
 */
function colomboHour(date) {
  return parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Colombo',
      hour: 'numeric',
      hour12: false,
    }).format(date),
    10
  );
}

/** "HH:00" label for a given 0-23 hour integer. */
function hourLabel(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

// ─── Derivation helpers ───────────────────────────────────────────────────────

/**
 * Builds the data needed by all three report sections from a flat array of
 * token objects (deduplicated before this call).
 *
 * Token fields used (all present on the Token schema):
 *   status, bookedAt, calledAt, completedAt
 */
function deriveReportData(tokens) {
  // ── Summary stats ──────────────────────────────────────────────────────────
  const total           = tokens.length;
  const completed       = tokens.filter((t) => t.status === 'completed').length;
  const waitingSkipped  = tokens.filter(
    (t) => t.status === 'waiting' || t.status === 'skipped' || t.status === 'cancelled'
  ).length;

  // Avg wait = mean of (calledAt − bookedAt) for every token that has both.
  const waitMins = tokens
    .filter((t) => t.calledAt && t.bookedAt)
    .map((t) => (new Date(t.calledAt) - new Date(t.bookedAt)) / 60000)
    .filter((m) => m > 0);
  const avgWait = waitMins.length > 0
    ? Math.round(waitMins.reduce((a, b) => a + b, 0) / waitMins.length)
    : null;

  // ── Hourly flow ────────────────────────────────────────────────────────────
  // Use completedAt as the event timestamp ("patient was fully served at HH:xx").
  // Only tokens that are completed and have a completedAt contribute.
  const hourCounts = {};
  tokens.forEach((t) => {
    if (t.status === 'completed' && t.completedAt) {
      const h = colomboHour(new Date(t.completedAt));
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
  });

  // Build sorted FLOW array from the hours that actually have data.
  const flow = Object.keys(hourCounts)
    .map(Number)
    .sort((a, b) => a - b)
    .map((h) => ({ hour: hourLabel(h), value: hourCounts[h] }));

  // ── Daily (morning / afternoon) breakdown ──────────────────────────────────
  // Morning  = Colombo hour < MORNING_CUTOFF_HOUR (before 12:00)
  // Afternoon = Colombo hour >= MORNING_CUTOFF_HOUR (12:00 onward)

  // Patients served (completed) — split by completedAt Colombo hour.
  let servedMorning = 0;
  let servedAfternoon = 0;
  tokens.forEach((t) => {
    if (t.status !== 'completed' || !t.completedAt) return;
    const h = colomboHour(new Date(t.completedAt));
    if (h < MORNING_CUTOFF_HOUR) servedMorning++;
    else servedAfternoon++;
  });

  // Peak wait (max wait minutes) — split by calledAt Colombo hour.
  let peakMorningMs = 0;
  let peakAfternoonMs = 0;
  let hasPeakData = false;
  tokens.forEach((t) => {
    if (!t.calledAt || !t.bookedAt) return;
    const waitMs = new Date(t.calledAt) - new Date(t.bookedAt);
    if (waitMs <= 0) return;
    hasPeakData = true;
    const h = colomboHour(new Date(t.calledAt));
    if (h < MORNING_CUTOFF_HOUR) {
      if (waitMs > peakMorningMs) peakMorningMs = waitMs;
    } else {
      if (waitMs > peakAfternoonMs) peakAfternoonMs = waitMs;
    }
  });
  const peakMorning   = hasPeakData && peakMorningMs   > 0
    ? `${Math.round(peakMorningMs   / 60000)}m` : '—';
  const peakAfternoon = hasPeakData && peakAfternoonMs > 0
    ? `${Math.round(peakAfternoonMs / 60000)}m` : '—';
  const peakTotal     = hasPeakData && (peakMorningMs || peakAfternoonMs) > 0
    ? `${Math.round(Math.max(peakMorningMs, peakAfternoonMs) / 60000)}m` : '—';

  // No-shows (skipped + cancelled) — split by bookedAt Colombo hour
  // (no-shows never reach calledAt so bookedAt is the only reliable timestamp).
  let noShowMorning = 0;
  let noShowAfternoon = 0;
  tokens.forEach((t) => {
    if (t.status !== 'skipped' && t.status !== 'cancelled') return;
    const ts = t.bookedAt;
    if (!ts) return;
    const h = colomboHour(new Date(ts));
    if (h < MORNING_CUTOFF_HOUR) noShowMorning++;
    else noShowAfternoon++;
  });

  return {
    summary: { total, completed, waitingSkipped, avgWait },
    flow,
    daily: {
      servedMorning,
      servedAfternoon,
      peakMorning,
      peakAfternoon,
      peakTotal,
      noShowMorning,
      noShowAfternoon,
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const isMounted                   = useRef(true);

  /**
   * Fetch all OPDs then, for each OPD, pull today's complete token list via
   * GET /api/tokens/opd/:opdId?queueDate=YYYY-MM-DD (the same endpoint used by
   * ConsultationScreen and DashboardScreen).  Tokens are deduplicated by tokenId
   * before any calculation so cross-OPD counts remain accurate.
   */
  const fetchReport = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError('');

    try {
      const colomboDate = getColomboDayString();

      // 1. Fetch OPD list (public endpoint — no auth required).
      const opdResp = await api.get('/opds');
      const opds    = opdResp.data?.data || [];

      if (opds.length === 0) {
        if (isMounted.current) {
          setReportData(deriveReportData([]));
          setLoading(false);
        }
        return;
      }

      // 2. Fetch today's full token list for every OPD in parallel.
      const results = await Promise.allSettled(
        opds.map((opd) =>
          api.get(`/tokens/opd/${encodeURIComponent(opd.opdId)}`, {
            params: { queueDate: colomboDate },
          })
        )
      );

      // 3. Collect and deduplicate tokens by tokenId.
      const seen   = new Set();
      const tokens = [];
      results.forEach((r) => {
        if (r.status !== 'fulfilled') return;
        (r.value?.data?.data || []).forEach((t) => {
          if (!seen.has(t.tokenId)) {
            seen.add(t.tokenId);
            tokens.push(t);
          }
        });
      });

      if (isMounted.current) {
        setReportData(deriveReportData(tokens));
      }
    } catch (err) {
      console.error('Reports fetch failed:', err.response?.data || err.message);
      if (isMounted.current) {
        setError(
          err.response?.data?.message ||
            'Could not load report data. Check your connection.'
        );
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // Re-fetch whenever the Reports tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchReport();
      return () => {
        isMounted.current = false;
      };
    }, [fetchReport])
  );

  // ── Derived display values ─────────────────────────────────────────────────

  const { summary, flow, daily } = reportData ?? {};

  const statsConfig = [
    {
      label:     'TOTAL PATIENTS',
      value:     loading ? '—' : String(summary?.total ?? '—'),
      unit:      '',
      highlight: false,
    },
    {
      label:     'COMPLETED',
      value:     loading ? '—' : String(summary?.completed ?? '—'),
      unit:      '',
      highlight: true,
    },
    {
      label:     'WAITING / SKIPPED',
      value:     loading ? '—' : String(summary?.waitingSkipped ?? '—'),
      unit:      '',
      highlight: false,
    },
    {
      label:     'AVG. WAIT TIME',
      value:     loading ? '—' : (summary?.avgWait != null ? String(summary.avgWait) : '—'),
      unit:      summary?.avgWait != null ? 'MIN' : '',
      highlight: false,
    },
  ];

  const dailyRows = [
    {
      metric:    'PATIENTS SERVED',
      morning:   loading ? '—' : String(daily?.servedMorning ?? '—'),
      afternoon: loading ? '—' : String(daily?.servedAfternoon ?? '—'),
      total:     loading ? '—' : String((daily?.servedMorning ?? 0) + (daily?.servedAfternoon ?? 0)),
    },
    {
      metric:    'PEAK WAIT TIME',
      morning:   loading ? '—' : (daily?.peakMorning   ?? '—'),
      afternoon: loading ? '—' : (daily?.peakAfternoon ?? '—'),
      total:     loading ? '—' : (daily?.peakTotal     ?? '—'),
    },
    {
      metric:    'NO SHOWS',
      morning:   loading ? '—' : String(daily?.noShowMorning   ?? '—'),
      afternoon: loading ? '—' : String(daily?.noShowAfternoon ?? '—'),
      total:     loading ? '—' : String((daily?.noShowMorning ?? 0) + (daily?.noShowAfternoon ?? 0)),
    },
  ];

  const flowMax  = flow && flow.length > 0 ? Math.max(...flow.map((f) => f.value)) : 0;
  const flowPeak = flow && flow.length > 0 ? flow.find((f) => f.value === flowMax) : null;
  const hasFlow  = !loading && flow && flow.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <StaffScreen title="REPORTS">

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {!!error && (
        <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex-row items-center">
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text className="text-xs text-red-700 ml-2 flex-1">{error}</Text>
          <TouchableOpacity onPress={fetchReport}>
            <Text className="text-xs font-bold text-red-700 ml-2">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Summary stat cards ───────────────────────────────────────────── */}
      <View className="flex-row flex-wrap justify-between">
        {statsConfig.map((s) => (
          <View
            key={s.label}
            className={`w-[48.5%] rounded-2xl p-4 mb-3 border ${
              s.highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'
            }`}
          >
            <Text className="text-[9px] font-bold text-slate-500 tracking-wider">
              {s.label}
            </Text>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={s.highlight ? '#2563EB' : '#0052CC'}
                style={{ marginTop: 10, alignSelf: 'flex-start' }}
              />
            ) : (
              <View className="flex-row items-end mt-2">
                <Text
                  className={`text-3xl font-bold ${
                    s.highlight ? 'text-blue-600' : 'text-slate-900'
                  }`}
                >
                  {s.value}
                </Text>
                {!!s.unit && (
                  <Text className="text-[10px] font-bold text-slate-500 ml-1 mb-1">
                    {s.unit}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
      </View>

      {/* ── Patient flow (hourly) ─────────────────────────────────────────── */}
      <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <View className="flex-row items-center mb-3">
          <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5" />
          <Text className="text-[11px] font-bold text-slate-800 tracking-wide">
            PATIENT FLOW (HOURLY)
          </Text>
        </View>

        <View className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          {loading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#0052CC" />
              <Text className="text-[10px] text-slate-400 mt-2">Loading chart…</Text>
            </View>
          ) : !hasFlow ? (
            /* No completed tokens with timestamps yet today */
            <View className="py-6 items-center">
              <Ionicons name="bar-chart-outline" size={28} color="#CBD5E1" />
              <Text className="text-xs text-slate-400 mt-2">
                Hourly data unavailable
              </Text>
              <Text className="text-[10px] text-slate-400 mt-1">
                No completed consultations recorded today
              </Text>
            </View>
          ) : (
            <>
              {/* Header row with peak label */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[9px] font-bold text-slate-500 tracking-wider">
                  CONSULTATION VOLUME
                </Text>
                <View className="bg-white border border-blue-200 rounded-full px-2 py-0.5">
                  <Text className="text-[9px] font-bold text-blue-600">
                    Peak: {flowPeak.hour} ({flowPeak.value})
                  </Text>
                </View>
              </View>

              {/* Bar chart */}
              <View
                className="flex-row items-end justify-between"
                style={{ height: MAX_BAR_HEIGHT + 4 }}
              >
                {flow.map((f) => (
                  <View
                    key={f.hour}
                    className={`rounded-t-md ${
                      f.value === flowMax ? 'bg-blue-600' : 'bg-blue-200'
                    }`}
                    style={{
                      width: `${Math.floor(88 / flow.length)}%`,
                      height: Math.max(8, (f.value / flowMax) * MAX_BAR_HEIGHT),
                    }}
                  />
                ))}
              </View>

              {/* Hour labels */}
              <View className="flex-row justify-between mt-2 border-t border-slate-200 pt-1.5">
                {flow.map((f) => (
                  <Text
                    key={f.hour}
                    className="text-[8px] text-slate-400"
                    style={{
                      width: `${Math.floor(88 / flow.length)}%`,
                      textAlign: 'center',
                    }}
                  >
                    {f.hour}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Daily statistics table ────────────────────────────────────────── */}
      <View className="bg-white border border-slate-200 rounded-2xl p-4">
        <View className="flex-row items-center mb-3">
          <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5" />
          <Text className="text-[11px] font-bold text-slate-800 tracking-wide">
            DAILY STATISTICS
          </Text>
        </View>

        <View className="border border-slate-200 rounded-xl overflow-hidden">
          {/* Table header */}
          <View className="flex-row px-3 py-2 bg-slate-50">
            <Text className="flex-[1.6] text-[9px] font-bold text-slate-400 tracking-wider">
              METRIC
            </Text>
            <Text className="flex-1 text-center text-[9px] font-bold text-slate-400 tracking-wider">
              MORNING
            </Text>
            <Text className="flex-1 text-center text-[9px] font-bold text-slate-400 tracking-wider">
              AFTERNOON
            </Text>
            <Text className="flex-1 text-right text-[9px] font-bold text-slate-400 tracking-wider">
              TOTAL
            </Text>
          </View>

          {/* Table rows */}
          {dailyRows.map((r) => (
            <View
              key={r.metric}
              className="flex-row items-center px-3 py-3 border-t border-slate-100"
            >
              <Text className="flex-[1.6] text-[10px] font-bold text-slate-800">
                {r.metric}
              </Text>
              <Text className="flex-1 text-center text-xs text-slate-600">
                {r.morning}
              </Text>
              <Text className="flex-1 text-center text-xs text-slate-600">
                {r.afternoon}
              </Text>
              <Text className="flex-1 text-right text-xs font-bold text-slate-900">
                {r.total}
              </Text>
            </View>
          ))}
        </View>

        {/* Footnote clarifying definitions */}
        {!loading && (
          <Text className="text-[9px] text-slate-400 mt-2">
            Morning: before 12:00 · Afternoon: 12:00 onward (Asia/Colombo)
          </Text>
        )}
      </View>
    </StaffScreen>
  );
}