import React, {
  useCallback,
  useContext,
  useState
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import caregiverUiLabels from './caregiverUiLabels';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';
import {
  getLinkedPatients,
  getLinkedPatientStatus,
  unlinkPatient
} from '../../services/caregiverApi';
import RemovePatientModal from '../../components/caregiver/RemovePatientModal';

// iOS system colors (same palette as the patient screens)
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.14)',
  greenDark: '#248A3D',
  orange: '#FF9500',
  orangeSoft: 'rgba(255,149,0,0.14)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.08)',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
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
const squircle = { borderCurve: 'continuous' };
const edge = { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,60,67,0.12)' };

// Small, screen-specific translations avoid changing the shared caregiver translations.
const QUICK_ACCESS_LABELS = {
  en: { title: 'QUICK ACCESS', add: 'Add Patient', waiting: 'Waiting Areas' },
  si: { title: 'ඉක්මන් ප්‍රවේශය', add: 'රෝගියෙකු එක් කරන්න', waiting: 'රැඳී සිටින ස්ථාන' },
  ta: { title: 'விரைவு அணுகல்', add: 'நோயாளியைச் சேர்க்க', waiting: 'காத்திருப்பு இடங்கள்' }
};

export default function CaregiverDashboard({
  navigation
}) {
  const { user } =
    useContext(AuthContext);
  const { i18n } = useTranslation();
  const L = caregiverUiLabels[i18n.resolvedLanguage || i18n.language?.split('-')[0]] || caregiverUiLabels.en;
  const [links, setLinks] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState('');
  const [selectedLink, setSelectedLink] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const quickLabels = QUICK_ACCESS_LABELS[language] || QUICK_ACCESS_LABELS.en;
  const actionLabels = {
    en: {
      removed: (name) => `${name} has been removed from your caregiver account.`,
      removeFailed: 'Unable to remove this linked patient. Please try again.'
    },
    si: {
      removed: (name) => `${name} ඔබගේ රෝගී භාරකරු ගිණුමෙන් ඉවත් කර ඇත.`,
      removeFailed: 'සම්බන්ධිත රෝගියා ඉවත් කළ නොහැක. නැවත උත්සාහ කරන්න.'
    },
    ta: {
      removed: (name) => `${name} உங்கள் பராமரிப்பாளர் கணக்கிலிருந்து நீக்கப்பட்டுள்ளார்.`,
      removeFailed: 'இணைக்கப்பட்ட நோயாளியை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
    }
  }[language] || {
    removed: (name) => `${name} has been removed from your caregiver account.`,
    removeFailed: 'Unable to remove this linked patient. Please try again.'
  };
  const openManagePatient = (link) => {
    setRemoveError('');
    setSelectedLink(link);
  };
  const closeManagePatient = () => {
    if (removing) return;
    setRemoveError('');
    setSelectedLink(null);
  };
  const handleUnlinkPatient = async () => {
    if (!selectedLink || removing) return;
    if (!selectedLink.linkId) {
      setRemoveError(actionLabels.removeFailed);
      return;
    }
    setRemoving(true);
    setRemoveError('');
    const linkToRemove = selectedLink;
    const patientName = [
      linkToRemove.patient?.firstName,
      linkToRemove.patient?.lastName
    ].filter(Boolean).join(' ') || 'Patient';
    try {
      const result = await unlinkPatient(linkToRemove.linkId);
      if (result?.success !== true) {
        throw new Error(result?.message || actionLabels.removeFailed);
      }
      // Immediately remove only this caregiver's link from the screen.
      setLinks((previous) => previous.filter(
        (link) => link.linkId !== linkToRemove.linkId
      ));
      setSelectedLink(null);
      setSuccessMessage(actionLabels.removed(patientName));
      // Reload authoritative linked-patient data and the updated count.
      await loadPatients();
    } catch (err) {
      setRemoveError(
        err?.response?.data?.message || err?.message || actionLabels.removeFailed
      );
    } finally {
      setRemoving(false);
    }
  };
  const loadPatients = async () => {
    try {
      setError('');
      const response =
        await getLinkedPatients();
      const linkedPatients =
        response?.data || [];
      const enriched =
        await Promise.all(
          linkedPatients.map(
            async (link) => {
              if (
                !link.verified ||
                link.status !== 'active'
              ) {
                return {
                  ...link,
                  queueData: null
                };
              }
              try {
                const queueResponse =
                  await getLinkedPatientStatus(
                    link.linkId
                  );
                return {
                  ...link,
                  queueData:
                    queueResponse?.data ||
                    null
                };
              } catch {
                return {
                  ...link,
                  queueData: null
                };
              }
            }
          )
        );
      setLinks(enriched);
    } catch (error) {
      setError(
        error?.response?.data?.message ||
        L.noLinks
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [])
  );
  const handleRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };
  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <CaregiverHeader
          title={L.home}
          navigation={navigation}
        />
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.content
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={IOS.tertiaryLabel}
              colors={[IOS.blue]}
            />
          }
        >
          <Text style={styles.welcomeLabel}>
            {L.welcomeBack}
          </Text>
          <Text style={styles.welcomeName}>
            {L.hello}{user?.firstName || 'Caregiver'}
          </Text>
          <View style={styles.updatedRow}>
            <Text style={styles.updatedText}>
              {L.updated}
            </Text>
          </View>
          {/* Always visible above the patient list, regardless of patient count. */}
          <View style={styles.quickAccessSection}>
            <Text style={styles.quickAccessHeading}>{quickLabels.title}</Text>
            <View style={styles.quickAccessRow}>
              <TouchableOpacity
                style={[styles.quickAccessButton, styles.quickAddButton]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={quickLabels.add}
                onPress={() => navigation.navigate('LinkPatient')}
              >
                <View style={styles.quickIconCircleAdd}>
                  <Ionicons name="person-add-outline" size={19} color="#FFFFFF" />
                </View>
                <Text style={styles.quickAddText} numberOfLines={2}>{quickLabels.add}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAccessButton, styles.quickWaitingButton]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={quickLabels.waiting}
                onPress={() => navigation.navigate('CaregiverWaitingAreas')}
              >
                <View style={styles.quickIconCircleWaiting}>
                  <Ionicons name="cafe-outline" size={19} color={IOS.blue} />
                </View>
                <Text style={styles.quickWaitingText} numberOfLines={2}>{quickLabels.waiting}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!!successMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={20} color={IOS.greenDark} />
              <Text style={styles.successBannerText}>{successMessage}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Dismiss message"
                onPress={() => setSuccessMessage('')}
                style={styles.successBannerClose}
              >
                <Ionicons name="close" size={18} color={IOS.greenDark} />
              </TouchableOpacity>
            </View>
          )}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={IOS.tertiaryLabel}
              />
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : links.length === 0 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyAddCard}
              onPress={() =>
                navigation.navigate(
                  'LinkPatient'
                )
              }
            >
              <View style={styles.addCircle}>
                <Ionicons
                  name="add"
                  size={24}
                  color={IOS.blue}
                />
              </View>
              <Text style={styles.addTitle}>
                {L.addPatientCaps}
              </Text>
              <Text style={styles.addSubtitle}>
                {L.addPatientHint}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.activeHeader}>
                <Text style={styles.activeTitle} >
                  {L.activePatients}
                </Text>
                <View style={styles.activeCountBadge}>
                  <Text style={styles.activeCountText}>
                    {links.length} {L.active}
                  </Text>
                </View>
              </View>
              {links.map((link) => {
                const queue =
                  link.queueData;
                return (
                  <View
                    key={
                      link.linkId ||
                      link._id
                    }
                    style={styles.patientCard}
                  >
                    <View style={styles.patientTop}>
                      <View style={styles.patientIdentity}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {link.patient
                              ?.firstName?.[0] || 'P'}
                            {link.patient
                              ?.lastName?.[0] || ''}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.patientName}>
                            {link.patient
                              ?.firstName}{' '}
                            {link.patient
                              ?.lastName}
                          </Text>
                          <View style={styles.checkinRow}>
                            <Ionicons
                              name="time-outline"
                              size={12}
                              color={IOS.tertiaryLabel}
                            />
                            <Text style={styles.checkinText}>
                              {link.patient
                                ?.patientId}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.patientActions}>
                        <View
                          style={
                            queue?.token
                              ? styles.waitingBadge
                              : styles.verifiedBadge
                          }
                        >
                          <View
                            style={
                              queue?.token
                                ? styles.orangeDot
                                : styles.greenDot
                            }
                          />
                          <Text
                            style={
                              queue?.token
                                ? styles.waitingText
                                : styles.verifiedText
                            }
                          >
                            {queue?.token
                              ? L.waiting
                              : L.verified}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.patientMenuButton}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Manage ${link.patient?.firstName || 'patient'}`}
                          onPress={() => openManagePatient(link)}
                        >
                          <Ionicons name="ellipsis-vertical" size={20} color={IOS.secondaryLabel} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {queue?.token ? (
                      <>
                        <View style={styles.statsRow}>
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>
                              {L.token}
                            </Text>
                            <Text style={styles.statNumber}>
                              {queue.token.tokenNo}
                            </Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>
                              {L.inLine}
                            </Text>
                            <Text style={styles.statNumberBlue}>
                              {queue.liveQueue
                                ?.patientsAhead ?? '--'}
                              <Text style={styles.smallUnit}>
                                {' '}{L.ahead}
                              </Text>
                            </Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>
                              {L.estimatedWait}
                            </Text>
                            <Text style={styles.statNumber}>
                              ~
                              {queue.liveQueue
                                ?.estimatedWaitMinutes ?? '--'}
                              m
                            </Text>
                          </View>
                        </View>
                        <View style={styles.opdBar}>
                          <View style={styles.opdLeft}>
                            <Ionicons
                              name="medical-outline"
                              size={14}
                              color={IOS.secondaryLabel}
                            />
                            <Text style={styles.opdText}>
                              {queue.liveQueue
                                ?.opdName ||
                                queue.token.opdId}
                            </Text>
                          </View>
                          <Text style={styles.roomText}>
                            {queue.token.roomId ||
                              ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.liveQueueButton}
                          onPress={() =>
                            navigation.navigate(
                              'CaregiverQueue',
                              {
                                linkId:
                                  link.linkId
                              }
                            )
                          }
                        >
                          <Text style={styles.liveQueueText}>
                            {L.viewLiveQueue}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.noQueueBox}>
                        <Text style={styles.noQueueText}>
                          {L.noActiveQueue}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}

            </>
          )}
        </ScrollView>
        <CaregiverBottomNav
          navigation={navigation}
          activeRoute="CaregiverHome"
        />
        <RemovePatientModal
          visible={!!selectedLink}
          patientLink={selectedLink}
          language={language}
          busy={removing}
          error={removeError}
          onClose={closeManagePatient}
          onViewQueue={() => {
            if (!selectedLink?.linkId || removing) return;
            const linkId = selectedLink.linkId;
            closeManagePatient();
            navigation.navigate('CaregiverQueue', { linkId });
          }}
          onConfirm={handleUnlinkPatient}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  quickAccessSection: {
    marginTop: 18,
    marginBottom: 0
  },
  quickAccessHeading: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: IOS.tertiaryLabel,
    marginBottom: 8,
    paddingHorizontal: 4
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 10
  },
  quickAccessButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderCurve: 'continuous',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  quickAddButton: {
    backgroundColor: IOS.blue,
    shadowColor: IOS.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4
  },
  quickWaitingButton: {
    backgroundColor: IOS.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    ...cardShadow
  },
  quickIconCircleAdd: {
    marginRight: 8
  },
  quickIconCircleWaiting: {
    marginRight: 8
  },
  quickAddText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flexShrink: 1
  },
  quickWaitingText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: IOS.blue,
    textAlign: 'center',
    flexShrink: 1
  },
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
    paddingTop: 20,
    paddingBottom: 26
  },
  welcomeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: IOS.tertiaryLabel,
    paddingHorizontal: 4
  },
  welcomeName: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: IOS.label,
    paddingHorizontal: 4
  },
  updatedRow: {
    marginTop: 6,
    paddingHorizontal: 4
  },
  updatedText: {
    fontSize: 12,
    color: IOS.tertiaryLabel
  },
  loadingContainer: {
    paddingVertical: 70,
    alignItems: 'center'
  },
  successBanner: {
    marginTop: 14,
    backgroundColor: IOS.greenSoft,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  successBannerText: {
    color: IOS.greenDark,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
    lineHeight: 18
  },
  successBannerClose: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorBox: {
    marginTop: 15,
    padding: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: IOS.redSoft
  },
  errorText: {
    fontSize: 13,
    color: IOS.red
  },
  activeHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center'
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: IOS.label
  },
  activeCountBadge: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: IOS.blueSoft
  },
  activeCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: IOS.blue
  },
  headerAddButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: IOS.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerAddButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  updatedSmall: {
    marginLeft: 'auto',
    fontSize: 11,
    color: IOS.tertiaryLabel
  },
  patientCard: {
    padding: 16,
    marginBottom: 18,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
    backgroundColor: IOS.white,
    shadowColor: '#0B1B3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2
  },
  patientTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  patientIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0
  },
  patientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6
  },
  patientMenuButton: {
    width: 34,
    height: 36,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: IOS.fill
  },
  avatar: {
    width: 44,
    height: 44,
    marginRight: 12,
    borderRadius: 13,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  avatarText: {
    color: IOS.blue,
    fontSize: 15,
    fontWeight: '700'
  },
  patientName: {
    color: IOS.label,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  checkinRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkinText: {
    marginLeft: 4,
    fontSize: 12,
    color: IOS.tertiaryLabel
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: IOS.orangeSoft
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: IOS.greenSoft
  },
  orangeDot: {
    width: 6,
    height: 6,
    marginRight: 5,
    borderRadius: 3,
    backgroundColor: IOS.orange
  },
  greenDot: {
    width: 6,
    height: 6,
    marginRight: 5,
    borderRadius: 3,
    backgroundColor: IOS.green
  },
  waitingText: {
    color: IOS.orange,
    fontSize: 11,
    fontWeight: '600'
  },
  verifiedText: {
    color: IOS.greenDark,
    fontSize: 11,
    fontWeight: '600'
  },
  statsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statBox: {
    width: '31.5%',
    minHeight: 68,
    padding: 11,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: IOS.surface
  },
  statLabel: {
    color: IOS.tertiaryLabel,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4
  },
  statNumber: {
    marginTop: 8,
    color: IOS.label,
    fontSize: 18,
    fontWeight: '700'
  },
  statNumberBlue: {
    marginTop: 8,
    color: IOS.blue,
    fontSize: 18,
    fontWeight: '700'
  },
  smallUnit: {
    color: IOS.secondaryLabel,
    fontSize: 10,
    fontWeight: '500'
  },
  opdBar: {
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: IOS.surface
  },
  opdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  opdText: {
    marginLeft: 6,
    fontSize: 13,
    color: IOS.label,
    fontWeight: '600'
  },
  roomText: {
    fontSize: 12,
    color: IOS.tertiaryLabel
  },
  liveQueueButton: {
    height: 48,
    marginTop: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blue,
    shadowColor: IOS.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4
  },
  liveQueueText: {
    marginRight: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  },
  noQueueBox: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: IOS.surface
  },
  noQueueText: {
    textAlign: 'center',
    fontSize: 13,
    color: IOS.tertiaryLabel
  },
  emptyAddCard: {
    minHeight: 160,
    marginTop: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,122,255,0.35)',
    borderRadius: 26,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.white
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  addTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: IOS.label
  },
  addSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: IOS.tertiaryLabel
  }
});