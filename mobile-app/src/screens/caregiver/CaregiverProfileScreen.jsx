import React, { useCallback, useContext, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Image, Modal, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';
import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';
import labels from './caregiverProfileLabels';
import { pickAndUploadCaregiverPhoto } from '../../services/caregiverPhotoUpload';
import {
  getProfile, getUserPreferences, updateUserPreferences, updateProfile,
  getAlertPreferences, updateAlertPreferences, getCaregiverProfileSettings,
  updateCaregiverName, saveCaregiverPhotoUrl,
  startCaregiverPhoneChange, verifyCaregiverPhoneChange, deactivateMyAccount
} from '../../services/caregiverApi';

// iOS system colors (same palette as the patient screens)
const BLUE = '#007AFF';
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
  chevron: '#C7C7CC',
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

// Account removal copy is kept here so the existing profile labels remain unchanged.
const accountLabels = {
  en: {
    manage: 'Account options', delete: 'Delete Account', title: 'Delete your account?',
    warning: 'Are you sure you want to delete your MediQueue account? This action cannot be undone from the app.',
    retention: 'You will be signed out and lose access. Your patient and hospital records will not be deleted.',
    cancel: 'Cancel', deleting: 'Deleting...', failed: 'Unable to deactivate account. Please try again.'
  },
  si: {
    manage: 'ගිණුම් විකල්ප', delete: 'ගිණුම ඉවත් කරන්න', title: 'ඔබගේ ගිණුම ඉවත් කරන්නද?',
    warning: 'ඔබට ඔබගේ MediQueue ගිණුම ඉවත් කිරීමට අවශ්‍ය බව විශ්වාසද? මෙම ක්‍රියාව යෙදුම තුළින් ආපසු හැරවිය නොහැක.',
    retention: 'ඔබ පිටවී ගිණුමට ප්‍රවේශය අහිමි වේ. රෝගී සහ රෝහල් වාර්තා මකා නොදමනු ඇත.',
    cancel: 'අවලංගු කරන්න', deleting: 'ඉවත් කරමින්...', failed: 'ගිණුම අක්‍රිය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.'
  },
  ta: {
    manage: 'கணக்கு விருப்பங்கள்', delete: 'கணக்கை நீக்கு', title: 'உங்கள் கணக்கை நீக்கவா?',
    warning: 'உங்கள் MediQueue கணக்கை நீக்க விரும்புகிறீர்களா? இந்தச் செயலை செயலிக்குள் மாற்ற முடியாது.',
    retention: 'நீங்கள் வெளியேற்றப்படுவீர்கள்; அணுகலை இழப்பீர்கள். நோயாளி மற்றும் மருத்துவமனை பதிவுகள் நீக்கப்படாது.',
    cancel: 'ரத்துசெய்', deleting: 'நீக்கப்படுகிறது...', failed: 'கணக்கை செயலிழக்கச் செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
  }
};

const initials = (p) => `${p?.firstName?.[0] || 'C'}${p?.lastName?.[0] || ''}`.toUpperCase();

const apiError = (e) => e?.response?.status === 404
  ? 'Profile endpoint not found (404). Check that /api/links/account is mounted and restart the backend.'
  : (e?.response?.data?.message || e?.message || 'Something went wrong.');

export default function CaregiverProfileScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { i18n } = useTranslation();
  const [profile, setProfile] = useState(user || null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState('request');
  const [lang, setLang] = useState('en');
  const [channels, setChannels] = useState(['app']);
  const [threshold, setThreshold] = useState(5);
  const [textSize, setTextSize] = useState('medium');
  const [privacy, setPrivacy] = useState({allowCaregiverAccess: true, showQueueDetails: true});
  const L = labels[lang] || labels.en;
  const A = accountLabels[lang] || accountLabels.en;
  const scale = textSize === 'large' ? 1.2 : textSize === 'small' ? 0.92 : 1;

  useFocusEffect(useCallback(() => {
    let mounted = true;
    async function load() {
      if (mounted) setLoading(true);
      const results = await Promise.allSettled([
        getProfile(), getUserPreferences(), getAlertPreferences(), getCaregiverProfileSettings()
      ]);
      if (!mounted) return;
      const [p, pref, alert, extra] = results;
      if (p.status === 'fulfilled') {
        const next = p.value?.data || user;
        setProfile(next); setFirstName(next?.firstName || ''); setLastName(next?.lastName || '');
        setNewPhone(next?.phone || '');
      }
      if (pref.status === 'fulfilled') {
        const data = pref.value?.data || {};
        const selected = ['en','si','ta'].includes(data.language) ? data.language : 'en';
        setLang(selected);
        i18n.changeLanguage(selected).catch(() => {});
        setChannels(Array.isArray(data.channels) ? data.channels : ['app']);
        setTextSize(data.accessibility?.textSize || 'medium');
        setPrivacy({
          allowCaregiverAccess: data.privacy?.allowCaregiverAccess ?? true,
          showQueueDetails: data.privacy?.showQueueDetails ?? true
        });
      }
      if (alert.status === 'fulfilled') {
        const value = alert.value?.data;
        if (Number.isInteger(value?.threshold)) setThreshold(value.threshold);
      }
      if (extra.status === 'fulfilled') setPhotoUrl(extra.value?.data?.photoUrl || '');
      if (p.status === 'rejected') setError(apiError(p.reason));
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [user, i18n]));

  const open = (name) => { setAccountMenuOpen(false); setError(''); setNotice(''); setModal(name); };
  const close = () => { if (!busy) { setModal(''); setError(''); } };
  const perform = async (action, successText, next) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await action();
      setNotice(successText || 'Saved');
      if (next) next(); else setModal('');
    } catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  };

  const uploadPhoto = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const url = await pickAndUploadCaregiverPhoto();
      if (url) {
        await saveCaregiverPhotoUrl(url);
        setPhotoUrl(url); setNotice(L.photoSaved);
      }
    } catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  };

  const saveName = () => {
    if (!firstName.trim() || !lastName.trim()) { setError(L.required); return; }
    perform(async () => {
      const result = await updateCaregiverName({ firstName: firstName.trim(), lastName: lastName.trim() });
      setProfile((old) => ({ ...old, ...result.data }));
    }, L.profileSaved);
  };
  const saveLanguage = (code) => perform(async () => {
    await updateUserPreferences({language: code});
    // Keep the User.language field in sync with the shared auth module.
    await updateProfile({language: code});
    await i18n.changeLanguage(code);
    setLang(code);
    setProfile((old) => ({...old, language: code}));
  }, labels[code]?.profileSaved || L.profileSaved);

  const toggleChannel = (channel) => {
    setChannels((old) => old.includes(channel) ? old.filter((c) => c !== channel) : [...old, channel]);
  };
  const saveNotifications = () => perform(async () => {
    await updateUserPreferences({channels});
    await updateAlertPreferences({channels, threshold});
  }, L.profileSaved);
  const saveAccessibility = () => perform(async () => {
    await updateUserPreferences({accessibility: {textSize}});
  }, L.profileSaved);
  const savePrivacy = () => perform(async () => {
    await updateUserPreferences({privacy});
  }, L.profileSaved);
  const requestPhoneCode = () => perform(async () => {
    await startCaregiverPhoneChange(newPhone.trim());
  }, L.codeSent, () => setPhoneStep('verify'));
  const confirmPhone = () => perform(async () => {
    const response = await verifyCaregiverPhoneChange(phoneOtp);
    setProfile((old) => ({...old, phone: response?.data?.phone || newPhone}));
    setPhoneOtp(''); setPhoneStep('request');
  }, L.phoneSaved);

  const confirmDeleteAccount = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await deactivateMyAccount();
      // AuthContext switches AppNavigator back to the login flow.
      await logout();
    } catch (e) {
      setError(e?.response?.data?.message || A.failed);
    } finally {
      setBusy(false);
    }
  };

  const settings = [
    { key: 'language', icon: 'language-outline', title: L.language, subtitle: lang === 'en' ? L.english : lang === 'si' ? L.sinhala : L.tamil },
    { key: 'notifications', icon: 'notifications-outline', title: L.notification, subtitle: L.notificationSub },
    { key: 'accessibility', icon: 'text-outline', title: L.accessibility, subtitle: L.display },
    { key: 'privacy', icon: 'shield-checkmark-outline', title: L.privacy, subtitle: L.privacySub }
  ];

  const action = (label, handler, disabled = busy, secondary = false) => (
    <TouchableOpacity disabled={disabled} onPress={handler} style={[styles.action, secondary && styles.secondary, disabled && {opacity: 0.6}]}>
      <Text style={[styles.actionText, secondary && {color: BLUE}]}>{busy ? L.saving : label}</Text>
    </TouchableOpacity>
  );
  const field = (label, value, onChange, props = {}) => (
    <View style={{marginBottom: 14}}>
      <Text style={[styles.formLabel,{fontSize: 12 * scale}]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={label} placeholderTextColor="#8E8E93"
        style={[styles.input,{fontSize: 14 * scale}]} {...props}/>
    </View>
  );
  const choice = (text, selected, handler) => (
    <TouchableOpacity onPress={handler} style={styles.choice}>
      <Text style={[styles.choiceText, {fontSize: 14*scale}]}>{text}</Text>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? BLUE : IOS.chevron}/>
    </TouchableOpacity>
  );
  const toggleRow = (title, on, onValueChange) => (
    <View style={styles.choice}>
      <Text style={[styles.choiceText,{flex: 1,fontSize: 13*scale}]}>{title}</Text>
      <TouchableOpacity
        onPress={() => onValueChange(!on)}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={title}
        style={[styles.blueToggleTrack, on && styles.blueToggleOn]}
        activeOpacity={0.8}
      >
        <View style={[styles.blueToggleKnob, on && styles.blueToggleKnobOn]}/>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <CaregiverHeader title={L.profile} navigation={navigation}/>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? <ActivityIndicator size="large" color={IOS.tertiaryLabel} style={{marginTop: 80}}/> : <>
            {!!notice && (
              <View style={styles.successBanner} accessibilityRole="alert">
                <Text style={styles.successBannerText}>{notice}</Text>
                <TouchableOpacity
                  onPress={() => setNotice('')}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss confirmation"
                  hitSlop={10}
                  style={styles.dismissButton}
                >
                  <Ionicons name="close" color={IOS.greenDark} size={19}/>
                </TouchableOpacity>
              </View>
            )}
            {!!error && !modal && <Text style={styles.error}>{error}</Text>}
            <View style={styles.profileCard}>
              <TouchableOpacity
                style={styles.accountMenuButton}
                onPress={() => setAccountMenuOpen((current) => !current)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={A.manage}
                accessibilityHint={A.delete}
                hitSlop={8}
              >
                <Ionicons name="ellipsis-vertical" size={19} color={IOS.secondaryLabel} />
              </TouchableOpacity>
              {accountMenuOpen && (
                <TouchableOpacity
                  style={styles.accountMenu}
                  onPress={() => open('deleteAccount')}
                  accessibilityRole="button"
                  accessibilityLabel={A.delete}
                  activeOpacity={0.82}
                >
                  <Ionicons name="trash-outline" size={17} color={IOS.red} />
                  <Text style={styles.accountMenuText}>{A.delete}</Text>
                </TouchableOpacity>
              )}
              <View style={styles.activeBadgeTop}>
                <View style={styles.activeDotBlue}/>
                <Text style={styles.activeTextBlue}>{L.active}</Text>
              </View>
              <TouchableOpacity onPress={uploadPhoto} disabled={busy} accessibilityLabel={L.changePhoto} style={styles.avatarWrap}>
                {photoUrl ? <Image source={{uri: photoUrl}} style={styles.avatarImage}/> :
                  <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile)}</Text></View>}
                <View style={styles.camera}><Ionicons name="camera" size={14} color="#FFFFFF"/></View>
              </TouchableOpacity>
              <Text style={[styles.name,{fontSize:20*scale}]}>{profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}</Text>
              <Text style={styles.role}>{L.caregiver}</Text>
              <TouchableOpacity onPress={() => open('edit')} style={styles.editButton}>
                <Ionicons name="create-outline" size={16} color={BLUE}/>
                <Text style={styles.editText}>{L.edit}</Text>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <View style={styles.profileInfoItem}><Text style={styles.infoLabel}>{L.caregiverId}</Text><Text style={styles.infoValue}>{profile?.caregiverId || profile?.userId || user?.userId}</Text></View>
                <View style={styles.profileDivider}/>
                <View style={styles.profileInfoItem}><Text style={styles.infoLabel}>{L.email}</Text><Text numberOfLines={1} style={styles.infoValue}>{profile?.email || user?.email || '-'}</Text></View>
              </View>
            </View>
            <Text style={styles.sectionLabel}>{L.settings}</Text>
            <View style={styles.settingsCard}>
              {settings.map((item,i) => (
                <TouchableOpacity key={item.key} onPress={() => open(item.key)} style={[styles.settingRow,i !== settings.length-1 && styles.settingBorder]}>
                  <View style={styles.settingIcon}><Ionicons name={item.icon} size={20} color={BLUE}/></View>
                  <View style={styles.settingContent}><Text style={[styles.settingTitle,{fontSize:15*scale}]}>{item.title}</Text><Text style={styles.settingSubtitle}>{item.subtitle}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={IOS.chevron}/>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}><Ionicons name="log-out-outline" size={19} color={IOS.red}/><Text style={styles.logoutText}>{L.logout}</Text></TouchableOpacity>
          </>}
        </ScrollView>
        <CaregiverBottomNav navigation={navigation} activeRoute="CaregiverProfile"/>
      </View>

      <Modal visible={!!modal && modal !== 'deleteAccount'} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.scrim}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle,{fontSize:18*scale}]}>{modal==='edit'?L.edit:modal==='phone'?L.changePhone:modal==='language'?L.language:modal==='notifications'?L.notification:modal==='accessibility'?L.accessibility:L.privacy}</Text>
              <TouchableOpacity onPress={close} disabled={busy}><Ionicons name="close-circle-outline" size={26} color={IOS.tertiaryLabel}/></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {modal === 'edit' && <>
                {field(L.firstName, firstName, setFirstName, {autoCapitalize:'words'})}
                {field(L.lastName, lastName, setLastName, {autoCapitalize:'words'})}
                <Text style={styles.formLabel}>{L.email}: {profile?.email || '-'}</Text>
                <Text style={[styles.formLabel,{marginTop:14}]}>{L.currentPhone}: {profile?.phone || '-'}</Text>
                {action(L.changePhone,()=>{setNewPhone(profile?.phone || '');setPhoneOtp('');setPhoneStep('request');open('phone');}, false,true)}
                {action(L.save,saveName)}
              </>}
              {modal === 'phone' && <>
                <Text style={styles.note}>{L.phoneNote}</Text>
                {phoneStep === 'request' ? <>
                  {field(L.phone, newPhone, setNewPhone,{keyboardType:'phone-pad',autoComplete:'tel'})}
                  {action(L.sendCode,requestPhoneCode)}
                </> : <>
                  <Text style={styles.note}>{L.codeSent}</Text>
                  {field(L.code,phoneOtp,setPhoneOtp,{keyboardType:'number-pad',maxLength:6})}
                  {action(L.verifyPhone,confirmPhone, busy || !/^\d{6}$/.test(phoneOtp))}
                  {action(L.sendCode,()=>setPhoneStep('request'),false,true)}
                </>}
              </>}
              {modal === 'language' && <>
                <Text style={styles.note}>{L.chooseLanguage}</Text>
                {choice('English',lang==='en',()=>saveLanguage('en'))}
                {choice('සිංහල',lang==='si',()=>saveLanguage('si'))}
                {choice('தமிழ்',lang==='ta',()=>saveLanguage('ta'))}
              </>}
              {modal === 'notifications' && <>
                {toggleRow(L.appQueue,channels.includes('app'),()=>toggleChannel('app'))}
                {toggleRow(L.smsQueue,channels.includes('sms'),()=>toggleChannel('sms'))}
                <Text style={styles.formLabel}>{L.threshold}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepButton} onPress={()=>setThreshold((n)=>Math.max(1,n-1))}><Ionicons name="remove" size={22} color={BLUE}/></TouchableOpacity>
                  <Text style={styles.stepNumber}>{threshold}</Text>
                  <TouchableOpacity style={styles.stepButton} onPress={()=>setThreshold((n)=>Math.min(20,n+1))}><Ionicons name="add" size={22} color={BLUE}/></TouchableOpacity>
                </View>
                {action(L.save,saveNotifications)}
              </>}
              {modal === 'accessibility' && <>
                <Text style={styles.formLabel}>{L.textSize}</Text>
                {['small','medium','large'].map((s)=> <React.Fragment key={s}>{choice(L[s],textSize===s,()=>setTextSize(s))}</React.Fragment>)}
                {action(L.save,saveAccessibility)}
              </>}
              {modal === 'privacy' && <>
                {toggleRow(L.privacyCaregiver,privacy.allowCaregiverAccess,(v)=>setPrivacy((p)=>({...p,allowCaregiverAccess:v})))}
                {toggleRow(L.privacyQueue,privacy.showQueueDetails,(v)=>setPrivacy((p)=>({...p,showQueueDetails:v})))}
                {action(L.save,savePrivacy)}
              </>}
              {!!error && <Text style={styles.error}>{error}</Text>}
              {action(L.cancel,close,busy,true)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirm deletion without a password or OTP, as requested. */}
      <Modal
        visible={modal === 'deleteAccount'}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.scrim}>
          <View style={styles.deleteModalBox}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="trash-outline" size={27} color={IOS.red} />
            </View>
            <Text style={styles.deleteModalTitle}>{A.title}</Text>
            <Text style={styles.deleteModalDescription}>{A.warning}</Text>
            <View style={styles.deleteRetentionNote}>
              <Ionicons name="information-circle-outline" size={20} color={IOS.tertiaryLabel} />
              <Text style={styles.deleteRetentionText}>{A.retention}</Text>
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.deleteDangerButton, busy && styles.deleteDisabled]}
              onPress={confirmDeleteAccount}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={A.delete}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> :
                <Ionicons name="trash-outline" size={17} color="#FFFFFF" />}
              <Text style={styles.deleteDangerText}>{busy ? A.deleting : A.delete}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteCancelButton}
              onPress={close}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={A.cancel}
            >
              <Text style={styles.deleteCancelText}>{A.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  accountMenuButton: {
    position: 'absolute', top: 12, right: 12, width: 34, height: 34,
    borderRadius: 12, borderCurve: 'continuous', backgroundColor: IOS.fill,
    alignItems: 'center', justifyContent: 'center', zIndex: 12,
  },
  accountMenu: {
    position: 'absolute', top: 52, right: 12, zIndex: 14,
    minWidth: 177, paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 16, borderCurve: 'continuous',
    backgroundColor: IOS.white, flexDirection: 'row', alignItems: 'center', gap: 9,
    elevation: 6, shadowColor: '#0B1B3A', shadowOpacity: 0.14,
    shadowRadius: 12, shadowOffset: {width: 0, height: 6},
  },
  accountMenuText: {color: IOS.red, fontWeight: '600', fontSize: 14},
  deleteModalBox: {
    width: '100%', maxWidth: 410, backgroundColor: IOS.white, borderRadius: 28, borderCurve: 'continuous',
    paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center',
  },
  deleteIconWrap: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: IOS.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  deleteModalTitle: {
    color: IOS.label, fontWeight: '700', fontSize: 19, textAlign: 'center', marginBottom: 10, letterSpacing: -0.2,
  },
  deleteModalDescription: {color: IOS.tertiaryLabel, fontSize: 14, lineHeight: 21, textAlign: 'center'},
  deleteRetentionNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: IOS.surface, borderRadius: 16, borderCurve: 'continuous', padding: 14,
    marginVertical: 17, alignSelf: 'stretch',
  },
  deleteRetentionText: {color: IOS.secondaryLabel, fontSize: 12, lineHeight: 18, flex: 1},
  deleteDangerButton: {
    backgroundColor: IOS.red, borderRadius: 16, borderCurve: 'continuous', minHeight: 50,
    width: '100%', justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 9,
  },
  deleteDangerText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  deleteDisabled: {opacity: 0.65},
  deleteCancelButton: {
    marginTop: 10, width: '100%', minHeight: 50,
    borderRadius: 16, borderCurve: 'continuous', backgroundColor: IOS.fill,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteCancelText: {textAlign: 'center', fontWeight: '600', fontSize: 16, color: IOS.label},

  outer:{flex:1,backgroundColor:IOS.groupedBg},
  screen:{flex:1,width:'100%',maxWidth:430,alignSelf:'center',backgroundColor:IOS.groupedBg},
  scroll:{flex:1},content:{padding:16,paddingBottom:30},

  profileCard:{padding:18,paddingTop:22,backgroundColor:IOS.white,borderRadius:26,borderCurve:'continuous',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(60,60,67,0.12)',alignItems:'center',...cardShadow},
  avatarWrap:{width:84,height:84,alignItems:'center',justifyContent:'center',marginTop:10},
  avatar:{width:76,height:76,borderRadius:38,backgroundColor:IOS.blueSoft,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:'#FFF'},
  avatarImage:{width:76,height:76,borderRadius:38,borderWidth:2,borderColor:IOS.blueSoft},
  avatarText:{color:BLUE,fontSize:23,fontWeight:'700'},
  camera:{position:'absolute',right:0,bottom:0,width:27,height:27,borderRadius:14,backgroundColor:BLUE,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#FFF'},
  photoHint:{marginTop:3,fontSize:11,color:BLUE},
  photoButton:{marginTop:8,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:13,paddingVertical:7,borderRadius:12,backgroundColor:IOS.blueSoft},
  photoButtonText:{fontSize:12,fontWeight:'600',color:BLUE},
  name:{marginTop:8,color:IOS.label,fontWeight:'700',letterSpacing:-0.2},
  role:{marginTop:3,color:IOS.tertiaryLabel,fontSize:13},
  activeBadge:{marginTop:9,paddingHorizontal:10,paddingVertical:4,borderRadius:999,backgroundColor:IOS.greenSoft,flexDirection:'row',alignItems:'center'},
  activeDot:{width:6,height:6,borderRadius:3,backgroundColor:IOS.green,marginRight:5},
  activeText:{color:IOS.greenDark,fontSize:11,fontWeight:'600'},
  editButton:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginTop:14,borderRadius:14,borderCurve:'continuous',paddingHorizontal:18,paddingVertical:10,backgroundColor:IOS.blueSoft},
  editText:{fontSize:14,fontWeight:'600',color:BLUE},
  profileInfo:{width:'100%',marginTop:18,paddingTop:16,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:IOS.separator,flexDirection:'row'},
  profileInfoItem:{flex:1,alignItems:'center'},profileDivider:{width:StyleSheet.hairlineWidth,backgroundColor:IOS.separator},
  infoLabel:{color:IOS.tertiaryLabel,fontSize:11,fontWeight:'600',letterSpacing:0.4},
  infoValue:{marginTop:5,maxWidth:145,color:IOS.label,fontSize:13,fontWeight:'600'},
  sectionLabel:{marginTop:24,marginBottom:8,paddingHorizontal:6,color:IOS.tertiaryLabel,fontSize:13,fontWeight:'600',letterSpacing:0.6},
  settingsCard:{borderRadius:22,borderCurve:'continuous',backgroundColor:IOS.white,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(60,60,67,0.12)',overflow:'hidden',...cardShadow},
  settingRow:{minHeight:68,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},
  settingBorder:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:IOS.separator},
  settingIcon:{width:38,height:38,borderRadius:12,borderCurve:'continuous',backgroundColor:IOS.blueSoft,alignItems:'center',justifyContent:'center'},
  settingContent:{flex:1,marginLeft:12},settingTitle:{color:IOS.label,fontWeight:'600',letterSpacing:-0.2},
  settingSubtitle:{marginTop:3,color:IOS.tertiaryLabel,fontSize:12},
  logoutButton:{height:50,marginTop:22,borderRadius:16,borderCurve:'continuous',backgroundColor:IOS.redSoft,flexDirection:'row',alignItems:'center',justifyContent:'center'},
  logoutText:{marginLeft:6,color:IOS.red,fontSize:15,fontWeight:'600'},

  scrim:{flex:1,backgroundColor:'rgba(0,0,0,0.35)',alignItems:'center',justifyContent:'center',padding:16},
  modalBox:{width:'100%',maxWidth:410,maxHeight:'85%',padding:20,backgroundColor:IOS.white,borderRadius:28,borderCurve:'continuous'},
  modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:15},
  modalTitle:{color:IOS.label,fontWeight:'700',flex:1,letterSpacing:-0.2},
  formLabel:{fontSize:13,fontWeight:'600',color:IOS.secondaryLabel,marginBottom:7},
  input:{height:48,borderRadius:16,borderCurve:'continuous',backgroundColor:IOS.fill,paddingHorizontal:16,color:IOS.label},
  note:{fontSize:13,color:IOS.tertiaryLabel,lineHeight:19,marginBottom:12},
  warning:{fontSize:12,color:IOS.orange,lineHeight:18,backgroundColor:IOS.orangeSoft,padding:12,borderRadius:14,marginVertical:12},
  action:{minHeight:50,backgroundColor:BLUE,marginTop:10,borderRadius:16,borderCurve:'continuous',alignItems:'center',justifyContent:'center',paddingHorizontal:14},
  secondary:{backgroundColor:IOS.fill},
  actionText:{color:'#FFF',fontSize:15,fontWeight:'600'},
  choice:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:IOS.separator},
  choiceText:{color:IOS.label,fontWeight:'500'},
  stepper:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:25,marginVertical:12},
  stepButton:{width:46,height:46,borderRadius:14,borderCurve:'continuous',backgroundColor:IOS.blueSoft,alignItems:'center',justifyContent:'center'},
  stepNumber:{fontSize:22,fontWeight:'700',color:IOS.label},
  error:{color:IOS.red,backgroundColor:IOS.redSoft,padding:12,marginTop:10,borderRadius:14,fontSize:13},
  success:{color:IOS.greenDark,backgroundColor:IOS.greenSoft,padding:12,marginBottom:12,borderRadius:14,fontSize:13},
  activeBadgeTop: {
    position:'absolute', top:12, left:12, paddingHorizontal:10,
    paddingVertical:6, borderRadius:999, backgroundColor:IOS.blueSoft,
    flexDirection:'row', alignItems:'center', zIndex:2
  },
  activeDotBlue:{width:6,height:6,borderRadius:3,backgroundColor:BLUE,marginRight:5},
  activeTextBlue:{color:BLUE,fontSize:12,fontWeight:'600'},
  successBanner:{
    marginBottom:12, paddingVertical:11, paddingLeft:14,paddingRight:7,
    borderRadius:18, borderCurve:'continuous', backgroundColor:IOS.greenSoft,
    flexDirection:'row',alignItems:'center',justifyContent:'space-between'
  },
  successBannerText:{flex:1,fontSize:13,color:IOS.greenDark,fontWeight:'500'},
  dismissButton:{padding:7,marginLeft:8,alignItems:'center',justifyContent:'center'},
  blueToggleTrack:{
    width:50,height:30,borderRadius:20,padding:3,
    backgroundColor:'#E5E5EA',justifyContent:'center'
  },
  blueToggleOn:{backgroundColor:IOS.green},
  blueToggleKnob:{width:24,height:24,borderRadius:12,backgroundColor:'#FFFFFF',
    alignSelf:'flex-start',elevation:2,shadowColor:'#000',shadowOpacity:0.18,shadowRadius:3,shadowOffset:{width:0,height:1}},
  blueToggleKnobOn:{alignSelf:'flex-end'}
});