import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import caregiverUiLabels from './caregiverUiLabels';
import { useFocusEffect } from '@react-navigation/native';

import API from '../../services/api';
import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';
import {
  getLinkedPatients,
  getLinkedPatientNotifications,
  getMyNotifications,
  getUserPreferences
} from '../../services/caregiverApi';

// iOS system colors (same palette as the patient screens)
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.14)',
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

const QUEUE_TYPES = new Set([
  'near', 'called', 'QUEUE_UPDATE', 'YOUR_TURN', 'TURN_NEAR'
]);

// ---------- Message-admin form config + validation ----------
const MAX_MESSAGE_LENGTH = 500;
const SUBJECT_MIN = 3;
const SUBJECT_MAX = 80;
const MESSAGE_MIN = 10;
const PHONE_REGEX = /^(?:\+94|94|0)7\d{8}$/;
const TOKEN_REGEX = /^[A-Za-z0-9-]{1,20}$/;

const CATEGORIES = [
  { key: 'queue', label: 'Queue issue', icon: 'people-outline' },
  { key: 'token', label: 'Token problem', icon: 'ticket-outline' },
  { key: 'technical', label: 'Technical', icon: 'construct-outline' },
  { key: 'feedback', label: 'Feedback', icon: 'chatbox-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' }
];
const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label || 'Other';

const EMPTY_FORM = {
  category: '',
  subject: '',
  message: '',
  priority: 'normal',
  contactPhone: '',
  relatedToken: ''
};

