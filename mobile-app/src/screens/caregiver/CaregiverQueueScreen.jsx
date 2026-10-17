import React, {
  useCallback,
  useState
} from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import caregiverQueueLabels, {getLocalizedOpdName} from './caregiverQueueLabels';
import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';
import {
  getLinkedPatients,
  getLinkedPatientStatus,
  getAlertPreferences,
  updateAlertPreferences
} from '../../services/caregiverApi';

// iOS system colors (same palette as the patient screens)
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.14)',
  greenDark: '#248A3D',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
  separator: '#E9E9EE',
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

export default function CaregiverQueueScreen({
  navigation,
  route
}) {
  const {i18n} = useTranslation();
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const L = caregiverQueueLabels[locale] || caregiverQueueLabels.en;
  const [alertChannels, setAlertChannels] = useState(['app']);
  const [data, setData] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [alertEnabled, setAlertEnabled] =
    useState(true);
  const [alertThreshold, setAlertThreshold] =
    useState(5);
  const loadQueue = async () => {
    try {
      const linksResponse =
        await getLinkedPatients();
      const links =
        linksResponse?.data || [];
      let activeLink = null;
      if (route?.params?.linkId) {
        activeLink =
          links.find(
            link =>
              link.linkId ===
              route.params.linkId
          );
      }
      if (!activeLink) {
        activeLink =
          links.find(
            link =>
              link.verified &&
              link.status === 'active'
          );
      }
      if (!activeLink) {
        setData(null);
        return;
      }
      const queueResponse =
        await getLinkedPatientStatus(
          activeLink.linkId
        );
      setData(
        queueResponse?.data ||
        null
      );
      try {
        const prefResponse =
          await getAlertPreferences();
        const preference =
          prefResponse?.data;
        if (preference) {
          setAlertThreshold(
            preference.threshold || 5
          );
          const loadedChannels = Array.isArray(preference.channels) ? preference.channels : ['app'];
          setAlertChannels(loadedChannels);
          setAlertEnabled(loadedChannels.includes('app'));
        }
      } catch {
        // Queue should still load if
        // alert preference request fails.
      }
    } catch (error) {
      console.log(
        'Queue load error:',
        error?.response?.data ||
        error.message
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadQueue();
    }, [route?.params?.linkId])
  );
  const handleToggleAlert =
    async (value) => {
      const previousChannels = alertChannels;
      const nextChannels = value
        ? Array.from(new Set([...previousChannels, 'app']))
        : previousChannels.filter(channel => channel !== 'app');
      setAlertEnabled(value);
      setAlertChannels(nextChannels);
      try {
        await updateAlertPreferences({
          threshold:
            alertThreshold,
          channels: nextChannels,
          language: locale
        });
      } catch (error) {
        console.log(
          'Alert preference error:',
          error?.response?.data ||
          error.message
        );
        setAlertEnabled(!value);
        setAlertChannels(previousChannels);
      }
    };
  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <CaregiverHeader
          title={L.title}
          navigation={navigation}
          showBack
          onBack={() =>
            navigation.navigate(
              'CaregiverHome'
            )
          }
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator
                size="large"
                color={IOS.tertiaryLabel}
              />
            </View>
          ) : !data?.token ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="time-outline"
                  size={28}
                  color={IOS.blue}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {L.emptyTitle}
              </Text>
              <Text style={styles.emptyText}>
                {L.emptyText}
              </Text>
            </View>
          ) : (
            <>
              {/* PATIENT NAME */}
              <View style={styles.patientTitleArea}>
                <Text style={styles.patientName}>
                  {data.patient?.firstName}{' '}
                  {data.patient?.lastName}
                </Text>
                <View style={styles.opdPill}>
                  <Ionicons
                    name="medical-outline"
                    size={12}
                    color={IOS.blue}
                  />
                  <Text style={styles.opdPillText}>
                    {L.opd}:{' '}
                    {getLocalizedOpdName(data.liveQueue?.opdName || data.token.opdId, locale).toUpperCase()}
                  </Text>
                </View>
              </View>
              {/* MAIN QUEUE CARD */}
              <View style={styles.queueCard}>
                <Text style={styles.tokenLabel}>
                  {L.tokenNumber}
                </Text>
                <View style={styles.tokenNumberBox}>
                  <Text style={styles.tokenNumber}>
                    {data.token.tokenNo}
                  </Text>
                </View>
                <View style={styles.queueStats}>
                  <View style={styles.queueStat}>
                    <Text style={styles.queueStatLabel}>
                      {L.nowServing}
                    </Text>
                    <Text style={styles.queueStatValue}>
                      {data.liveQueue
                        ?.currentToken ||
                        '--'}
                    </Text>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View style={styles.queueStat}>
                    <Text style={styles.queueStatLabel}>
                      {L.ahead}
                    </Text>
                    <Text style={styles.queueStatValue}>
                      {data.liveQueue
                        ?.patientsAhead ??
                        '--'}
                    </Text>
                  </View>
                </View>
                <View style={styles.horizontalDivider} />
                <Text style={styles.waitLabel}>
                  {L.wait}
                </Text>
                <View style={styles.waitTimeRow}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={IOS.secondaryLabel}
                  />
                  <Text style={styles.waitTime}>
                    {data.liveQueue
                      ?.estimatedWaitMinutes ??
                      '--'}
                    {' '}{L.minutes}
                  </Text>
                </View>
                {/* QUEUE PROGRESS */}
                <View style={styles.progressArea}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width:
                            data.liveQueue
                              ?.patientsAhead <= 1
                              ? '80%'
                              : data.liveQueue
                                  ?.patientsAhead <= 5
                              ? '60%'
                              : '40%'
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressToken}>
                      {data.liveQueue
                        ?.currentToken ||
                        '--'}
                    </Text>
                    <Text style={styles.progressStatus}>
                      {L.progressing}
                    </Text>
                    <Text style={styles.progressToken}>
                      {data.token.tokenNo}
                    </Text>
                  </View>
                </View>
                <View style={styles.normalBox}>
                  <View style={styles.normalDot} />
                  <Text style={styles.normalText}>
                    {L.normal}
                  </Text>
                </View>
              </View>
              {/* ALERT CARD */}
              <View style={styles.alertCard}>
                <View style={styles.alertIcon}>
                  <Ionicons
                    name="notifications"
                    size={18}
                    color={IOS.blue}
                  />
                </View>
                <View style={styles.alertTextArea}>
                  <Text style={styles.alertTitle}>
                    {L.remaining(alertThreshold)}
                  </Text>
                  <Text style={styles.alertSubtitle}>
                    {L.alertHint(alertThreshold)}
                  </Text>
                </View>
                <Switch
                  value={alertEnabled}
                  onValueChange={
                    handleToggleAlert
                  }
                  trackColor={{
                    false: '#E5E5EA',
                    true: IOS.green
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}
        </ScrollView>
        <CaregiverBottomNav
          navigation={navigation}
          activeRoute="CaregiverQueue"
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: IOS.groupedBg
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: IOS.groupedBg
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28
  },
  loading: {
    paddingVertical: 80,
    alignItems: 'center'
  },
  patientTitleArea: {
    alignItems: 'center',
    marginBottom: 16
  },
  patientName: {
    color: IOS.label,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  opdPill: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: IOS.blueSoft
  },
  opdPillText: {
    marginLeft: 5,
    color: IOS.blue,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  queueCard: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    backgroundColor: IOS.white,
    ...cardShadow
  },
  tokenLabel: {
    textAlign: 'center',
    color: IOS.blue,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6
  },
  tokenNumberBox: {
    marginTop: 10,
    height: 88,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  tokenNumber: {
    color: IOS.label,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  queueStats: {
    marginTop: 18,
    flexDirection: 'row'
  },
  queueStat: {
    flex: 1,
    alignItems: 'center'
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: IOS.separator
  },
  queueStatLabel: {
    color: IOS.tertiaryLabel,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4
  },
  queueStatValue: {
    marginTop: 6,
    color: IOS.label,
    fontSize: 24,
    fontWeight: '700'
  },
  horizontalDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 16,
    backgroundColor: IOS.separator
  },
  waitLabel: {
    marginTop: 14,
    textAlign: 'center',
    color: IOS.tertiaryLabel,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4
  },
  waitTimeRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  waitTime: {
    marginLeft: 6,
    color: IOS.label,
    fontSize: 22,
    fontWeight: '700'
  },
  progressArea: {
    marginTop: 18
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: IOS.fill
  },
  progressFill: {
    height: 6,
    borderRadius: 4,
    backgroundColor: IOS.blue
  },
  progressLabels: {
    marginTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  progressToken: {
    color: IOS.tertiaryLabel,
    fontSize: 11
  },
  progressStatus: {
    color: IOS.greenDark,
    fontSize: 11,
    fontWeight: '600'
  },
  normalBox: {
    marginTop: 16,
    height: 34,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.greenSoft
  },
  normalDot: {
    width: 7,
    height: 7,
    marginRight: 6,
    borderRadius: 4,
    backgroundColor: IOS.green
  },
  normalText: {
    color: IOS.greenDark,
    fontSize: 12,
    fontWeight: '600'
  },
  alertCard: {
    minHeight: 68,
    marginTop: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    backgroundColor: IOS.white,
    ...cardShadow
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  alertTextArea: {
    flex: 1,
    marginLeft: 11
  },
  alertTitle: {
    color: IOS.label,
    fontSize: 14,
    fontWeight: '600'
  },
  alertSubtitle: {
    marginTop: 3,
    color: IOS.tertiaryLabel,
    fontSize: 12
  },
  emptyCard: {
    marginTop: 30,
    padding: 28,
    borderRadius: 26,
    borderCurve: 'continuous',
    alignItems: 'center',
    backgroundColor: IOS.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    ...cardShadow
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  emptyTitle: {
    marginTop: 12,
    color: IOS.label,
    fontSize: 17,
    fontWeight: '600'
  },
  emptyText: {
    marginTop: 6,
    color: IOS.tertiaryLabel,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  }
});