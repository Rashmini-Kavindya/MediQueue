import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import API from '../../services/api';
import AppHeader from '../../components/AppHeader'; // Reusable Header එක import කිරීම

// iOS system colors - blue as accent, soft grouped background + white cards
const IOS = {
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.10)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.14)',
  orange: '#FF9500',
  orangeSoft: 'rgba(255,149,0,0.14)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.08)',
  label: '#1C1C1E',
  secondaryLabel: '#636366',
  tertiaryLabel: '#8E8E93',
  fill: '#EFEFF4',
  surface: '#F7F7FA',
  separator: '#E4E4EA',
  groupedBg: '#F2F2F7',
  white: '#FFFFFF',
};

// iOS style soft shadow for cards
const cardShadow = {
  shadowColor: '#0B1B3A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 2,
};

// Shared layout bits
const squircle = { borderCurve: 'continuous' };
const cardBase = {
  backgroundColor: IOS.white,
  borderRadius: 22,
  padding: 18,
  marginBottom: 14,
  borderWidth: 0.5,
  borderColor: 'rgba(60,60,67,0.12)',
  borderCurve: 'continuous',
};
const iconBox = { width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous', justifyContent: 'center', alignItems: 'center', marginRight: 12 };
const BODY_INDENT = 52; // icon width (40) + margin (12)

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
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];
const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label || 'Other';

