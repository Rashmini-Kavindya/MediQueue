import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getTokenOverview, getErrorMessage } from '../../../services/Admintokenservice';

const BLUE = '#0284C7';
const RED = '#EF4444';

const SummaryTile = ({ label, value, accent }) => (
  <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-3">
    <Text className={`text-xl font-bold ${accent ? 'text-sky-700' : 'text-slate-900'}`}>{value}</Text>
    <Text className="text-[10px] font-medium text-slate-500 mt-0.5" numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const Count = ({ label, value }) => (
  <View className="flex-1 items-center">
    <Text className="text-sm font-bold text-slate-900">{value}</Text>
    <Text className="text-[10px] text-slate-400 mt-0.5">{label}</Text>
  </View>
);

const OpdCard = ({ opd, onPress }) => {
  const inProgress = opd.counts.called + opd.counts['in-consultation'];
  const percent = opd.total ? Math.round((opd.counts.completed / opd.total) * 100) : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(opd)}
      className="bg-white rounded-2xl border border-slate-100 p-4 mb-3"
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-xl bg-sky-50 items-center justify-center mr-3">
          <Ionicons name="business-outline" size={19} color={BLUE} />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
            {opd.name}
          </Text>
          <Text className="text-[11px] text-slate-400 mt-0.5">
            {opd.total === 0
              ? 'No tokens for this date'
              : `${opd.total} ${opd.total === 1 ? 'token' : 'tokens'} • ${opd.active} active`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </View>

      {(opd.serving || opd.next) && (
        <View className="flex-row flex-wrap mt-3">
          {opd.serving && (
            <View className="flex-row items-center px-2.5 py-1 rounded-lg bg-sky-600 mr-2 mb-1">
              <Ionicons name="megaphone-outline" size={12} color="#FFFFFF" />
              <Text className="text-[11px] font-bold text-white ml-1.5">
                Now serving {opd.serving.tokenNo}
              </Text>
            </View>
          )}
          {opd.next && (
            <View className="flex-row items-center px-2.5 py-1 rounded-lg bg-slate-100 mb-1">
              <Ionicons name="arrow-forward" size={12} color="#475569" />
              <Text className="text-[11px] font-semibold text-slate-600 ml-1.5">
                Next {opd.next.tokenNo}
              </Text>
            </View>
          )}
        </View>
      )}

      {opd.total > 0 && (
        <>
          <View className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3">
            <View style={{ width: `${percent}%`, backgroundColor: BLUE }} className="h-1.5 rounded-full" />
          </View>
          <View className="flex-row mt-3.5">
            <Count label="Waiting" value={opd.counts.waiting} />
            <Count label="In progress" value={inProgress} />
            <Count label="On hold" value={opd.counts.hold} />
            <Count label="Done" value={opd.counts.completed} />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

export default function OpdOverview({ queueDate, refreshKey, onSelectOpd }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (silent = false) => {
      try {
        const res = await getTokenOverview(queueDate);
        setData(res.data);
        setError('');
      } catch (e) {
        if (!silent) setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setPulling(false);
      }
    },
    [queueDate]
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, refreshKey]);

  // Quietly refresh while this screen is in front
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => load(true), 20000);
      return () => clearInterval(timer);
    }, [load])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={BLUE} />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-14 h-14 rounded-2xl bg-red-50 items-center justify-center mb-3">
          <Ionicons name="cloud-offline-outline" size={26} color={RED} />
        </View>
        <Text className="text-sm font-bold text-slate-800">Could not load tokens</Text>
        <Text className="text-xs text-slate-400 text-center mt-1">{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            load();
          }}
          className="mt-4 bg-sky-600 px-5 py-2.5 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-xs font-bold text-white">Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { totals, opds } = data;
  const inProgress = totals.counts.called + totals.counts['in-consultation'];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={() => {
            setPulling(true);
            load();
          }}
          tintColor={BLUE}
          colors={[BLUE]}
        />
      }
    >
      <View className="flex-row" style={{ gap: 10 }}>
        <SummaryTile label="Total tokens" value={totals.total} />
        <SummaryTile label="Waiting" value={totals.counts.waiting} />
        <SummaryTile label="In progress" value={inProgress} accent />
        <SummaryTile label="Completed" value={totals.counts.completed} />
      </View>

      <Text className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-5 mb-2 px-1">
        OPDs
      </Text>

      {opds.length === 0 ? (
        <View className="items-center pt-10">
          <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center mb-3">
            <Ionicons name="business-outline" size={26} color="#94A3B8" />
          </View>
          <Text className="text-sm font-bold text-slate-800">No OPDs found</Text>
        </View>
      ) : (
        opds.map((opd) => <OpdCard key={opd.opdId} opd={opd} onPress={onSelectOpd} />)
      )}
    </ScrollView>
  );
}