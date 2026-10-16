import React, { useState, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Uses EXPO_PUBLIC_API_URL from .env (already includes /api), e.g. http://172.20.10.8:5000/api
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// Backend may retry the AI provider on 5xx, so allow enough time before giving up
const REQUEST_TIMEOUT_MS = 30000;

// Sri Lanka free ambulance service number (change here if needed)
const AMBULANCE_NUMBER = '1990';

// Route name of the "Request New Token" screen. Must match the name used in your navigator (Stack.Screen name)
const TOKEN_SCREEN = 'RequestNewToken';

const COLORS = {
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  primaryLight: '#E3F2FD',
  border: '#BBDEFB',
  white: '#FFFFFF',
  text: '#0F2A4A',
  muted: '#6B7F99',
  danger: '#D32F2F',
  dangerDark: '#7F1D1D',
  dangerLight: '#FDECEA',
};

const URGENCY = {
  LOW: { label: 'Low', bg: '#E3F2FD', fg: '#1565C0' },
  MEDIUM: { label: 'Medium', bg: '#BBDEFB', fg: '#0D47A1' },
  HIGH: { label: 'High', bg: '#90CAF9', fg: '#0A2F66' },
  CRITICAL_EMERGENCY: { label: 'Emergency', bg: COLORS.dangerLight, fg: COLORS.danger },
};

const QUICK_PROMPTS = {
  en: ['I have a headache', 'Fever and cough', 'Stomach pain', 'Skin rash'],
  si: ['මට හිසරදයක් තියෙනවා', 'උණ සහ කැස්ස', 'බඩ කැක්කුම', 'සම මත පාටක්'],
};

const GREETING = {
  en: 'Hi! I am MediQueue AI. Describe your symptoms and I will suggest the right OPD for you.',
  si: 'ආයුබෝවන්! මම MediQueue AI. ඔබේ රෝග ලක්ෂණ කියන්න, ගැලපෙන OPD එක මම යෝජනා කරන්නම්.',
};

const T = {
  en: {
    title: 'MediQueue AI',
    subtitle: 'Symptom checker & OPD guide',
    historyTitle: 'Chat History',
    historySub: 'Your previous conversations',
    suggestedOpd: 'SUGGESTED OPD',
    estWait: 'Est. wait',
    getToken: 'Get Token',
    etuTitle: 'Go to the Emergency Treatment Unit (ETU) now',
    etuSub: 'Do not wait in an OPD queue.',
    callAmbulance: `Call ${AMBULANCE_NUMBER} (ambulance)`,
    analyzing: 'Analyzing...',
    placeholder: 'Describe your symptoms...',
    disclaimer: 'AI gives general guidance only, not a medical diagnosis.',
    timeout: 'The server is taking too long to respond. Please try again.',
    generic: 'Sorry, something went wrong.',
    newChat: '+ New chat',
    clearAll: 'Clear all',
    clearConfirm: 'Delete all history?',
    yes: 'Yes',
    no: 'No',
    open: 'Open',
    delete: 'Delete',
    rename: 'Rename',
    renameTitle: 'Rename chat',
    save: 'Save',
    cancel: 'Cancel',
    emptyHistory: 'No chats yet. Your conversations will appear here.',
    loginNeeded: 'Please log in to save and view your chat history.',
    loading: 'Loading...',
    retry: 'Retry',
  },
  si: {
    title: 'MediQueue AI',
    subtitle: 'රෝග ලක්ෂණ පරීක්ෂකය සහ OPD මග පෙන්වීම',
    historyTitle: 'සංවාද ඉතිහාසය',
    historySub: 'ඔබේ පෙර සංවාද',
    suggestedOpd: 'යෝජිත OPD',
    estWait: 'අනුමාන රැඳී සිටීම',
    getToken: 'ටෝකනයක් ලබාගන්න',
    etuTitle: 'දැන්ම හදිසි ප්‍රතිකාර ඒකකයට (ETU) යන්න',
    etuSub: 'OPD පෝලිමක රැඳී නොසිටින්න.',
    callAmbulance: `${AMBULANCE_NUMBER} අමතන්න (ගිලන් රථය)`,
    analyzing: 'විශ්ලේෂණය කරමින්...',
    placeholder: 'ඔබේ රෝග ලක්ෂණ ලියන්න...',
    disclaimer: 'AI මගින් ලබාදෙන්නේ සාමාන්‍ය මග පෙන්වීමක් පමණි.',
    timeout: 'සේවාදායකය පිළිතුරු දීමට වැඩි කාලයක් ගනී. කරුණාකර නැවත උත්සාහ කරන්න.',
    generic: 'සමාවන්න, දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.',
    newChat: '+ නව සංවාදය',
    clearAll: 'සියල්ල මකන්න',
    clearConfirm: 'සියලු ඉතිහාසය මකන්නද?',
    yes: 'ඔව්',
    no: 'නැහැ',
    open: 'විවෘත කරන්න',
    delete: 'මකන්න',
    rename: 'නම වෙනස් කරන්න',
    renameTitle: 'සංවාදයේ නම වෙනස් කරන්න',
    save: 'සුරකින්න',
    cancel: 'අවලංගු කරන්න',
    emptyHistory: 'තවමත් සංවාද නැත. ඔබේ සංවාද මෙහි දිස්වේ.',
    loginNeeded: 'සංවාද ඉතිහාසය සුරැකීමට සහ බැලීමට කරුණාකර ලොග් වන්න.',
    loading: 'පූරණය වෙමින්...',
    retry: 'නැවත උත්සාහ කරන්න',
  },
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch (e) {
    return '';
  }
};

// One id per chat session. Every message in the session shares it (like a ChatGPT thread)
const newConversationId = () =>
  `CONV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const URGENCY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL_EMERGENCY'];

// Backend stores one ChatLog per message. Group them into conversations.
// Old logs (no conversationId) become their own single-message conversation.
const groupLogs = (logs) => {
  const map = new Map();
  (logs || []).forEach((log) => {
    const key = log.conversationId || log.logId;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(log);
  });

  const conversations = [];
  map.forEach((items, key) => {
    items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const last = items[items.length - 1];
    const titled = items.find((l) => l.title);
    const urgencyLevel = items.reduce(
      (top, l) =>
        URGENCY_ORDER.indexOf(l.urgencyLevel) > URGENCY_ORDER.indexOf(top) ? l.urgencyLevel : top,
      'LOW'
    );
    conversations.push({
      key,
      title: titled ? titled.title : items[0].symptomQuery,
      lastAt: last.createdAt,
      urgencyLevel,
      preview: last.aiResponse,
      logs: items,
    });
  });

  conversations.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  return conversations;
};

// Shared API helper: timeout + safe JSON parsing + readable errors
const request = async (path, { method = 'GET', token, body } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      // Non-JSON response (e.g. proxy / HTML error page)
    }

    if (!res.ok || !json || !json.success) {
      throw new Error((json && json.message) || `Server error (${res.status})`);
    }
    return json;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Props (all optional):
 *  - token: JWT string. If provided, request is authenticated and chat is saved to / read from history.
 *  - onSelectOpd(opd): called when user taps "Get Token" on a suggested OPD.
 *      opd = { opdId, opdName, estimatedWaitMinutes }
 *  - onBack(): called when the back arrow is pressed on the chat view.
 *  - navigation: React Navigation prop. If onBack is not given, the back arrow uses navigation.goBack().
 */
export default function ChatbotScreen({ token: tokenProp, onSelectOpd, onBack, navigation }) {
  // If no token prop is passed, read the one AuthContext saved in AsyncStorage
  const [storedToken, setStoredToken] = useState(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('token')
      .then((tk) => {
        if (mounted) setStoredToken(tk);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const token = tokenProp || storedToken;

  const [language, setLanguage] = useState('en');
  const [view, setView] = useState('chat'); // 'chat' | 'history'
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'greeting', role: 'bot', text: GREETING.en },
  ]);

  const [conversationId, setConversationId] = useState(newConversationId);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  // Rename
  const [renameLog, setRenameLog] = useState(null); // log being renamed
  const [newTitle, setNewTitle] = useState('');

  const conversations = groupLogs(history);

  const listRef = useRef(null);
  const t = T[language];

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const errorText = (err) =>
    err && err.name === 'AbortError'
      ? t.timeout
      : language === 'si'
        ? t.generic
        : `${t.generic} ${err && err.message ? err.message : ''}`.trim();

  const toggleLanguage = (lang) => {
    setLanguage(lang);
    // Update greeting only if conversation hasn't started
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === 'greeting'
        ? [{ id: 'greeting', role: 'bot', text: GREETING[lang] }]
        : prev
    );
  };

  const callAmbulance = () => {
    Linking.openURL(`tel:${AMBULANCE_NUMBER}`).catch(() => {});
  };

  // "Get Token" -> Request New Token screen with this OPD pre-selected.
  // If the parent passes onSelectOpd, that takes priority.
  const handleGetToken = (opd) => {
    if (onSelectOpd) {
      onSelectOpd(opd);
      return;
    }
    navigation?.navigate?.(TOKEN_SCREEN, { opdId: opd.opdId, reason: opd.reason });
  };

  // ---------------------------------------------------------
  // CHAT
  // ---------------------------------------------------------
  const sendMessage = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;

      setInput('');
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
      setLoading(true);
      scrollToEnd();

      try {
        const json = await request('/chatbot/suggest', {
          method: 'POST',
          token,
          body: { symptom: text, language, conversationId },
        });

        const d = json.data;
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: 'bot',
            text: d.aiAnalysis,
            urgencyLevel: d.urgencyLevel,
            opd: d.suggestedOpdId
              ? {
                  opdId: d.suggestedOpdId,
                  opdName: d.opdName,
                  estimatedWaitMinutes: d.estimatedWaitMinutes,
                  reason: text, // the symptom the user typed, pre-fills "Reason for Visit"
                }
              : null,
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: 'bot', isError: true, text: errorText(err) },
        ]);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [input, loading, token, language, conversationId]
  );

  const resetChat = () => {
    setMessages([{ id: 'greeting', role: 'bot', text: GREETING[language] }]);
    setConversationId(newConversationId());
  };

  const newChat = () => {
    resetChat();
    setView('chat');
  };

  // ---------------------------------------------------------
  // HISTORY
  // ---------------------------------------------------------
  const loadHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const json = await request('/chatbot/history', { token });
      setHistory(json.data || []);
    } catch (err) {
      setHistoryError(errorText(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = () => {
    setConfirmClear(false);
    setView('history');
    loadHistory();
  };

  // Load the whole conversation into the chat view. New messages continue the same conversation.
  const openConversation = (conv) => {
    const msgs = [];
    conv.logs.forEach((log) => {
      msgs.push({ id: `h-u-${log.logId}`, role: 'user', text: log.symptomQuery });
      msgs.push({
        id: `h-b-${log.logId}`,
        role: 'bot',
        text: log.aiResponse,
        urgencyLevel: log.urgencyLevel,
        opd: null,
      });
    });
    setMessages(msgs);
    setConversationId(conv.key);
    setView('chat');
    scrollToEnd();
  };

  const deleteConversation = async (key) => {
    setHistoryError('');
    try {
      await request(`/chatbot/history/${encodeURIComponent(key)}`, { method: 'DELETE', token });
      setHistory((prev) => prev.filter((l) => (l.conversationId || l.logId) !== key));
      if (key === conversationId) resetChat();
    } catch (err) {
      setHistoryError(errorText(err));
    }
  };

  const clearAllHistory = async () => {
    setHistoryError('');
    try {
      await request('/chatbot/history', { method: 'DELETE', token });
      setHistory([]);
      resetChat();
    } catch (err) {
      setHistoryError(errorText(err));
    } finally {
      setConfirmClear(false);
    }
  };

  const startRename = (conv) => {
    setRenameLog(conv);
    setNewTitle(conv.title || '');
  };

  const saveRename = async () => {
    const title = newTitle.trim();
    if (!title || !renameLog) return;
    setHistoryError('');
    try {
      await request(`/chatbot/history/${encodeURIComponent(renameLog.key)}`, {
        method: 'PATCH',
        token,
        body: { title },
      });
      setHistory((prev) =>
        prev.map((l) => ((l.conversationId || l.logId) === renameLog.key ? { ...l, title } : l))
      );
      setRenameLog(null);
    } catch (err) {
      setHistoryError(errorText(err));
    }
  };

  const handleBack = () => {
    if (view === 'history') {
      setView('chat');
    } else if (onBack) {
      onBack();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  // ---------------------------------------------------------
  // RENDERERS
  // ---------------------------------------------------------
  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const urgency = item.urgencyLevel ? URGENCY[item.urgencyLevel] : null;
    const isEmergency = item.urgencyLevel === 'CRITICAL_EMERGENCY';

    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowBot]}>
        {!isUser && (
          <View style={[styles.avatar, isEmergency && styles.avatarEmergency]}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
        )}
        <View style={{ maxWidth: '80%' }}>
          <View
            style={[
              styles.bubble,
              isUser ? styles.bubbleUser : styles.bubbleBot,
              item.isError && styles.bubbleError,
              isEmergency && styles.bubbleEmergency,
            ]}
          >
            {urgency && (
              <View style={[styles.badge, { backgroundColor: urgency.bg }]}>
                <Text style={[styles.badgeText, { color: urgency.fg }]}>
                  {urgency.label.toUpperCase()}
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.msgText,
                isUser && { color: COLORS.white },
                isEmergency && { color: COLORS.dangerDark },
              ]}
            >
              {item.text}
            </Text>
          </View>

          {isEmergency ? (
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyTitle}>{`🚨 ${t.etuTitle}`}</Text>
              <Text style={styles.emergencySub}>{t.etuSub}</Text>
              <TouchableOpacity
                style={styles.callBtn}
                activeOpacity={0.85}
                onPress={callAmbulance}
              >
                <Text style={styles.callBtnText}>{`📞 ${t.callAmbulance}`}</Text>
              </TouchableOpacity>
            </View>
          ) : item.opd ? (
            <View style={styles.opdCard}>
              <Text style={styles.opdLabel}>{t.suggestedOpd}</Text>
              <Text style={styles.opdName}>{item.opd.opdName}</Text>
              <Text style={styles.opdWait}>
                {t.estWait}: {item.opd.estimatedWaitMinutes} min
              </Text>
              <TouchableOpacity
                style={styles.opdButton}
                activeOpacity={0.85}
                onPress={() => handleGetToken(item.opd)}
              >
                <Text style={styles.opdButtonText}>{t.getToken}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderLog = ({ item }) => {
    const urgency = URGENCY[item.urgencyLevel] || URGENCY.LOW;
    const isEmergency = item.urgencyLevel === 'CRITICAL_EMERGENCY';

    return (
      <TouchableOpacity
        style={[styles.logCard, isEmergency && styles.logCardEmergency]}
        activeOpacity={0.85}
        onPress={() => openConversation(item)}
      >
        <View style={styles.logTop}>
          <View style={[styles.badge, { backgroundColor: urgency.bg, marginBottom: 0 }]}>
            <Text style={[styles.badgeText, { color: urgency.fg }]}>
              {urgency.label.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.logDate}>{formatDate(item.lastAt)}</Text>
        </View>
        <Text style={styles.logQuery} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.logResponse} numberOfLines={3}>
          {item.preview}
        </Text>
        <View style={styles.logActions}>
          <TouchableOpacity onPress={() => openConversation(item)} hitSlop={8}>
            <Text style={styles.logOpen}>{t.open}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => startRename(item)} hitSlop={8}>
            <Text style={styles.logOpen}>{t.rename}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteConversation(item.key)} hitSlop={8}>
            <Text style={styles.logDelete}>{t.delete}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistory = () => (
    <View style={{ flex: 1, backgroundColor: '#F7FAFE' }}>
      <View style={styles.historyBar}>
        <TouchableOpacity style={styles.newChatBtn} onPress={newChat} activeOpacity={0.85}>
          <Text style={styles.newChatText}>{t.newChat}</Text>
        </TouchableOpacity>

        {token && history.length > 0 && (
          confirmClear ? (
            <View style={styles.confirmWrap}>
              <Text style={styles.confirmText}>{t.clearConfirm}</Text>
              <TouchableOpacity style={styles.confirmYes} onPress={clearAllHistory}>
                <Text style={styles.confirmYesText}>{t.yes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmNo} onPress={() => setConfirmClear(false)}>
                <Text style={styles.confirmNoText}>{t.no}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setConfirmClear(true)} hitSlop={8}>
              <Text style={styles.clearAllText}>{t.clearAll}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {!token ? (
        <View style={styles.centerBox}>
          <Text style={styles.centerText}>{t.loginNeeded}</Text>
        </View>
      ) : historyLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.centerText, { marginTop: 10 }]}>{t.loading}</Text>
        </View>
      ) : (
        <>
          {!!historyError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{historyError}</Text>
              <TouchableOpacity onPress={loadHistory} hitSlop={8}>
                <Text style={styles.errorRetry}>{t.retry}</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={conversations}
            keyExtractor={(c) => c.key}
            renderItem={renderLog}
            contentContainerStyle={[styles.list, history.length === 0 && { justifyContent: 'center' }]}
            ListEmptyComponent={
              !historyError ? (
                <View style={styles.centerBox}>
                  <Text style={styles.centerText}>{t.emptyHistory}</Text>
                </View>
              ) : null
            }
          />
        </>
      )}

      {/* Rename modal */}
      <Modal
        visible={!!renameLog}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameLog(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.renameTitle}</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              maxLength={80}
              autoFocus
            />
            <View style={styles.logActions}>
              <TouchableOpacity onPress={() => setRenameLog(null)} hitSlop={8}>
                <Text style={[styles.logOpen, { color: COLORS.muted }]}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveRename} hitSlop={8}>
                <Text style={[styles.logOpen, { marginRight: 0 }]}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderChat = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToEnd}
        ListFooterComponent={
          loading ? (
            <View style={[styles.row, styles.rowBot]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AI</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleBot, styles.typing]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.typingText}>{t.analyzing}</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Quick prompts - only before first user message */}
      {messages.length === 1 && (
        <View style={styles.quickWrap}>
          {QUICK_PROMPTS[language].map((p) => (
            <TouchableOpacity
              key={p}
              style={styles.chip}
              onPress={() => sendMessage(p)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={t.placeholder}
          placeholderTextColor={COLORS.muted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.sendText}>{'➤'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>{t.disclaimer}</Text>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        {onBack || navigation || view === 'history' ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backText}>{'‹'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {view === 'history' ? t.historyTitle : t.title}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {view === 'history' ? t.historySub : t.subtitle}
          </Text>
        </View>

        {view === 'chat' && (
          <TouchableOpacity style={styles.historyPill} onPress={openHistory} hitSlop={6}>
            <Text style={styles.historyPillText}>{'🕘'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.langWrap}>
          {['en', 'si'].map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => toggleLanguage(l)}
              style={[styles.langBtn, language === l && styles.langBtnActive]}
            >
              <Text style={[styles.langText, language === l && styles.langTextActive]}>
                {l === 'en' ? 'EN' : 'සිං'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {view === 'history' ? renderHistory() : renderChat()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  backBtn: { width: 32, alignItems: 'center' },
  backText: { color: COLORS.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#BBDEFB', fontSize: 12, marginTop: 1 },
  historyPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  historyPillText: { fontSize: 16 },
  langWrap: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    padding: 2,
  },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  langBtnActive: { backgroundColor: COLORS.white },
  langText: { color: '#BBDEFB', fontSize: 12, fontWeight: '700' },
  langTextActive: { color: COLORS.primary },

  list: { padding: 14, paddingBottom: 8, backgroundColor: '#F7FAFE', flexGrow: 1 },
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  rowUser: { justifyContent: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarEmergency: { backgroundColor: COLORS.danger },
  avatarText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleBot: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleError: { backgroundColor: COLORS.dangerLight, borderColor: '#F5B7B1' },
  bubbleEmergency: {
    backgroundColor: COLORS.dangerLight,
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  msgText: { color: COLORS.text, fontSize: 15, lineHeight: 21 },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  opdCard: {
    marginTop: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  opdLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.6 },
  opdName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  opdWait: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  opdButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  opdButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  emergencyCard: {
    marginTop: 8,
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    padding: 14,
  },
  emergencyTitle: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  emergencySub: { color: '#FFD9D6', fontSize: 13, marginTop: 4 },
  callBtn: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  callBtnText: { color: COLORS.danger, fontWeight: '800', fontSize: 14 },

  typing: { flexDirection: 'row', alignItems: 'center' },
  typingText: { marginLeft: 8, color: COLORS.muted, fontSize: 13 },

  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: '#F7FAFE',
  },
  chip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: { backgroundColor: '#90CAF9' },
  sendText: { color: COLORS.white, fontSize: 18 },

  disclaimer: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.muted,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
  },

  // History
  historyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  newChatBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  newChatText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  clearAllText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },
  confirmWrap: { flexDirection: 'row', alignItems: 'center' },
  confirmText: { color: COLORS.text, fontSize: 12, marginRight: 8 },
  confirmYes: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 6,
  },
  confirmYesText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  confirmNo: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  confirmNoText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  logCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logCardEmergency: { borderColor: COLORS.danger, borderWidth: 1.5 },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logDate: { color: COLORS.muted, fontSize: 11 },
  logQuery: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  logResponse: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  logActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  logOpen: { color: COLORS.primary, fontWeight: '700', fontSize: 13, marginRight: 18 },
  logDelete: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },

  centerBox: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { color: COLORS.muted, fontSize: 14, textAlign: 'center' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { color: COLORS.dangerDark, fontSize: 13, flex: 1, marginRight: 10 },
  errorRetry: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },

  // Rename modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
  },
});