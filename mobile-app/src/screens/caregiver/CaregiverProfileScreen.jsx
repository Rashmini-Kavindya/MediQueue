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
  startCaregiverPhoneChange, verifyCaregiverPhoneChange
} from '../../services/caregiverApi';

const BLUE = '#155EEF';
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

  const open = (name) => { setError(''); setNotice(''); setModal(name); };
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
      <TextInput value={value} onChangeText={onChange} placeholder={label} placeholderTextColor="#94A3B8"
        style={[styles.input,{fontSize: 14 * scale}]} {...props}/>
    </View>
  );
  const choice = (text, selected, handler) => (
    <TouchableOpacity onPress={handler} style={styles.choice}>
      <Text style={[styles.choiceText, {fontSize: 14*scale}]}>{text}</Text>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? BLUE : '#94A3B8'}/>
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
          {loading ? <ActivityIndicator size="large" color={BLUE} style={{marginTop: 80}}/> : <>
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
                  <Ionicons name="close" color="#166534" size={19}/>
                </TouchableOpacity>
              </View>
            )}
            {!!error && !modal && <Text style={styles.error}>{error}</Text>}
            <View style={styles.profileCard}>
              <View style={styles.activeBadgeTop}>
                <View style={styles.activeDotBlue}/>
                <Text style={styles.activeTextBlue}>{L.active}</Text>
              </View>
              <TouchableOpacity onPress={uploadPhoto} disabled={busy} accessibilityLabel={L.changePhoto} style={styles.avatarWrap}>
                {photoUrl ? <Image source={{uri: photoUrl}} style={styles.avatarImage}/> :
                  <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile)}</Text></View>}
                <View style={styles.camera}><Ionicons name="camera" size={14} color="#FFFFFF"/></View>
              </TouchableOpacity>
              <Text style={[styles.name,{fontSize:18*scale}]}>{profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}</Text>
              <Text style={styles.role}>{L.caregiver}</Text>
              <TouchableOpacity onPress={() => open('edit')} style={styles.editButton}>
                <Ionicons name="create-outline" size={15} color={BLUE}/>
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
                  <View style={styles.settingIcon}><Ionicons name={item.icon} size={19} color={BLUE}/></View>
                  <View style={styles.settingContent}><Text style={[styles.settingTitle,{fontSize:12*scale}]}>{item.title}</Text><Text style={styles.settingSubtitle}>{item.subtitle}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8"/>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}><Ionicons name="log-out-outline" size={18} color="#DC2626"/><Text style={styles.logoutText}>{L.logout}</Text></TouchableOpacity>
          </>}
        </ScrollView>
        <CaregiverBottomNav navigation={navigation} activeRoute="CaregiverProfile"/>
      </View>

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.scrim}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle,{fontSize:17*scale}]}>{modal==='edit'?L.edit:modal==='phone'?L.changePhone:modal==='language'?L.language:modal==='notifications'?L.notification:modal==='accessibility'?L.accessibility:L.privacy}</Text>
              <TouchableOpacity onPress={close} disabled={busy}><Ionicons name="close-circle-outline" size={26} color="#64748B"/></TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  outer:{flex:1,backgroundColor:'#EEF1F5'},
  screen:{flex:1,width:'100%',maxWidth:430,alignSelf:'center',backgroundColor:'#F8F7FC'},
  scroll:{flex:1},content:{padding:18,paddingBottom:30},
  profileCard:{padding:18,backgroundColor:'#FFF',borderRadius:18,borderWidth:1,borderColor:'#E3E8EF',alignItems:'center'},
  avatarWrap:{width:76,height:76,alignItems:'center',justifyContent:'center'},
  avatar:{width:68,height:68,borderRadius:34,backgroundColor:'#EAF1FF',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:'#FFF'},
  avatarImage:{width:68,height:68,borderRadius:34,borderWidth:2,borderColor:'#DCE8FF'},
  avatarText:{color:BLUE,fontSize:21,fontWeight:'800'},
  camera:{position:'absolute',right:0,bottom:0,width:25,height:25,borderRadius:13,backgroundColor:BLUE,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#FFF'},
  photoHint:{marginTop:3,fontSize:9,color:BLUE},
  photoButton:{marginTop:8,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:13,paddingVertical:7,borderRadius:9,borderWidth:1,borderColor:'#B8CCFF',backgroundColor:'#F5F8FF'},
  photoButtonText:{fontSize:11,fontWeight:'700',color:BLUE},
  name:{marginTop:7,color:'#111827',fontWeight:'800'},
  role:{marginTop:3,color:'#64748B',fontSize:10},
  activeBadge:{marginTop:9,paddingHorizontal:9,paddingVertical:4,borderRadius:20,backgroundColor:'#ECFDF3',flexDirection:'row',alignItems:'center'},
  activeDot:{width:5,height:5,borderRadius:3,backgroundColor:'#16A34A',marginRight:5},
  activeText:{color:'#15803D',fontSize:9,fontWeight:'700'},
  editButton:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginTop:12,borderRadius:9,paddingHorizontal:14,paddingVertical:8,backgroundColor:'#EEF4FF'},
  editText:{fontSize:11,fontWeight:'700',color:BLUE},
  profileInfo:{width:'100%',marginTop:18,paddingTop:15,borderTopWidth:1,borderTopColor:'#EEF0F3',flexDirection:'row'},
  profileInfoItem:{flex:1,alignItems:'center'},profileDivider:{width:1,backgroundColor:'#E2E8F0'},
  infoLabel:{color:'#94A3B8',fontSize:8,fontWeight:'700'},
  infoValue:{marginTop:5,maxWidth:145,color:'#334155',fontSize:10,fontWeight:'700'},
  sectionLabel:{marginTop:22,marginBottom:8,color:'#64748B',fontSize:9,fontWeight:'800',letterSpacing:0.8},
  settingsCard:{borderRadius:16,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E3E8EF',overflow:'hidden'},
  settingRow:{minHeight:68,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},
  settingBorder:{borderBottomWidth:1,borderBottomColor:'#EEF0F3'},
  settingIcon:{width:34,height:34,borderRadius:10,backgroundColor:'#EEF4FF',alignItems:'center',justifyContent:'center'},
  settingContent:{flex:1,marginLeft:10},settingTitle:{color:'#111827',fontWeight:'700'},
  settingSubtitle:{marginTop:3,color:'#94A3B8',fontSize:10},
  logoutButton:{height:44,marginTop:20,borderRadius:11,borderWidth:1,borderColor:'#FECACA',backgroundColor:'#FEF2F2',flexDirection:'row',alignItems:'center',justifyContent:'center'},
  logoutText:{marginLeft:6,color:'#DC2626',fontSize:11,fontWeight:'700'},
  scrim:{flex:1,backgroundColor:'rgba(15,23,42,0.56)',alignItems:'center',justifyContent:'center',padding:16},
  modalBox:{width:'100%',maxWidth:410,maxHeight:'85%',padding:18,backgroundColor:'#FFFFFF',borderRadius:20},
  modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:15},
  modalTitle:{color:'#111827',fontWeight:'800',flex:1},
  formLabel:{fontSize:12,fontWeight:'700',color:'#334155',marginBottom:7},
  input:{height:47,borderRadius:11,borderWidth:1,borderColor:'#C9D6EA',backgroundColor:'#FFF',paddingHorizontal:13,color:'#111827'},
  note:{fontSize:11,color:'#64748B',lineHeight:18,marginBottom:12},
  warning:{fontSize:11,color:'#9A3412',lineHeight:18,backgroundColor:'#FFF7ED',padding:10,borderRadius:8,marginVertical:12},
  action:{minHeight:44,backgroundColor:BLUE,marginTop:10,borderRadius:10,alignItems:'center',justifyContent:'center',paddingHorizontal:14},
  secondary:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#C9D6EA'},
  actionText:{color:'#FFF',fontSize:12,fontWeight:'800'},
  choice:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#E9EDF3'},
  choiceText:{color:'#334155',fontWeight:'600'},
  stepper:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:25,marginVertical:12},
  stepButton:{width:45,height:45,borderRadius:12,backgroundColor:'#EEF4FF',alignItems:'center',justifyContent:'center'},
  stepNumber:{fontSize:21,fontWeight:'800',color:'#111827'},
  error:{color:'#B91C1C',backgroundColor:'#FEF2F2',padding:10,marginTop:10,borderRadius:8,fontSize:12},
  success:{color:'#15803D',backgroundColor:'#ECFDF3',padding:10,marginBottom:12,borderRadius:8,fontSize:11},
  activeBadgeTop: {
    position:'absolute', top:12, right:12, paddingHorizontal:10,
    paddingVertical:6, borderRadius:30, backgroundColor:'#EEF4FF',
    flexDirection:'row', alignItems:'center', zIndex:2
  },
  activeDotBlue:{width:6,height:6,borderRadius:3,backgroundColor:BLUE,marginRight:5},
  activeTextBlue:{color:BLUE,fontSize:10,fontWeight:'800'},
  successBanner:{
    marginBottom:12, paddingVertical:11, paddingLeft:12,paddingRight:7,
    borderRadius:11, backgroundColor:'#ECFDF3',
    flexDirection:'row',alignItems:'center',justifyContent:'space-between'
  },
  successBannerText:{flex:1,fontSize:12,color:'#166534',fontWeight:'600'},
  dismissButton:{padding:7,marginLeft:8,alignItems:'center',justifyContent:'center'},
  blueToggleTrack:{
    width:48,height:27,borderRadius:20,padding:3,
    backgroundColor:'#CBD5E1',justifyContent:'center'
  },
  blueToggleOn:{backgroundColor:BLUE},
  blueToggleKnob:{width:21,height:21,borderRadius:11,backgroundColor:'#FFFFFF',
    alignSelf:'flex-start',elevation:2,shadowColor:'#000',shadowOpacity:0.13,shadowRadius:2},
  blueToggleKnobOn:{alignSelf:'flex-end'}

});
