import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import caregiverUiLabels from './caregiverUiLabels';
import { useFocusEffect } from '@react-navigation/native';

import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';
import {
  getLinkedPatients,
  getLinkedPatientNotifications,
  getMyNotifications,
  getUserPreferences
} from '../../services/caregiverApi';

const QUEUE_TYPES = new Set([
  'near', 'called', 'QUEUE_UPDATE', 'YOUR_TURN', 'TURN_NEAR'
]);

// Safeguard for already-fetched data. Actual privacy protection MUST
// be enforced by the server's linked-patient notification endpoint.
const isSensitiveConsentAlert = (notification) => {
  const text = `${notification.title || ''} ${notification.message || ''}`;
  return /caregiver link|consent code|verification code|\botp\b/i.test(text);
};

const isQueueAlert = (notification) =>
  notification.source === 'patient-queue' ||
  QUEUE_TYPES.has(notification.type) ||
  (notification.type === 'update' &&
    /queue|token|turn|patient called/i.test(notification.title || ''));

const getTitle = (notification, L) => {
  if (notification.title) return notification.title;
  if (notification.type === 'near' || notification.type === 'TURN_NEAR')
    return L.turnNear;
  if (notification.type === 'called' || notification.type === 'YOUR_TURN')
    return L.patientCalled;
  return isQueueAlert(notification) ? L.queueUpdate : L.accountUpdate;
};

const getIcon = (notification) => {
  if (/linked successfully/i.test(notification.title || ''))
    return 'checkmark-circle-outline';
  if (notification.type === 'called' || notification.type === 'YOUR_TURN')
    return 'megaphone-outline';
  if (notification.type === 'near' || notification.type === 'TURN_NEAR')
    return 'time-outline';
  return 'notifications-outline';
};