const EMPTY_FORM = {
  category: '',
  subject: '',
  message: '',
  priority: 'normal',
  contactPhone: '',
  relatedToken: '',
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

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Alerts({ navigation }) {
  const { user } = useContext(AuthContext);
  const { getFontSize, t } = useSettings();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);

  // tabs: 'alerts' | 'sent'
  const [activeTab, setActiveTab] = useState('alerts');

  // detail modal
  const [selected, setSelected] = useState(null);

  // message-admin modal (used for both new + edit)
  const [msgOpen, setMsgOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null); // null = new message, object = editing

  // messages the user has sent to the admin (loaded from the server)
  const [sentMessages, setSentMessages] = useState([]);
  const [expandedSentId, setExpandedSentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAlerts = async () => {
    try {
      const response = await API.get('/notifications');
      
      let rawData = [];
      if (response.data && response.data.success) {
        if (Array.isArray(response.data.data)) {
          rawData = response.data.data;
        } else if (response.data.data) {
          rawData = [response.data.data];
        }
      }

      if (rawData.length > 0) {
        const formattedAlerts = rawData.map((item, index) => {
          let rawType = (item.type || '').toUpperCase();
          let rawMessage = (item.message || '').toLowerCase();
          let detectedType = 'QUEUE_UPDATE';

          if (rawType.includes('TURN') || rawMessage.includes('proceed') || rawMessage.includes('turn')) {
            detectedType = 'YOUR_TURN';
          } else if (rawType.includes('NEAR') || rawMessage.includes('remaining') || rawMessage.includes('ahead')) {
            detectedType = 'TURN_NEAR';
          } else {
            detectedType = 'QUEUE_UPDATE';
          }

          const itemTime = item.sentAt ? new Date(item.sentAt).getTime() : new Date().getTime();
          const oneHourAgo = new Date().getTime() - (60 * 60 * 1000);
          const isReallyOlder = item.isRead === true || itemTime < oneHourAgo;

          return {
            id: item.notificationId || item._id || index.toString(),
            type: detectedType,
            time: item.sentAt ? new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullTime: item.sentAt ? new Date(item.sentAt).toLocaleString() : new Date().toLocaleString(),
            title: item.title || '',
            message: item.message || item.title,
            room: item.room || item.roomNo || 'OPD Section',
            location: item.location || item.hospital || 'Hospital Premises',
            doctor: item.doctor || item.clinicName || 'Medical Staff',
            remainingNumbers: item.remainingNumbers || item.patientsAhead || 0,
            currentServing: item.currentServing || item.currentToken || '-',
            aheadCount: item.aheadCount || item.patientsAhead || 0,
            isOlder: isReallyOlder,
            isRead: item.isRead === true,
          };
        });
        setAlerts(formattedAlerts);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    }
  };

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
          seen: (m.readCount || 0) > 0,
        }))
      );
    } catch (error) {
      console.error('Error fetching sent messages:', error?.response?.data || error.message);
    }
  };

  const loadAll = async () => {
    await Promise.all([fetchAlerts(), fetchSentMessages()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const handleDismiss = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setAlerts((prevAlerts) => prevAlerts.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
      setAlerts((prevAlerts) => prevAlerts.filter((item) => item.id !== id));
    }
  };

  // ---------- read / open / clear ----------

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Tap a card -> open details + mark as seen
  const openDetail = (item) => {
    setSelected(item);
    if (!item.isRead) markAsRead(item.id);
  };

  const handleReadAll = async () => {
    try {
      await API.put('/notifications/read-all');
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Could not mark notifications as read. Please try again.');
    }
  };

  const handleClearAll = () => {
    if (alerts.length === 0) return;
    Alert.alert('Clear all', 'Delete all your notifications? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.delete('/notifications/clear-all');
            setAlerts([]);
          } catch (error) {
            console.error('Error clearing notifications:', error);
            Alert.alert('Error', 'Could not clear notifications. Please try again.');
          }
        },
      },
    ]);
  };

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
      relatedToken: m.relatedToken,
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
      relatedToken: form.relatedToken.trim().toUpperCase(),
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
        setFormErrors(serverErrors); // show backend validation under each field
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
        },
      },
    ]);
  };

  // single tick = delivered, double blue tick = seen
  const renderTime = (item) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '500' }}>{item.time}</Text>
      <Ionicons
        name={item.isRead ? 'checkmark-done' : 'checkmark'}
        size={16}
        color={item.isRead ? IOS.blue : IOS.tertiaryLabel}
        style={{ marginLeft: 4 }}
      />
    </View>
  );

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const newAlerts = alerts.filter((a) => !a.isOlder);
  const olderAlerts = alerts.filter((a) => a.isOlder);

  const patientName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User';

  const selectedLive = selected ? alerts.find((a) => a.id === selected.id) || selected : null;

  // small helpers for the form UI
  const fieldLabel = (text, required, extraStyle) => (
    <Text style={[{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '600', marginBottom: 8 }, extraStyle]}>
      {text}{required ? <Text style={{ color: IOS.red }}> *</Text> : null}
    </Text>
  );

  const inputStyle = (hasError) => [
    {
      backgroundColor: IOS.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: getFontSize(15),
      color: IOS.label,
      borderWidth: 1,
      borderColor: hasError ? IOS.red : 'transparent',
    },
    squircle,
  ];

  // ---------- Segmented tab control ----------
  const renderTabs = () => (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: 'rgba(118,118,128,0.12)',
          borderRadius: 14,
          padding: 3,
          marginBottom: 16,
        },
        squircle,
      ]}
    >
      {[
        { key: 'alerts', label: 'Notifications', count: unreadCount, icon: 'notifications-outline' },
        { key: 'sent', label: 'Sent to admin', count: sentMessages.length, icon: 'paper-plane-outline' },
      ].map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
            style={[
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                borderRadius: 11,
                backgroundColor: active ? IOS.white : 'transparent',
              },
              squircle,
              active && {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 1,
              },
            ]}
          >
            <Ionicons name={tab.icon} size={15} color={active ? IOS.blue : IOS.secondaryLabel} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: getFontSize(13), fontWeight: '600', color: active ? IOS.label : IOS.secondaryLabel }}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={{
                  marginLeft: 6,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 5,
                  borderRadius: 9,
                  backgroundColor: tab.key === 'alerts' ? IOS.blue : IOS.fill,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: getFontSize(11),
                    fontWeight: '700',
                    color: tab.key === 'alerts' ? '#fff' : IOS.secondaryLabel,
                  }}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ---------- Sent messages (admin) view ----------
  const renderSentMessages = () => (
    <View>
      {/* Compose button */}
      <TouchableOpacity
        onPress={openNewMessage}
        activeOpacity={0.85}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: IOS.blue,
            paddingVertical: 13,
            borderRadius: 16,
            marginBottom: 16,
            shadowColor: IOS.blue,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 3,
          },
          squircle,
        ]}
      >
        <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: getFontSize(15), color: '#fff', fontWeight: '600' }}>New message to admin</Text>
      </TouchableOpacity>

      {sentMessages.length === 0 ? (
        <View
          style={[
            {
              backgroundColor: IOS.white,
              borderRadius: 22,
              paddingVertical: 40,
              paddingHorizontal: 24,
              alignItems: 'center',
              borderWidth: 0.5,
              borderColor: 'rgba(60,60,67,0.12)',
            },
            squircle,
            cardShadow,
          ]}
        >
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: IOS.blueSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="paper-plane-outline" size={26} color={IOS.blue} />
          </View>
          <Text style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '600', marginBottom: 4 }}>
            No messages sent yet
          </Text>
          <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, textAlign: 'center', lineHeight: 19 }}>
            Messages you send to the admin will appear here.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 4 }}>
            {sentMessages.length} {sentMessages.length === 1 ? 'message' : 'messages'} sent
          </Text>

          {sentMessages.map((m) => {
            const expanded = expandedSentId === m.id;
            const isDeleting = deletingId === m.id;
            const urgent = m.priority === 'urgent';
            return (
              <View key={m.id} style={[cardBase, cardShadow, { opacity: isDeleting ? 0.5 : 1 }]}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setExpandedSentId(expanded ? null : m.id)}
                >
                  {/* Header: subject + status */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                      <View style={[iconBox, { backgroundColor: urgent ? IOS.redSoft : IOS.blueSoft }]}>
                        <Ionicons
                          name={urgent ? 'alert-circle-outline' : 'person-circle-outline'}
                          size={22}
                          color={urgent ? IOS.red : IOS.blue}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: getFontSize(16), color: IOS.label, fontWeight: '700', letterSpacing: -0.2 }}>
                          {m.subject || 'To: Admin'}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: getFontSize(11), color: IOS.tertiaryLabel, marginTop: 1 }}>
                          {m.fullTime}{m.edited ? ' • Edited' : ''}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        backgroundColor: m.seen ? IOS.blueSoft : IOS.greenSoft,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons
                        name={m.seen ? 'checkmark-done' : 'checkmark'}
                        size={13}
                        color={m.seen ? IOS.blue : IOS.green}
                      />
                      <Text style={{ fontSize: getFontSize(11), color: m.seen ? IOS.blue : '#248A3D', fontWeight: '600', marginLeft: 4 }}>
                        {m.seen ? 'Seen' : 'Sent'}
                      </Text>
                    </View>
                  </View>

                  {/* Tags: category / urgent / token / phone */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                    <View style={{ backgroundColor: IOS.fill, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
                      <Text style={{ fontSize: getFontSize(11), color: IOS.secondaryLabel, fontWeight: '600' }}>{categoryLabel(m.category)}</Text>
                    </View>
                    {urgent && (
                      <View style={{ backgroundColor: IOS.redSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
                        <Text style={{ fontSize: getFontSize(11), color: IOS.red, fontWeight: '700' }}>Urgent</Text>
                      </View>
                    )}
                    {!!m.relatedToken && (
                      <View style={{ backgroundColor: IOS.blueSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
                        <Text style={{ fontSize: getFontSize(11), color: IOS.blue, fontWeight: '600' }}>Token {m.relatedToken}</Text>
                      </View>
                    )}
                    {!!m.contactPhone && (
                      <View style={{ backgroundColor: IOS.fill, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 6 }}>
                        <Text style={{ fontSize: getFontSize(11), color: IOS.secondaryLabel, fontWeight: '600' }}>{m.contactPhone}</Text>
                      </View>
                    )}
                  </View>

                  {/* Message bubble */}
                  <View style={[{ backgroundColor: IOS.surface, borderRadius: 16, padding: 14 }, squircle]}>
                    <Text
                      numberOfLines={expanded ? undefined : 3}
                      style={{ fontSize: getFontSize(14), color: IOS.label, lineHeight: 21 }}
                    >
                      {m.message}
                    </Text>
                  </View>

                  {m.message.length > 120 && (
                    <Text style={{ fontSize: getFontSize(12), color: IOS.blue, fontWeight: '600', marginTop: 8, alignSelf: 'flex-end' }}>
                      {expanded ? 'Show less' : 'Show more'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Edit / Delete actions */}
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => openEditMessage(m)}
                    disabled={isDeleting}
                    activeOpacity={0.7}
                    style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: IOS.blueSoft, paddingVertical: 10, borderRadius: 14, marginRight: 8 }, squircle]}
                  >
                    <Ionicons name="create-outline" size={16} color={IOS.blue} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: getFontSize(13), color: IOS.blue, fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteSent(m)}
                    disabled={isDeleting}
                    activeOpacity={0.7}
                    style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: IOS.redSoft, paddingVertical: 10, borderRadius: 14 }, squircle]}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={IOS.red} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color={IOS.red} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: getFontSize(13), color: IOS.red, fontWeight: '600' }}>Delete</Text>
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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: IOS.groupedBg }}>
      {/* Reusable AppHeader එක මෙතැනට ඇතුළත් කර ඇත */}
      <AppHeader
        userName={patientName}
        onNotificationPress={() => {
          // දැනට Alerts page එකේදීම සිටී
        }}
        onPrescriptionPress={() => navigation?.navigate('Prescriptions')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={IOS.tertiaryLabel} colors={[IOS.blue]} />}
      >

        {loading ? (
          <View style={{ paddingVertical: 80, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={IOS.tertiaryLabel} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>

            {/* Page title */}
            <Text style={{ fontSize: getFontSize(28), color: IOS.label, fontWeight: '700', letterSpacing: 0.3, marginBottom: 12, paddingHorizontal: 4 }}>
              Alerts
            </Text>

            {/* Tabs: Notifications / Sent to admin */}
            {renderTabs()}

            {activeTab === 'sent' ? (
              renderSentMessages()
            ) : (
              <>
                {/* Action buttons: Read all / Clear all / Message admin */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, paddingHorizontal: 4 }}>
                  <TouchableOpacity
                    onPress={handleReadAll}
                    disabled={unreadCount === 0}
                    activeOpacity={0.7}
                    style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: IOS.blueSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8, marginBottom: 8, opacity: unreadCount === 0 ? 0.45 : 1 }, squircle]}
                  >
                    <Ionicons name="checkmark-done" size={16} color={IOS.blue} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: getFontSize(13), color: IOS.blue, fontWeight: '600' }}>Read all</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleClearAll}
                    disabled={alerts.length === 0}
                    activeOpacity={0.7}
                    style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: IOS.fill, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8, marginBottom: 8, opacity: alerts.length === 0 ? 0.45 : 1 }, squircle]}
                  >
                    <Ionicons name="trash-outline" size={16} color={IOS.red} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: getFontSize(13), color: IOS.red, fontWeight: '600' }}>Clear all</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={openNewMessage}
                    activeOpacity={0.7}
                    style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: IOS.fill, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginBottom: 8 }, squircle]}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={IOS.secondaryLabel} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: getFontSize(13), color: IOS.secondaryLabel, fontWeight: '600' }}>Message admin</Text>
                  </TouchableOpacity>
                </View>

                {newAlerts.length === 0 ? (
                  <View style={[{ backgroundColor: IOS.white, borderRadius: 22, paddingVertical: 36, alignItems: 'center', marginBottom: 14, borderWidth: 0.5, borderColor: 'rgba(60,60,67,0.12)' }, squircle, cardShadow]}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: IOS.fill, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                      <Ionicons name="notifications-off-outline" size={26} color={IOS.tertiaryLabel} />
                    </View>
                    <Text style={{ fontSize: getFontSize(14), color: IOS.tertiaryLabel, fontWeight: '500' }}>
                      No new alerts
                    </Text>
                  </View>
                ) : (
                  newAlerts.map((item) => {
                    // 1. YOUR TURN CARD
                    if (item.type === 'YOUR_TURN') {
                      return (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => openDetail(item)} key={item.id} style={[cardBase, cardShadow, { borderColor: 'rgba(0,122,255,0.30)' }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={[iconBox, { backgroundColor: IOS.blue }]}>
                                <Ionicons name="notifications" size={19} color="#fff" />
                              </View>
                              <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '700', letterSpacing: -0.2 }}>
                                Your turn
                              </Text>
                            </View>
                            {renderTime(item)}
                          </View>

                          <View style={{ marginLeft: BODY_INDENT }}>
                            <Text style={{ fontSize: getFontSize(15), color: IOS.label, fontWeight: '600', lineHeight: 21 }}>
                              Please proceed to <Text style={{ color: IOS.blue }}>{item.room}.</Text>
                            </Text>
                            <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, marginTop: 4, lineHeight: 19 }}>
                              - {item.location} {'\n'}{item.doctor}
                            </Text>

                            <View style={{ flexDirection: 'row', marginTop: 16 }}>
                              <TouchableOpacity activeOpacity={0.85} style={[{ backgroundColor: IOS.blue, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, marginRight: 10 }, squircle]}>
                                <Text style={{ fontSize: getFontSize(13), color: '#fff', fontWeight: '600' }}>
                                  View directions
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDismiss(item.id)}
                                activeOpacity={0.7}
                                style={[{ backgroundColor: IOS.fill, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 }, squircle]}
                              >
                                <Text style={{ fontSize: getFontSize(13), color: IOS.secondaryLabel, fontWeight: '600' }}>
                                  Dismiss
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }

                    // 2. YOUR TURN IS NEAR CARD
                    if (item.type === 'TURN_NEAR') {
                      return (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => openDetail(item)} key={item.id} style={[cardBase, cardShadow]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={[iconBox, { backgroundColor: IOS.orangeSoft }]}>
                                <Feather name="clock" size={19} color={IOS.orange} />
                              </View>
                              <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '700', letterSpacing: -0.2 }}>
                                Your turn is near
                              </Text>
                            </View>
                            {renderTime(item)}
                          </View>

                          <View style={{ marginLeft: BODY_INDENT }}>
                            <Text style={{ fontSize: getFontSize(14), color: IOS.secondaryLabel, lineHeight: 21 }}>
                              <Text style={{ fontWeight: '700', color: IOS.label }}>
                                {item.remainingNumbers} numbers remaining.
                              </Text>{' '}
                              {item.message || 'Please return to the OPD waiting area immediately.'}
                            </Text>

                            <View style={{ marginTop: 14, alignSelf: 'flex-start', backgroundColor: IOS.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: IOS.orange, marginRight: 8 }} />
                              <Text style={{ fontSize: getFontSize(12), color: IOS.secondaryLabel, fontWeight: '600' }}>
                                Current serving: {item.currentServing} ({item.aheadCount} ahead)
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }

                    // 3. QUEUE UPDATE CARD
                    return (
                      <TouchableOpacity activeOpacity={0.9} onPress={() => openDetail(item)} key={item.id} style={[cardBase, cardShadow]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={[iconBox, { backgroundColor: IOS.fill }]}>
                              <Ionicons name="clipboard-outline" size={19} color={IOS.secondaryLabel} />
                            </View>
                            <Text style={{ fontSize: getFontSize(17), color: IOS.label, fontWeight: '700', letterSpacing: -0.2 }}>
                              Queue update
                            </Text>
                          </View>
                          {renderTime(item)}
                        </View>

                        <View style={{ marginLeft: BODY_INDENT, marginTop: 6 }}>
                          <Text style={{ fontSize: getFontSize(14), color: IOS.secondaryLabel, lineHeight: 21 }}>
                            {item.message || 'Queue progress updated for your active booking.'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}

                {/* Older Notifications Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 14, paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: getFontSize(13), color: IOS.tertiaryLabel, fontWeight: '600', marginRight: 12 }}>
                    Older notifications
                  </Text>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: 'rgba(60,60,67,0.25)' }} />
                </View>

                {olderAlerts.length === 0 ? (
                  <View style={{ paddingVertical: 8 }} />
                ) : (
                  olderAlerts.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => openDetail(item)}
                      style={[{ backgroundColor: IOS.white, borderRadius: 18, padding: 16, opacity: 0.7, marginBottom: 10, borderWidth: 0.5, borderColor: 'rgba(60,60,67,0.10)' }, squircle]}
                    >
                      <Text style={{ fontSize: getFontSize(13), color: IOS.secondaryLabel, lineHeight: 19 }}>{item.message}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 }}>
                        {renderTime(item)}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* ---------- Detail modal ---------- */}
      <Modal visible={!!selectedLive} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 }}>
          {selectedLive && (
            <View style={[{ backgroundColor: IOS.white, borderRadius: 24, padding: 20 }, squircle]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: getFontSize(18), color: IOS.label, fontWeight: '700', flex: 1, marginRight: 8 }}>
                  {selectedLive.title ||
                    (selectedLive.type === 'YOUR_TURN' ? 'Your turn'
                      : selectedLive.type === 'TURN_NEAR' ? 'Your turn is near'
                      : 'Queue update')}
                </Text>
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={26} color={IOS.tertiaryLabel} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: getFontSize(12), color: IOS.tertiaryLabel, fontWeight: '500' }}>{selectedLive.fullTime}</Text>
                <Ionicons
                  name={selectedLive.isRead ? 'checkmark-done' : 'checkmark'}
                  size={16}
                  color={selectedLive.isRead ? IOS.blue : IOS.tertiaryLabel}
                  style={{ marginLeft: 6 }}
                />
              </View>

              <Text style={{ fontSize: getFontSize(15), color: IOS.label, lineHeight: 22 }}>
                {selectedLive.message}
              </Text>

              {(selectedLive.type === 'YOUR_TURN' || selectedLive.type === 'TURN_NEAR') && (
                <View style={{ marginTop: 14, backgroundColor: IOS.surface, borderRadius: 14, padding: 12 }}>
                  <Text style={{ fontSize: getFontSize(13), color: IOS.secondaryLabel, lineHeight: 20 }}>
                    Room: {selectedLive.room}{'\n'}Location: {selectedLive.location}{'\n'}Doctor: {selectedLive.doctor}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => { const id = selectedLive.id; setSelected(null); handleDismiss(id); }}
                  activeOpacity={0.8}
                  style={[{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: IOS.fill, paddingVertical: 12, borderRadius: 999, marginRight: 10 }, squircle]}
                >
                  <Ionicons name="trash-outline" size={17} color={IOS.red} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: getFontSize(14), color: IOS.red, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  activeOpacity={0.85}
                  style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: IOS.blue, paddingVertical: 12, borderRadius: 999 }, squircle]}
                >
                  <Text style={{ fontSize: getFontSize(14), color: '#fff', fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ---------- Message admin modal (new + edit) ---------- */}
      <Modal visible={msgOpen} transparent animationType="slide" onRequestClose={closeMessageModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
        >
          <View style={[{ backgroundColor: IOS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }, squircle]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[iconBox, { backgroundColor: IOS.blueSoft, marginRight: 10 }]}>
                  <Ionicons name={editingMsg ? 'create-outline' : 'chatbubble-ellipses-outline'} size={20} color={IOS.blue} />
                </View>
                <Text style={{ fontSize: getFontSize(18), color: IOS.label, fontWeight: '700' }}>
                  {editingMsg ? 'Edit message' : 'Message admin'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeMessageModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          marginRight: 8,
                          marginBottom: 8,
                          backgroundColor: active ? IOS.blue : IOS.fill,
                        },
                        squircle,
                      ]}
                    >
                      <Ionicons name={c.icon} size={14} color={active ? '#fff' : IOS.secondaryLabel} style={{ marginRight: 5 }} />
                      <Text style={{ fontSize: getFontSize(13), fontWeight: '600', color: active ? '#fff' : IOS.secondaryLabel }}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!!formErrors.category && (
                <Text style={{ fontSize: getFontSize(12), color: IOS.red, marginBottom: 6 }}>{formErrors.category}</Text>
              )}

              {/* Priority */}
              {fieldLabel('PRIORITY', false, { marginTop: 8 })}
              <View style={{ flexDirection: 'row' }}>
                {[
                  { key: 'normal', label: 'Normal', color: IOS.blue, soft: IOS.blueSoft },
                  { key: 'urgent', label: 'Urgent', color: IOS.red, soft: IOS.redSoft },
                ].map((p) => {
                  const active = form.priority === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => updateField('priority', p.key)}
                      activeOpacity={0.8}
                      style={[
                        {
                          flex: 1,
                          paddingVertical: 11,
                          alignItems: 'center',
                          borderRadius: 14,
                          marginRight: p.key === 'normal' ? 8 : 0,
                          backgroundColor: active ? p.soft : IOS.fill,
                          borderWidth: 1.5,
                          borderColor: active ? p.color : 'transparent',
                        },
                        squircle,
                      ]}
                    >
                      <Text style={{ fontSize: getFontSize(14), fontWeight: '600', color: active ? p.color : IOS.secondaryLabel }}>
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: getFontSize(12), color: IOS.red, flex: 1 }}>{formErrors.subject || ''}</Text>
                <Text style={{ fontSize: getFontSize(11), color: IOS.tertiaryLabel }}>{form.subject.length}/{SUBJECT_MAX}</Text>
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
                  { minHeight: 110, maxHeight: 180, padding: 14, textAlignVertical: 'top' },
                ]}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: getFontSize(12), color: IOS.red, flex: 1 }}>{formErrors.message || ''}</Text>
                <Text style={{ fontSize: getFontSize(11), color: IOS.tertiaryLabel }}>{form.message.length}/{MAX_MESSAGE_LENGTH}</Text>
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
              {!!formErrors.relatedToken && (
                <Text style={{ fontSize: getFontSize(12), color: IOS.red, marginTop: 4 }}>{formErrors.relatedToken}</Text>
              )}

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
              {!!formErrors.contactPhone && (
                <Text style={{ fontSize: getFontSize(12), color: IOS.red, marginTop: 4 }}>{formErrors.contactPhone}</Text>
              )}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSendToAdmin}
                disabled={sending}
                activeOpacity={0.85}
                style={[{ marginTop: 20, backgroundColor: IOS.blue, paddingVertical: 14, borderRadius: 999, alignItems: 'center', opacity: sending ? 0.6 : 1 }, squircle]}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: getFontSize(15), color: '#fff', fontWeight: '600' }}>
                    {editingMsg ? 'Save changes' : 'Send'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
