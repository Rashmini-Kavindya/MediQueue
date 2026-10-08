import React from 'react';
import { View, Text } from 'react-native';
import StaffScreen from '../../components/staff/StaffScreen';

// TODO: replace with API data (GET /reports/today)
const STATS = [
  { label: 'TOTAL PATIENTS', value: '156', unit: '', highlight: false },
  { label: 'COMPLETED', value: '142', unit: '', highlight: true },
  { label: 'WAITING / SKIPPED', value: '14', unit: '', highlight: false },
  { label: 'AVG. WAIT TIME', value: '42', unit: 'MIN', highlight: false },
];

const FLOW = [
  { hour: '08:00', value: 14 },
  { hour: '09:00', value: 26 },
  { hour: '10:00', value: 34 },
  { hour: '11:00', value: 32 },
  { hour: '12:00', value: 20 },
  { hour: '13:00', value: 13 },
  { hour: '14:00', value: 11 },
];

const DAILY = [
  { metric: 'PATIENTS SERVED', morning: '84', afternoon: '58', total: '142' },
  { metric: 'PEAK WAIT TIME', morning: '55m', afternoon: '35m', total: '55m' },
  { metric: 'NO SHOWS', morning: '3', afternoon: '2', total: '5' },
];

const MAX_BAR_HEIGHT = 90;

export default function ReportsScreen() {
  const max = Math.max(...FLOW.map((f) => f.value));
  const peak = FLOW.find((f) => f.value === max);

  return (
    <StaffScreen title="REPORTS">
      <View className="flex-row flex-wrap justify-between">
        {STATS.map((s) => (
          <View
            key={s.label}
            className={`w-[48.5%] rounded-2xl p-4 mb-3 border ${
              s.highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'
            }`}
          >
            <Text className="text-[9px] font-bold text-slate-500 tracking-wider">{s.label}</Text>
            <View className="flex-row items-end mt-2">
              <Text className={`text-3xl font-bold ${s.highlight ? 'text-blue-600' : 'text-slate-900'}`}>
                {s.value}
              </Text>
              {!!s.unit && <Text className="text-[10px] font-bold text-slate-500 ml-1 mb-1">{s.unit}</Text>}
            </View>
          </View>
        ))}
      </View>

      {/* Patient flow */}
      <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <View className="flex-row items-center mb-3">
          <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5" />
          <Text className="text-[11px] font-bold text-slate-800 tracking-wide">PATIENT FLOW (HOURLY)</Text>
        </View>

        <View className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[9px] font-bold text-slate-500 tracking-wider">CONSULTATION VOLUME</Text>
            <View className="bg-white border border-blue-200 rounded-full px-2 py-0.5">
              <Text className="text-[9px] font-bold text-blue-600">
                Peak: {peak.hour} ({peak.value})
              </Text>
            </View>
          </View>

          <View className="flex-row items-end justify-between" style={{ height: MAX_BAR_HEIGHT + 4 }}>
            {FLOW.map((f) => (
              <View
                key={f.hour}
                className={`rounded-t-md ${f.value === max ? 'bg-blue-600' : 'bg-blue-200'}`}
                style={{ width: '11%', height: Math.max(8, (f.value / max) * MAX_BAR_HEIGHT) }}
              />
            ))}
          </View>

          <View className="flex-row justify-between mt-2 border-t border-slate-200 pt-1.5">
            {FLOW.map((f) => (
              <Text key={f.hour} className="text-[8px] text-slate-400" style={{ width: '11%', textAlign: 'center' }}>
                {f.hour}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Daily statistics */}
      <View className="bg-white border border-slate-200 rounded-2xl p-4">
        <View className="flex-row items-center mb-3">
          <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5" />
          <Text className="text-[11px] font-bold text-slate-800 tracking-wide">DAILY STATISTICS</Text>
        </View>

        <View className="border border-slate-200 rounded-xl overflow-hidden">
          <View className="flex-row px-3 py-2 bg-slate-50">
            <Text className="flex-[1.6] text-[9px] font-bold text-slate-400 tracking-wider">METRIC</Text>
            <Text className="flex-1 text-center text-[9px] font-bold text-slate-400 tracking-wider">MORNING</Text>
            <Text className="flex-1 text-center text-[9px] font-bold text-slate-400 tracking-wider">AFTERNOON</Text>
            <Text className="flex-1 text-right text-[9px] font-bold text-slate-400 tracking-wider">TOTAL</Text>
          </View>
          {DAILY.map((r) => (
            <View key={r.metric} className="flex-row items-center px-3 py-3 border-t border-slate-100">
              <Text className="flex-[1.6] text-[10px] font-bold text-slate-800">{r.metric}</Text>
              <Text className="flex-1 text-center text-xs text-slate-600">{r.morning}</Text>
              <Text className="flex-1 text-center text-xs text-slate-600">{r.afternoon}</Text>
              <Text className="flex-1 text-right text-xs font-bold text-slate-900">{r.total}</Text>
            </View>
          ))}
        </View>
      </View>
    </StaffScreen>
  );
}