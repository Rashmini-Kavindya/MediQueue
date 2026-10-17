import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// This component does not delete a patient. The parent calls the existing
// caregiver-only unlink API, which revokes the relationship record.
const translations = {
  en: {
    manage: 'Manage Patient',
    queue: 'View Patient Queue',
    queueHelp: 'Open this patient’s live queue',
    remove: 'Remove Linked Patient',
    removeHelp: 'Stop managing this patient’s queue',
    title: 'Remove Linked Patient?',
    question: (name) => `Are you sure you want to remove ${name} from your caregiver account?`,
    patient: 'Patient',
    patientId: 'Patient ID',
    explanation: 'You will no longer be able to track this patient’s queue or receive their alerts. The patient’s account, token, and hospital records will stay unchanged.',
    cancel: 'Cancel',
    confirm: 'Remove Patient',
    removing: 'Removing…',
    close: 'Close'
  },
  si: {
    manage: 'රෝගියා කළමනාකරණය',
    queue: 'රෝගියාගේ පෝලිම බලන්න',
    queueHelp: 'මෙම රෝගියාගේ සජීවී පෝලිම බලන්න',
    remove: 'සම්බන්ධිත රෝගියා ඉවත් කරන්න',
    removeHelp: 'මෙම රෝගියාගේ පෝලිම කළමනාකරණය නවත්වන්න',
    title: 'සම්බන්ධිත රෝගියා ඉවත් කරනවාද?',
    question: (name) => `${name} ඔබගේ රෝගී භාරකරු ගිණුමෙන් ඉවත් කිරීමට අවශ්‍යද?`,
    patient: 'රෝගියා',
    patientId: 'රෝගී අංකය',
    explanation: 'ඔබට තවදුරටත් මෙම රෝගියාගේ පෝලිම හෝ දැනුම්දීම් බැලිය නොහැක. රෝගියාගේ ගිණුම, ටෝකනය සහ රෝහල් වාර්තා වෙනස් නොවේ.',
    cancel: 'අවලංගු කරන්න',
    confirm: 'රෝගියා ඉවත් කරන්න',
    removing: 'ඉවත් කරමින්…',
    close: 'වසන්න'
  },
  ta: {
    manage: 'நோயாளியை நிர்வகிக்கவும்',
    queue: 'நோயாளியின் வரிசையைப் பார்க்கவும்',
    queueHelp: 'இந்த நோயாளியின் நேரடி வரிசையைத் திறக்கவும்',
    remove: 'இணைக்கப்பட்ட நோயாளியை நீக்கவும்',
    removeHelp: 'இந்த நோயாளியின் வரிசையை நிர்வகிப்பதை நிறுத்தவும்',
    title: 'இணைக்கப்பட்ட நோயாளியை நீக்கவா?',
    question: (name) => `${name} என்பவரை உங்கள் பராமரிப்பாளர் கணக்கிலிருந்து நீக்க விரும்புகிறீர்களா?`,
    patient: 'நோயாளி',
    patientId: 'நோயாளி எண்',
    explanation: 'இந்த நோயாளியின் வரிசையையோ அறிவிப்புகளையோ இனி பார்க்க முடியாது. நோயாளியின் கணக்கு, டோக்கன் மற்றும் மருத்துவமனைப் பதிவுகள் மாறாது.',
    cancel: 'ரத்துசெய்',
    confirm: 'நோயாளியை நீக்கவும்',
    removing: 'நீக்குகிறது…',
    close: 'மூடு'
  }
};