export default function CaregiverAlertsScreen({ navigation }) {
  const { i18n } = useTranslation();
  const L = caregiverUiLabels[i18n.resolvedLanguage || i18n.language?.split('-')[0]] || caregiverUiLabels.en;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadAlerts = async () => {
        if (active) {
          setLoading(true);
          setErrorMessage('');
        }

        const ownTask = getMyNotifications();
        const linkedTask = getLinkedPatients();
        const prefsTask = getUserPreferences();
        const [ownResult, linksResult, prefsResult] = await Promise.allSettled([
          ownTask, linkedTask, prefsTask
        ]);
        // Queue-alert preference controls caregiver's queue feed.
        // Personal account/security notifications remain available.
        const queueAppEnabled = prefsResult.status !== 'fulfilled' ||
          (prefsResult.value?.data?.channels || ['app']).includes('app');

        const caregiverNotifications = ownResult.status === 'fulfilled'
          ? (ownResult.value?.data || []).map((n) => ({
              ...n,
              source: 'caregiver'
            }))
          : [];

        let queueNotifications = [];
        let queueLoadFailed = linksResult.status === 'rejected';

        if (linksResult.status === 'fulfilled' && queueAppEnabled) {
          const activeLinks = (linksResult.value?.data || []).filter(
            (link) => link.verified && link.status === 'active'
          );

          // This endpoint is queue-only after applying the backend fix.
          const results = await Promise.allSettled(
            activeLinks.map((link) =>
              getLinkedPatientNotifications(link.linkId)
            )
          );

          queueNotifications = results.flatMap((result) => {
            if (result.status !== 'fulfilled') {
              queueLoadFailed = true;
              return [];
            }

            const data = result.value?.data || {};
            const patient = data.patient || {};
            const patientName = [patient.firstName, patient.lastName]
              .filter(Boolean)
              .join(' ');

            return (data.notifications || [])
              .filter((n) => !isSensitiveConsentAlert(n))
              .map((n) => ({
                ...n,
                source: 'patient-queue',
                patientName
              }));
          });
        }

        if (active) {
          const all = [...caregiverNotifications, ...queueNotifications];
          const unique = Array.from(new Map(
            all.map((n) => [n.notificationId || n._id, n])
          ).values());
          unique.sort((a, b) =>
            new Date(b.sentAt || b.createdAt || 0) -
            new Date(a.sentAt || a.createdAt || 0)
          );

          setNotifications(unique);
          if (ownResult.status === 'rejected' || queueLoadFailed) {
            setErrorMessage(L.loadingAlertsError);
          }
          setLoading(false);
        }
      };

      loadAlerts();
      return () => { active = false; };
    }, [])
  );

  const visibleNotifications = useMemo(() => {
    if (selectedFilter === 'Queue')
      return notifications.filter(isQueueAlert);
    if (selectedFilter === 'Updates')
      return notifications.filter((item) => !isQueueAlert(item));
    return notifications;
  }, [notifications, selectedFilter]);

  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <CaregiverHeader title={L.alerts} navigation={navigation} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>{L.caregiverAlerts}</Text>
          <Text style={styles.pageSubtitle}>
            {L.alertsSubtitle}
          </Text>

          <View style={styles.filterRow}>
            {['All', 'Queue', 'Updates'].map((filter) => {
              const selected = selectedFilter === filter;
              return (
                <TouchableOpacity
                  key={filter === 'All' ? L.all : filter === 'Queue' ? L.queue : L.updates}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedFilter(filter)}
                  style={selected ? styles.activeFilter : styles.filter}
                >
                  <Text style={selected ? styles.activeFilterText : styles.filterText}>
                    {filter === 'All' ? L.all : filter === 'Queue' ? L.queue : L.updates}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!errorMessage && !loading && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#155EEF" />
            </View>
          ) : visibleNotifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={25} color="#155EEF" />
              </View>
              <Text style={styles.emptyTitle}>{L.noAlerts}</Text>
              <Text style={styles.emptyText}>
                {selectedFilter === 'All'
                  ? L.alertsEmpty
                  : (selectedFilter === 'Queue' ? L.queueEmpty : L.updatesEmpty)}
              </Text>
            </View>
          ) : (
            visibleNotifications.map((notification, index) => (
              <View
                key={notification.notificationId || notification._id || index}
                style={notification.isRead ? styles.notificationCard : styles.unreadCard}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons
                    name={getIcon(notification)}
                    size={18}
                    color="#155EEF"
                  />
                </View>

                <View style={styles.notificationBody}>
                  <View style={styles.notificationTop}>
                    <Text style={styles.notificationTitle}>
                      {getTitle(notification, L)}
                    </Text>
                    {!notification.isRead && <View style={styles.unreadDot} />}
                  </View>

                  {!!notification.patientName && (
                    <Text style={styles.patientLabel}>
                      {L.patientLabel}{notification.patientName}
                    </Text>
                  )}

                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {notification.sentAt
                      ? new Date(notification.sentAt).toLocaleString()
                      : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <CaregiverBottomNav
          navigation={navigation}
          activeRoute="CaregiverAlerts"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#EEF1F5' },
  screen: {
    flex: 1, width: '100%', maxWidth: 430,
    alignSelf: 'center', backgroundColor: '#F8F7FC'
  },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 30 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  pageSubtitle: {
    marginTop: 4, fontSize: 11, lineHeight: 17,
    color: '#64748B'
  },
  filterRow: {
    flexDirection: 'row', marginTop: 18, marginBottom: 15
  },
  activeFilter: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 18, backgroundColor: '#155EEF', marginRight: 7
  },
  activeFilterText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  filter: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
    backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#E2E8F0', marginRight: 7
  },
  filterText: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  loading: { paddingVertical: 80 },
  errorText: {
    color: '#B42318', marginBottom: 12,
    fontSize: 12, lineHeight: 18
  },
  emptyCard: {
    marginTop: 15, paddingVertical: 34, paddingHorizontal: 25,
    alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 17, borderWidth: 1, borderColor: '#E2E8F0'
  },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EEF4FF'
  },
  emptyTitle: {
    marginTop: 13, fontSize: 15,
    fontWeight: '800', color: '#111827'
  },
  emptyText: {
    marginTop: 6, color: '#64748B',
    fontSize: 11, lineHeight: 17, textAlign: 'center'
  },
  notificationCard: {
    flexDirection: 'row', padding: 14, marginBottom: 10,
    borderRadius: 14, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E6EAF0'
  },
  unreadCard: {
    flexDirection: 'row', padding: 14, marginBottom: 10,
    borderRadius: 14, backgroundColor: '#F5F8FF',
    borderWidth: 1, borderColor: '#C9D8FF'
  },
  notificationIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EAF1FF'
  },
  notificationBody: { flex: 1, marginLeft: 11 },
  notificationTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between'
  },
  notificationTitle: { flex: 1, color: '#111827', fontSize: 12, fontWeight: '800' },
  unreadDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#155EEF', marginLeft: 8
  },
  patientLabel: {
    marginTop: 4, color: '#155EEF', fontSize: 10, fontWeight: '700'
  },
  notificationMessage: {
    marginTop: 5, color: '#475569', fontSize: 10, lineHeight: 16
  },
  notificationTime: { marginTop: 7, color: '#94A3B8', fontSize: 8 }
});
