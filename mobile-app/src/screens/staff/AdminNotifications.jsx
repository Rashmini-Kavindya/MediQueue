import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import NotificationBell from '../../components/staff/NotificationBell';
import OverviewTab from './notifications/OverviewTab';
import MessagesTab from './notifications/MessagesTab';
import TemplatesTab from './notifications/TemplatesTab';
import LogsTab from './notifications/LogsTab';
import AlertsTab from './notifications/AlertsTab';
import Header from '../../components/admin/Header';

const TABS = [
  { key: 'overview', label: 'Overview', Component: OverviewTab },
  { key: 'messages', label: 'Messages', Component: MessagesTab },
  { key: 'templates', label: 'Templates', Component: TemplatesTab },
  { key: 'logs', label: 'Logs', Component: LogsTab },
  { key: 'alerts', label: 'Alerts', Component: AlertsTab },
];

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState('overview');

  // The header bell's "See all" opens this screen with { tab: 'messages', scope: 'mine' }
  const params = useRoute().params;
  useEffect(() => {
    if (params?.tab) setActiveTab(params.tab);
  }, [params]);
  // Bumping this makes the active tab reload its data
  const [refreshKey, setRefreshKey] = useState(0);

  const ActiveComponent = TABS.find((t) => t.key === activeTab).Component;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Header
        title="Notifications"
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
        {/* iOS style segmented control */}
        <View className="px-4 pt-3 pb-2">
          <View className="flex-row bg-slate-200/70 rounded-xl p-0.5">
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab(tab.key)}
                  className={`flex-1 items-center py-2 rounded-[10px] ${
                    isActive ? 'bg-white' : ''
                  }`}
                  style={
                    isActive
                      ? {
                          shadowColor: '#000',
                          shadowOpacity: 0.08,
                          shadowRadius: 3,
                          shadowOffset: { width: 0, height: 1 },
                          elevation: 2,
                        }
                      : undefined
                  }
                >
                  <Text
                    className={`text-[11px] ${
                      isActive ? 'font-bold text-sky-700' : 'font-semibold text-slate-500'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ActiveComponent
          refreshKey={refreshKey}
          onOpenTab={setActiveTab}
          initialScope={params?.scope}
          scopeSignal={params?.ts}
        />
      </View>
    </SafeAreaView>
  );
}