export default function RemovePatientModal({
  visible,
  patientLink,
  language = 'en',
  busy = false,
  error = '',
  onClose,
  onViewQueue,
  onConfirm
}) {
  const [step, setStep] = useState('menu');
  const labels = translations[String(language).split('-')[0]] || translations.en;
  const patient = patientLink?.patient || {};
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';

  useEffect(() => {
    if (visible) setStep('menu');
  }, [visible, patientLink?.linkId]);

  const close = () => {
    if (busy) return;
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={labels.close}
        />

        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 'menu' ? (
            <>
              <View style={styles.header}>
                <Text style={styles.heading} numberOfLines={2}>
                  {labels.manage}
                </Text>
                <TouchableOpacity onPress={close} style={styles.closeButton}>
                  <Ionicons name="close-circle-outline" size={26} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.patientName}>{patientName}</Text>
              <Text style={styles.patientId}>{patient.patientId || ''}</Text>

              <TouchableOpacity
                style={styles.menuAction}
                activeOpacity={0.8}
                onPress={onViewQueue}
                disabled={busy}
                accessibilityRole="button"
              >
                <View style={styles.blueIconCircle}>
                  <Ionicons name="eye-outline" size={20} color="#155EEF" />
                </View>
                <View style={styles.actionTextArea}>
                  <Text style={styles.menuTitle}>{labels.queue}</Text>
                  <Text style={styles.menuHelp}>{labels.queueHelp}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuAction}
                activeOpacity={0.8}
                onPress={() => setStep('confirm')}
                disabled={busy}
                accessibilityRole="button"
              >
                <View style={styles.redIconCircle}>
                  <Ionicons name="person-remove-outline" size={20} color="#DC2626" />
                </View>
                <View style={styles.actionTextArea}>
                  <Text style={styles.removeTitle}>{labels.remove}</Text>
                  <Text style={styles.menuHelp}>{labels.removeHelp}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.headingSpacer} />
                <TouchableOpacity onPress={close} style={styles.closeButton} disabled={busy}>
                  <Ionicons name="close-circle-outline" size={26} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={styles.dangerIcon}>
                <Ionicons name="person-remove-outline" size={29} color="#DC2626" />
              </View>
              <Text style={styles.confirmTitle}>{labels.title}</Text>
              <Text style={styles.confirmQuestion}>{labels.question(patientName)}</Text>

              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{labels.patient}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{patientName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{labels.patientId}</Text>
                  <Text style={styles.detailValue}>{patient.patientId || '—'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={20} color="#64748B" />
                <Text style={styles.infoText}>{labels.explanation}</Text>
              </View>

              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmButton, busy && styles.disabledButton]}
                activeOpacity={0.85}
                disabled={busy}
                onPress={onConfirm}
                accessibilityRole="button"
              >
                {busy && <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />}
                <Text style={styles.confirmText}>{busy ? labels.removing : labels.confirm}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.8}
                disabled={busy}
                onPress={close}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{labels.cancel}</Text>
              </TouchableOpacity>
            </>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.58)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18
  },
  card: {
    width: '100%', maxWidth: 390, maxHeight: '90%', padding: 22,
    backgroundColor: '#FFFFFF', borderRadius: 23
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { flex: 1, fontSize: 19, fontWeight: '800', color: '#0F172A' },
  headingSpacer: { flex: 1 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  patientName: { fontSize: 14, color: '#111827', marginTop: 9, fontWeight: '700' },
  patientId: { fontSize: 11, color: '#64748B', marginTop: 3, marginBottom: 12 },
  menuAction: {
    borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center'
  },
  blueIconCircle: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  redIconCircle: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  actionTextArea: { flex: 1, marginLeft: 12, marginRight: 5 },
  menuTitle: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  removeTitle: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
  menuHelp: { color: '#64748B', fontSize: 11, lineHeight: 17, marginTop: 4 },
  dangerIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 7 },
  confirmTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center', color: '#0F172A', marginTop: 14 },
  confirmQuestion: { textAlign: 'center', fontSize: 13, color: '#475569', lineHeight: 20, marginTop: 9 },
  detailCard: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  detailLabel: { color: '#64748B', fontSize: 11, flex: 1 },
  detailValue: { color: '#111827', fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, marginBottom: 8 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 18, color: '#64748B', marginLeft: 8 },
  errorBox: { marginTop: 9, marginBottom: 4, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 9 },
  errorText: { fontSize: 12, color: '#B91C1C' },
  confirmButton: { flexDirection: 'row', alignItems: 'center', height: 46, borderRadius: 10, marginTop: 12, justifyContent: 'center', backgroundColor: '#DC2626' },
  disabledButton: { opacity: 0.6 },
  spinner: { marginRight: 8 },
  confirmText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  cancelButton: { height: 46, marginTop: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10 },
  cancelText: { color: '#155EEF', fontSize: 13, fontWeight: '700' }
});
