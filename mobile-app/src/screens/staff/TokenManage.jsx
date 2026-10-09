import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Header from '../../components/admin/Header';
import NotificationBell from '../../components/staff/NotificationBell';
import OpdOverview from './tokens/Opdoverview';
import OpdTokenList from './tokens/Opdtokenlist';
import TokenDetailModal from './tokens/Tokendetailmodal';
import { todayLocal, shiftDate, dateLabel } from './tokens/Tokenmeta';

export default function TokenManagement() {
  const [queueDate, setQueueDate] = useState(todayLocal());
  const [opd, setOpd] = useState(null); // null = OPD overview, object = that OPD's tokens
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailToken, setDetailToken] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const isToday = queueDate === todayLocal();

  const openToken = (token) => {
    setDetailToken(token);
    setDetailVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Header
        title="Token Management"
        rightElement={
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => setRefreshKey((k) => k + 1)}
              className="p-2 bg-slate-50 rounded-full border border-slate-100"
              hitSlop={8}
            >
              <Ionicons name="refresh-outline" size={18} color="#475569" />
            </TouchableOpacity>
            <NotificationBell />
          </View>
        }
      />

      <View className="flex-1 bg-slate-50">
        {/* Date switcher */}
        <View className="px-4 pt-3 pb-2.5">
          <View className="flex-row items-center bg-white border border-slate-100 rounded-2xl p-1.5">
            <TouchableOpacity
              onPress={() => setQueueDate((d) => shiftDate(d, -1))}
              hitSlop={6}
              className="w-9 h-9 rounded-xl bg-slate-50 items-center justify-center"
            >
              <Ionicons name="chevron-back" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setQueueDate(todayLocal())}
              className="flex-1 items-center"
            >
              <Text className="text-sm font-bold text-slate-900">{dateLabel(queueDate)}</Text>
              <Text className="text-[10px] text-slate-400 mt-0.5">
                {isToday ? queueDate : `${queueDate}  •  tap for today`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setQueueDate((d) => shiftDate(d, 1))}
              hitSlop={6}
              className="w-9 h-9 rounded-xl bg-slate-50 items-center justify-center"
            >
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {opd ? (
          <>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setOpd(null)}
              className="flex-row items-center px-4 pb-2.5"
            >
              <Ionicons name="chevron-back" size={16} color="#0284C7" />
              <Text className="text-xs font-bold text-sky-700 ml-0.5">All OPDs</Text>
              <Text className="text-xs text-slate-300 mx-2">/</Text>
              <Text className="text-xs font-bold text-slate-900 flex-shrink" numberOfLines={1}>
                {opd.name}
              </Text>
            </TouchableOpacity>

            <OpdTokenList
              opd={opd}
              queueDate={queueDate}
              refreshKey={refreshKey}
              onOpenToken={openToken}
            />
          </>
        ) : (
          <OpdOverview queueDate={queueDate} refreshKey={refreshKey} onSelectOpd={setOpd} />
        )}
      </View>

      <TokenDetailModal
        visible={detailVisible}
        token={detailToken}
        opdName={opd?.name}
        onClose={() => setDetailVisible(false)}
      />
    </SafeAreaView>
  );
}