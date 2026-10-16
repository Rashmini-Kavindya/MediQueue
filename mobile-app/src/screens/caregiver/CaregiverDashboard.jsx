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
              tintColor="#155EEF"
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
                  <Ionicons name="person-add-outline" size={17} color="#FFFFFF" />
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
                  <Ionicons name="cafe-outline" size={17} color="#155EEF" />
                </View>
                <Text style={styles.quickWaitingText} numberOfLines={2}>{quickLabels.waiting}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!!successMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={19} color="#047857" />
              <Text style={styles.successBannerText}>{successMessage}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Dismiss message"
                onPress={() => setSuccessMessage('')}
                style={styles.successBannerClose}
              >
                <Ionicons name="close" size={18} color="#047857" />
              </TouchableOpacity>
            </View>
          )}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color="#155EEF"
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
                  size={21}
                  color="#155EEF"
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
                              size={10}
                              color="#64748B"
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
                          <Ionicons name="ellipsis-vertical" size={20} color="#475569" />
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
                              size={12}
                              color="#334155"
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
                            size={14}
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
    marginTop: 17,
    marginBottom: 0
  },
  quickAccessHeading: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 7
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 8
  },
  quickAccessButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  quickAddButton: {
    backgroundColor: '#155EEF'
  },
  quickWaitingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFD3FF'
  },
  quickIconCircleAdd: {
    marginRight: 7
  },
  quickIconCircleWaiting: {
    marginRight: 7
  },
  quickAddText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    flexShrink: 1
  },
  quickWaitingText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    color: '#155EEF',
    textAlign: 'center',
    flexShrink: 1
  },
  outer: {
    flex: 1,
    backgroundColor: '#EDF1F5'
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#F9F7FF'
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 21,
    paddingBottom: 26
  },
  welcomeLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748B'
  },
  welcomeName: {
    marginTop: 3,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827'
  },
  updatedRow: {
    marginTop: 20
  },
  updatedText: {
    fontSize: 9,
    color: '#94A3B8'
  },
  loadingContainer: {
    paddingVertical: 70,
    alignItems: 'center'
  },
  successBanner: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#ECFDF5',
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 12,
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
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#FEF2F2'
  },
  errorText: {
    fontSize: 10,
    color: '#B91C1C'
  },
  activeHeader: {
    marginTop: 21,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  activeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827'
  },
  activeCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#DCEEFE'
  },
  activeCountText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#155EEF'
  },
  headerAddButton: {
    marginLeft: 'auto',
    paddingHorizontal: 11,
    minHeight: 32,
    borderRadius: 9,
    backgroundColor: '#155EEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerAddButtonText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  updatedSmall: {
    marginLeft: 'auto',
    fontSize: 8,
    color: '#94A3B8'
  },
  patientCard: {
    padding: 15,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E5EC',
    backgroundColor: '#FFFFFF'
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
    width: 32,
    height: 34,
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F8FAFC'
  },
  avatar: {
    width: 39,
    height: 39,
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D7ECFF'
  },
  avatarText: {
    color: '#0757D8',
    fontSize: 12,
    fontWeight: '800'
  },
  patientName: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800'
  },
  checkinRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkinText: {
    marginLeft: 3,
    fontSize: 8,
    color: '#64748B'
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: '#FFF7E6'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: '#ECFDF3'
  },
  orangeDot: {
    width: 4,
    height: 4,
    marginRight: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B'
  },
  greenDot: {
    width: 4,
    height: 4,
    marginRight: 4,
    borderRadius: 2,
    backgroundColor: '#16A34A'
  },
  waitingText: {
    color: '#B45309',
    fontSize: 8,
    fontWeight: '700'
  },
  verifiedText: {
    color: '#15803D',
    fontSize: 8,
    fontWeight: '700'
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statBox: {
    width: '31%',
    minHeight: 58,
    padding: 9,
    borderRadius: 9,
    backgroundColor: '#F7F9FC'
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 7,
    fontWeight: '700'
  },
  statNumber: {
    marginTop: 7,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800'
  },
  statNumberBlue: {
    marginTop: 7,
    color: '#155EEF',
    fontSize: 15,
    fontWeight: '800'
  },
  smallUnit: {
    color: '#64748B',
    fontSize: 7,
    fontWeight: '500'
  },
  opdBar: {
    minHeight: 37,
    marginTop: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    backgroundColor: '#F8FAFC'
  },
  opdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  opdText: {
    marginLeft: 5,
    fontSize: 8,
    color: '#334155',
    fontWeight: '600'
  },
  roomText: {
    fontSize: 7,
    color: '#94A3B8'
  },
  liveQueueButton: {
    height: 41,
    marginTop: 10,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0757D8'
  },
  liveQueueText: {
    marginRight: 6,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  noQueueBox: {
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#F8FAFC'
  },
  noQueueText: {
    textAlign: 'center',
    fontSize: 9,
    color: '#64748B'
  },
  emptyAddCard: {
    minHeight: 145,
    marginTop: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  addCircle: {
    width: 37,
    height: 37,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FF'
  },
  addTitle: {
    marginTop: 9,
    fontSize: 9,
    fontWeight: '800',
    color: '#111827'
  },
  addSubtitle: {
    marginTop: 6,
    fontSize: 8,
    color: '#94A3B8'
  }
});