const validateForm = (f) => {
  const errors = {};
  const subject = f.subject.trim();
  const message = f.message.trim();
  const phone = f.contactPhone.replace(/[\s-]/g, '');
  const token = f.relatedToken.trim();

  if (!f.category) errors.category = 'Please select a category';

  if (!subject) errors.subject = 'Subject is required';
  else if (subject.length < SUBJECT_MIN) errors.subject = `At least ${SUBJECT_MIN} characters`;
  else if (subject.length > SUBJECT_MAX) errors.subject = `Max ${SUBJECT_MAX} characters`;

  if (!message) errors.message = 'Message is required';
  else if (message.length < MESSAGE_MIN) errors.message = `At least ${MESSAGE_MIN} characters (${message.length}/${MESSAGE_MIN})`;
  else if (message.length > MAX_MESSAGE_LENGTH) errors.message = `Max ${MAX_MESSAGE_LENGTH} characters`;

  if (phone && !PHONE_REGEX.test(phone)) errors.contactPhone = 'Enter a valid mobile number (e.g. 0771234567)';
  if (token && !TOKEN_REGEX.test(token)) errors.relatedToken = 'Letters, numbers and "-" only (max 20)';

  return errors;
};

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

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function CaregiverAlertsScreen({ navigation }) {
  const { i18n } = useTranslation();
  const L = caregiverUiLabels[i18n.resolvedLanguage || i18n.language?.split('-')[0]] || caregiverUiLabels.en;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  // tabs: 'alerts' | 'sent'
  const [activeTab, setActiveTab] = useState('alerts');

  // message-admin modal (used for both new + edit)
  const [msgOpen, setMsgOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);

  // messages this caregiver sent to the admins
  const [sentMessages, setSentMessages] = useState([]);
  const [expandedSentId, setExpandedSentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  // Messages I sent to the admins
  const fetchSentMessages = async () => {
    try {
      const response = await API.get('/notifications/my-messages');
      const list = response?.data?.success && Array.isArray(response.data.data) ? response.data.data : [];
      setSentMessages(
        list.map((m) => ({
          id: m.broadcastId,
          category: m.category || 'other',
          priority: m.priority || 'normal',
          subject: m.subject || '',
          contactPhone: m.contactPhone || '',
          relatedToken: m.relatedToken || '',
          message: m.message,
          time: formatTime(m.sentAt),
          fullTime: new Date(m.sentAt).toLocaleString(),
          edited: !!m.editedAt,
          seen: (m.readCount || 0) > 0
        }))
      );
    } catch (error) {
      console.error('Error fetching sent messages:', error?.response?.data || error.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSentMessages();
    }, [])
  );

  const visibleNotifications = useMemo(() => {
    if (selectedFilter === 'Queue')
      return notifications.filter(isQueueAlert);
    if (selectedFilter === 'Updates')
      return notifications.filter((item) => !isQueueAlert(item));
    return notifications;
  }, [notifications, selectedFilter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ---------- message admin: new / edit / delete ----------

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const openNewMessage = () => {
    setEditingMsg(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setMsgOpen(true);
  };

  const openEditMessage = (m) => {
    setEditingMsg(m);
    setForm({
      category: m.category,
      subject: m.subject,
      message: m.message,
      priority: m.priority,
      contactPhone: m.contactPhone,
      relatedToken: m.relatedToken
    });
    setFormErrors({});
    setMsgOpen(true);
  };

  const closeMessageModal = () => {
    if (sending) return;
    setMsgOpen(false);
    setEditingMsg(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const handleSendToAdmin = async () => {
    if (sending) return;

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      category: form.category,
      subject: form.subject.trim(),
      message: form.message.trim(),
      priority: form.priority,
      contactPhone: form.contactPhone.replace(/[\s-]/g, ''),
      relatedToken: form.relatedToken.trim().toUpperCase()
    };

    setSending(true);
    try {
      if (editingMsg) {
        await API.put(`/notifications/my-messages/${editingMsg.id}`, payload);
      } else {
        await API.post('/notifications/message-admin', payload);
      }

      const wasEditing = !!editingMsg;
      setMsgOpen(false);
      setEditingMsg(null);
      setForm(EMPTY_FORM);
      setFormErrors({});
      await fetchSentMessages();
      setActiveTab('sent');
      Alert.alert(
        wasEditing ? 'Updated' : 'Sent',
        wasEditing ? 'Your message has been updated.' : 'Your message has been sent to the admin.'
      );
    } catch (error) {
      console.error('Message admin failed:', error?.response?.status, error?.response?.data, error?.message);
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors && Object.keys(serverErrors).length > 0) {
        setFormErrors(serverErrors);
      } else {
        Alert.alert(
          'Error',
          error?.response?.data?.message ||
            (error?.response ? `Server error ${error.response.status}` : `Network error: ${error?.message}`)
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSent = (m) => {
    Alert.alert('Delete message', 'This will also remove the message from the admin inbox. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(m.id);
          try {
            await API.delete(`/notifications/my-messages/${m.id}`);
            setSentMessages((prev) => prev.filter((x) => x.id !== m.id));
          } catch (error) {
            console.error('Delete sent message failed:', error?.response?.data || error.message);
            Alert.alert('Error', error?.response?.data?.message || 'Could not delete the message. Please try again.');
          } finally {
            setDeletingId(null);
          }
        }
      }
    ]);
  };

  // ---------- UI pieces ----------

  const renderTabs = () => (
    <View style={styles.tabsWrap}>
      {[
        { key: 'alerts', label: 'Notifications', count: unreadCount, icon: 'notifications-outline' },
        { key: 'sent', label: 'Sent to admin', count: sentMessages.length, icon: 'paper-plane-outline' }
      ].map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={active ? IOS.blue : IOS.secondaryLabel}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, tab.key === 'alerts' && styles.tabBadgeBlue]}>
                <Text style={[styles.tabBadgeText, tab.key === 'alerts' && { color: '#fff' }]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSentMessages = () => (
    <View>
      <TouchableOpacity onPress={openNewMessage} activeOpacity={0.85} style={styles.composeButton}>
        <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.composeText}>New message to admin</Text>
      </TouchableOpacity>

      {sentMessages.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="paper-plane-outline" size={26} color={IOS.blue} />
          </View>
          <Text style={styles.emptyTitle}>No messages sent yet</Text>
          <Text style={styles.emptyText}>Messages you send to the admin will appear here.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sentCount}>
            {sentMessages.length} {sentMessages.length === 1 ? 'message' : 'messages'} sent
          </Text>

          {sentMessages.map((m) => {
            const expanded = expandedSentId === m.id;
            const isDeleting = deletingId === m.id;
            const urgent = m.priority === 'urgent';
            return (
              <View key={m.id} style={[styles.sentCard, { opacity: isDeleting ? 0.5 : 1 }]}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setExpandedSentId(expanded ? null : m.id)}
                >
                  <View style={styles.sentHeader}>
                    <View style={styles.sentHeaderLeft}>
                      <View style={[styles.sentIcon, { backgroundColor: urgent ? IOS.redSoft : IOS.blueSoft }]}>
                        <Ionicons
                          name={urgent ? 'alert-circle-outline' : 'person-circle-outline'}
                          size={22}
                          color={urgent ? IOS.red : IOS.blue}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.sentSubject}>
                          {m.subject || 'To: Admin'}
                        </Text>
                        <Text numberOfLines={1} style={styles.sentTime}>
                          {m.fullTime}{m.edited ? ' • Edited' : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: m.seen ? IOS.blueSoft : IOS.greenSoft }]}>
                      <Ionicons
                        name={m.seen ? 'checkmark-done' : 'checkmark'}
                        size={13}
                        color={m.seen ? IOS.blue : IOS.green}
                      />
                      <Text style={[styles.statusText, { color: m.seen ? IOS.blue : '#248A3D' }]}>
                        {m.seen ? 'Seen' : 'Sent'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tagRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{categoryLabel(m.category)}</Text>
                    </View>
                    {urgent && (
                      <View style={[styles.tag, { backgroundColor: IOS.redSoft }]}>
                        <Text style={[styles.tagText, { color: IOS.red, fontWeight: '700' }]}>Urgent</Text>
                      </View>
                    )}
                    {!!m.relatedToken && (
                      <View style={[styles.tag, { backgroundColor: IOS.blueSoft }]}>
                        <Text style={[styles.tagText, { color: IOS.blue }]}>Token {m.relatedToken}</Text>
                      </View>
                    )}
                    {!!m.contactPhone && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{m.contactPhone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.bubble}>
                    <Text numberOfLines={expanded ? undefined : 3} style={styles.bubbleText}>
                      {m.message}
                    </Text>
                  </View>

                  {m.message.length > 120 && (
                    <Text style={styles.showMore}>{expanded ? 'Show less' : 'Show more'}</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => openEditMessage(m)}
                    disabled={isDeleting}
                    activeOpacity={0.7}
                    style={[styles.actionButton, { backgroundColor: IOS.blueSoft, marginRight: 8 }]}
                  >
                    <Ionicons name="create-outline" size={16} color={IOS.blue} style={{ marginRight: 6 }} />
                    <Text style={[styles.actionText, { color: IOS.blue }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteSent(m)}
                    disabled={isDeleting}
                    activeOpacity={0.7}
                    style={[styles.actionButton, { backgroundColor: IOS.redSoft }]}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={IOS.red} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color={IOS.red} style={{ marginRight: 6 }} />
                        <Text style={[styles.actionText, { color: IOS.red }]}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );

  const renderAlerts = () => (
    <>
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
          <ActivityIndicator size="large" color={IOS.tertiaryLabel} />
        </View>
      ) : visibleNotifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-outline" size={28} color={IOS.blue} />
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
                size={20}
                color={IOS.blue}
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
    </>
  );

  const fieldLabel = (text, required, extra) => (
    <Text style={[styles.fieldLabel, extra]}>
      {text}{required ? <Text style={{ color: IOS.red }}> *</Text> : null}
    </Text>
  );

  const inputStyle = (hasError) => [styles.input, hasError && { borderColor: IOS.red }];

  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <CaregiverHeader title={L.alerts} navigation={navigation} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>{L.caregiverAlerts}</Text>
          <Text style={styles.pageSubtitle}>
            {L.alertsSubtitle}
          </Text>

          {renderTabs()}

          {activeTab === 'sent' ? renderSentMessages() : renderAlerts()}
        </ScrollView>

        <CaregiverBottomNav
          navigation={navigation}
          activeRoute="CaregiverAlerts"
        />
      </View>

      {/* ---------- Message admin modal (new + edit) ---------- */}
      <Modal visible={msgOpen} transparent animationType="slide" onRequestClose={closeMessageModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIcon}>
                  <Ionicons
                    name={editingMsg ? 'create-outline' : 'chatbubble-ellipses-outline'}
                    size={20}
                    color={IOS.blue}
                  />
                </View>
                <Text style={styles.modalTitle}>
                  {editingMsg ? 'Edit message' : 'Message admin'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeMessageModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={26} color={IOS.tertiaryLabel} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            >
              {/* Category */}
              {fieldLabel('CATEGORY', true)}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => {
                  const active = form.category === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => updateField('category', c.key)}
                      activeOpacity={0.8}
                      style={[styles.chip, { backgroundColor: active ? IOS.blue : IOS.fill }]}
                    >
                      <Ionicons
                        name={c.icon}
                        size={14}
                        color={active ? '#fff' : IOS.secondaryLabel}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.chipText, { color: active ? '#fff' : IOS.secondaryLabel }]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!!formErrors.category && <Text style={styles.errorSmall}>{formErrors.category}</Text>}

              {/* Priority */}
              {fieldLabel('PRIORITY', false, { marginTop: 8 })}
              <View style={{ flexDirection: 'row' }}>
                {[
                  { key: 'normal', label: 'Normal', color: IOS.blue, soft: IOS.blueSoft },
                  { key: 'urgent', label: 'Urgent', color: IOS.red, soft: IOS.redSoft }
                ].map((p) => {
                  const active = form.priority === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => updateField('priority', p.key)}
                      activeOpacity={0.8}
                      style={[
                        styles.priorityButton,
                        {
                          marginRight: p.key === 'normal' ? 8 : 0,
                          backgroundColor: active ? p.soft : IOS.fill,
                          borderColor: active ? p.color : 'transparent'
                        }
                      ]}
                    >
                      <Text style={[styles.priorityText, { color: active ? p.color : IOS.secondaryLabel }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subject */}
              {fieldLabel('SUBJECT', true, { marginTop: 16 })}
              <TextInput
                value={form.subject}
                onChangeText={(v) => updateField('subject', v)}
                placeholder="Short title for your message"
                placeholderTextColor={IOS.tertiaryLabel}
                maxLength={SUBJECT_MAX}
                style={inputStyle(!!formErrors.subject)}
              />
              <View style={styles.helperRow}>
                <Text style={styles.helperError}>{formErrors.subject || ''}</Text>
                <Text style={styles.helperCount}>{form.subject.length}/{SUBJECT_MAX}</Text>
              </View>

              {/* Message */}
              {fieldLabel('MESSAGE', true, { marginTop: 10 })}
              <TextInput
                value={form.message}
                onChangeText={(v) => updateField('message', v)}
                placeholder="Describe your issue or question..."
                placeholderTextColor={IOS.tertiaryLabel}
                multiline
                maxLength={MAX_MESSAGE_LENGTH}
                style={[
                  ...inputStyle(!!formErrors.message),
                  { minHeight: 110, maxHeight: 180, padding: 14, textAlignVertical: 'top' }
                ]}
              />
              <View style={styles.helperRow}>
                <Text style={styles.helperError}>{formErrors.message || ''}</Text>
                <Text style={styles.helperCount}>{form.message.length}/{MAX_MESSAGE_LENGTH}</Text>
              </View>

              {/* Related token (optional) */}
              {fieldLabel('RELATED TOKEN NO. (OPTIONAL)', false, { marginTop: 10 })}
              <TextInput
                value={form.relatedToken}
                onChangeText={(v) => updateField('relatedToken', v)}
                placeholder="e.g. A-023"
                placeholderTextColor={IOS.tertiaryLabel}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                style={inputStyle(!!formErrors.relatedToken)}
              />
              {!!formErrors.relatedToken && <Text style={styles.errorSmall}>{formErrors.relatedToken}</Text>}

              {/* Contact number (optional) */}
              {fieldLabel('CONTACT NUMBER (OPTIONAL)', false, { marginTop: 14 })}
              <TextInput
                value={form.contactPhone}
                onChangeText={(v) => updateField('contactPhone', v)}
                placeholder="07XXXXXXXX"
                placeholderTextColor={IOS.tertiaryLabel}
                keyboardType="phone-pad"
                maxLength={14}
                style={inputStyle(!!formErrors.contactPhone)}
              />
              {!!formErrors.contactPhone && <Text style={styles.errorSmall}>{formErrors.contactPhone}</Text>}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSendToAdmin}
                disabled={sending}
                activeOpacity={0.85}
                style={[styles.submitButton, { opacity: sending ? 0.6 : 1 }]}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{editingMsg ? 'Save changes' : 'Send'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: IOS.groupedBg },
  screen: {
    flex: 1, width: '100%', maxWidth: 430,
    alignSelf: 'center', backgroundColor: IOS.groupedBg
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  pageTitle: {
    fontSize: 28, fontWeight: '700', letterSpacing: 0.3,
    color: IOS.label, paddingHorizontal: 4
  },
  pageSubtitle: {
    marginTop: 4, fontSize: 14, lineHeight: 20,
    color: IOS.tertiaryLabel, paddingHorizontal: 4
  },

  // tabs
  tabsWrap: {
    flexDirection: 'row', marginTop: 18,
    backgroundColor: 'rgba(118,118,128,0.12)',
    borderRadius: 14, borderCurve: 'continuous', padding: 3
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 9,
    borderRadius: 11, borderCurve: 'continuous'
  },
  tabActive: {
    backgroundColor: IOS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 1
  },
  tabText: { fontSize: 13, fontWeight: '600', color: IOS.secondaryLabel },
  tabTextActive: { color: IOS.label },
  tabBadge: {
    marginLeft: 6, minWidth: 18, height: 18, paddingHorizontal: 5,
    borderRadius: 9, backgroundColor: IOS.fill,
    alignItems: 'center', justifyContent: 'center'
  },
  tabBadgeBlue: { backgroundColor: IOS.blue },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: IOS.secondaryLabel },

  // filters
  filterRow: {
    flexDirection: 'row', marginTop: 16, marginBottom: 16
  },
  activeFilter: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999, backgroundColor: IOS.blue, marginRight: 8
  },
  activeFilterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filter: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: IOS.fill, marginRight: 8
  },
  filterText: { color: IOS.secondaryLabel, fontSize: 13, fontWeight: '500' },
  loading: { paddingVertical: 80 },
  errorText: {
    color: IOS.red, marginBottom: 12,
    fontSize: 13, lineHeight: 18, paddingHorizontal: 4
  },
  emptyCard: {
    marginTop: 12, paddingVertical: 36, paddingHorizontal: 24,
    alignItems: 'center', backgroundColor: IOS.white,
    borderRadius: 26, borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,60,67,0.12)',
    shadowColor: '#0B1B3A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 2
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  emptyTitle: {
    marginTop: 14, fontSize: 17,
    fontWeight: '600', color: IOS.label
  },
  emptyText: {
    marginTop: 6, color: IOS.tertiaryLabel,
    fontSize: 14, lineHeight: 20, textAlign: 'center'
  },
  notificationCard: {
    flexDirection: 'row', padding: 14, marginBottom: 12,
    borderRadius: 22, borderCurve: 'continuous', backgroundColor: IOS.white,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,60,67,0.12)',
    shadowColor: '#0B1B3A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 2
  },
  unreadCard: {
    flexDirection: 'row', padding: 14, marginBottom: 12,
    borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#F5F9FF',
    borderWidth: 1, borderColor: 'rgba(0,122,255,0.28)',
    shadowColor: '#0B1B3A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 2
  },
  notificationIcon: {
    width: 42, height: 42, borderRadius: 13, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: IOS.blueSoft
  },
  notificationBody: { flex: 1, marginLeft: 12 },
  notificationTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between'
  },
  notificationTitle: {
    flex: 1, color: IOS.label, fontSize: 15,
    fontWeight: '600', letterSpacing: -0.2
  },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: IOS.blue, marginLeft: 8
  },
  patientLabel: {
    marginTop: 4, color: IOS.blue, fontSize: 12, fontWeight: '600'
  },
  notificationMessage: {
    marginTop: 5, color: IOS.secondaryLabel, fontSize: 13, lineHeight: 19
  },
  notificationTime: { marginTop: 8, color: IOS.tertiaryLabel, fontSize: 11 },

  // sent messages
  composeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginBottom: 16, paddingVertical: 13,
    borderRadius: 16, borderCurve: 'continuous', backgroundColor: IOS.blue,
    shadowColor: IOS.blue, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 3
  },
  composeText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  sentCount: {
    fontSize: 12, color: IOS.tertiaryLabel, fontWeight: '600',
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginBottom: 10, paddingHorizontal: 4
  },
  sentCard: {
    padding: 16, marginBottom: 14, borderRadius: 22, borderCurve: 'continuous',
    backgroundColor: IOS.white,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,60,67,0.12)',
    shadowColor: '#0B1B3A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 2
  },
  sentHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10
  },
  sentHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8
  },
  sentIcon: {
    width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center', marginRight: 12
  },
  sentSubject: {
    fontSize: 16, color: IOS.label, fontWeight: '700', letterSpacing: -0.2
  },
  sentTime: { fontSize: 11, color: IOS.tertiaryLabel, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999
  },
  statusText: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  tag: {
    backgroundColor: IOS.fill, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, marginRight: 6, marginBottom: 6
  },
  tagText: { fontSize: 11, color: IOS.secondaryLabel, fontWeight: '600' },
  bubble: {
    backgroundColor: IOS.surface, borderRadius: 16,
    borderCurve: 'continuous', padding: 14
  },
  bubbleText: { fontSize: 14, color: IOS.label, lineHeight: 21 },
  showMore: {
    fontSize: 12, color: IOS.blue, fontWeight: '600',
    marginTop: 8, alignSelf: 'flex-end'
  },
  actionRow: { flexDirection: 'row', marginTop: 12 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 10,
    borderRadius: 14, borderCurve: 'continuous'
  },
  actionText: { fontSize: 13, fontWeight: '600' },

  // modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: IOS.white, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, borderCurve: 'continuous', maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingBottom: 12
  },
  modalIcon: {
    width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, backgroundColor: IOS.blueSoft
  },
  modalTitle: { fontSize: 18, color: IOS.label, fontWeight: '700' },
  fieldLabel: {
    fontSize: 12, color: IOS.tertiaryLabel, fontWeight: '600', marginBottom: 8
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 999, borderCurve: 'continuous',
    marginRight: 8, marginBottom: 8
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  priorityButton: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderRadius: 14, borderCurve: 'continuous', borderWidth: 1.5
  },
  priorityText: { fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: IOS.surface, borderRadius: 14, borderCurve: 'continuous',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: IOS.label, borderWidth: 1, borderColor: 'transparent'
  },
  helperRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 4
  },
  helperError: { fontSize: 12, color: IOS.red, flex: 1 },
  helperCount: { fontSize: 11, color: IOS.tertiaryLabel },
  errorSmall: { fontSize: 12, color: IOS.red, marginTop: 4, marginBottom: 4 },
  submitButton: {
    marginTop: 20, backgroundColor: IOS.blue, paddingVertical: 14,
    borderRadius: 999, borderCurve: 'continuous', alignItems: 'center'
  },
  submitText: { fontSize: 15, color: '#fff', fontWeight: '600' }
});