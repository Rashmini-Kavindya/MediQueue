import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  listUsersAdmin, getUserAdmin, addUserAdmin, updateUserAdmin,
  deactivateUserAdmin, permanentlyDeleteStaffAdmin
} from '../../services/adminManagementApi';

const BLUE = '#155EEF';
// Shared between Admin Users and Waiting Areas. This changes display language only.
const ADMIN_LANGUAGE_KEY = '@mediqueue_admin_management_language_v1';
const LANGUAGE_OPTIONS = [['English', 'en'], ['සිංහල', 'si'], ['தமிழ்', 'ta']];
const EMPTY = { role:'patient',firstName:'',lastName:'',email:'',phone:'',nic:'',password:'',language:'en' };
const messageOf = e => e?.response?.data?.message || e?.message || 'Something went wrong.';
// Translations for this screen. Selecting a language updates the UI immediately,
// while form.language is still sent to the backend for the new/edited user.
const SCREEN_TEXT = {
  "en": {
    "languageMenuTitle": "Display language",
    "languageMenuHint": "Choose the screen language",
    "languageMenuButton": "Change display language",
    "usersHeading": "Users",
    "adminManagement": "Admin management",
    "managementTitle": "User Management",
    "managementSub": "Patients, caregivers, staff and admins",
    "addUser": "Add User",
    "searchPlaceholder": "Search name, ID, email, phone...",
    "filterRole": "Filter by role",
    "filterStatus": "Filter by status",
    "all": "All",
    "patients": "Patients",
    "caregivers": "Caregivers",
    "staff": "Staff",
    "admins": "Admins",
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending",
    "clearFilters": "Clear filters",
    "oneUser": "user",
    "manyUsers": "users",
    "noUsers": "No users match these filters.",
    "roleLabel": "Role",
    "patient": "Patient",
    "caregiver": "Caregiver",
    "staffRole": "Staff",
    "admin": "Admin",
    "email": "Email",
    "phone": "Phone",
    "name": "Name",
    "userId": "User ID",
    "roleId": "Role ID",
    "nic": "NIC",
    "language": "Language",
    "status": "Status",
    "view": "View",
    "edit": "Edit",
    "activate": "Activate",
    "deactivate": "Deactivate",
    "delete": "Delete",
    "addNewUser": "Add New User",
    "editUser": "Edit User",
    "userDetails": "User Details",
    "reactivateQuestion": "Reactivate User?",
    "deactivateQuestion": "Deactivate User?",
    "deleteQuestion": "Delete User Permanently?",
    "userRole": "User role",
    "patientTip": "Hospital patient record. An SMS-capable mobile number is required (a basic phone is fine). Email is optional. A Patient ID is generated automatically; no login password is issued.",
    "staffTip": "Create a staff account with login credentials.",
    "adminTip": "Admin accounts have full administrative access. Create only with authorization.",
    "firstName": "First name",
    "lastName": "Last name",
    "emailOptional": "Email (optional)",
    "phoneRequired": "Phone number (SMS required)",
    "nicOptional": "NIC (optional)",
    "staffPassword": "Temporary password (min. 6 characters)",
    "adminPassword": "Temporary password (min. 10 characters)",
    "editTip": "User role, IDs and password cannot be edited from this form. Status is managed separately.",
    "confirmReactivate": "Reactivate {name}?",
    "confirmDeactivate": "Deactivate {name}?",
    "confirmDelete": "Are you sure you want to delete {name}?",
    "reactivateInfo": "This user will be able to sign in again. Any previously revoked caregiver links remain revoked and require new consent.",
    "deactivateInfo": "This user will lose access immediately. Their account and medical records remain stored in MongoDB.",
    "deleteInfo": "This permanently removes the staff account and cannot be undone. The account will only be deleted if it is not linked to hospital records. This does not delete patient or hospital records.",
    "saveChanges": "Save Changes",
    "reactivateUser": "Reactivate User",
    "deactivateUser": "Deactivate User",
    "deleteAccount": "Delete Account",
    "cancel": "Cancel",
    "close": "Close",
    "nameRequired": "First name and last name are required.",
    "phoneMissing": "Phone number is required for every user, including patients.",
    "phoneInvalid": "Enter a valid Sri Lankan SMS-capable mobile number (e.g., 0771234567).",
    "emailRequired": "Email is required for Staff and Admin accounts.",
    "emailInvalid": "Enter a valid email address.",
    "roleInvalid": "Please select Patient, Staff, or Admin.",
    "passwordMin": "Password must have at least {count} characters.",
    "created": "{role} record created successfully.",
    "updated": "User updated successfully.",
    "activatedSuccess": "User reactivated. They can sign in again.",
    "deactivatedSuccess": "User deactivated. Existing login tokens will be rejected.",
    "deletedSuccess": "Staff account permanently deleted.",
    "genericError": "Something went wrong.",
    "openMenu": "Open menu",
    "refresh": "Refresh",
    "searchUsers": "Search users"
  },
  "si": {
    "languageMenuTitle": "දර්ශන භාෂාව",
    "languageMenuHint": "තිරයේ භාෂාව තෝරන්න",
    "languageMenuButton": "දර්ශන භාෂාව වෙනස් කරන්න",
    "usersHeading": "පරිශීලකයින්",
    "adminManagement": "පරිපාලක කළමනාකරණය",
    "managementTitle": "පරිශීලක කළමනාකරණය",
    "managementSub": "රෝගීන්, රැකබලා ගන්නන්, කාර්ය මණ්ඩලය සහ පරිපාලකයින්",
    "addUser": "පරිශීලකයා එක් කරන්න",
    "searchPlaceholder": "නම, හැඳුනුම් අංකය, ඊමේල්, දුරකථනය සොයන්න...",
    "filterRole": "භූමිකාව අනුව පෙරන්න",
    "filterStatus": "තත්ත්වය අනුව පෙරන්න",
    "all": "සියල්ල",
    "patients": "රෝගීන්",
    "caregivers": "රැකබලා ගන්නන්",
    "staff": "කාර්ය මණ්ඩලය",
    "admins": "පරිපාලකයින්",
    "active": "සක්‍රීය",
    "inactive": "අක්‍රීය",
    "pending": "පොරොත්තුවෙන්",
    "clearFilters": "පෙරහන් ඉවත් කරන්න",
    "oneUser": "පරිශීලකයෙක්",
    "manyUsers": "පරිශීලකයින්",
    "noUsers": "මෙම පෙරහන්වලට ගැළපෙන පරිශීලකයින් නැත.",
    "roleLabel": "භූමිකාව",
    "patient": "රෝගියා",
    "caregiver": "රැකබලා ගන්නා",
    "staffRole": "කාර්ය මණ්ඩලය",
    "admin": "පරිපාලක",
    "email": "විද්‍යුත් තැපෑල",
    "phone": "දුරකථනය",
    "name": "නම",
    "userId": "පරිශීලක අංකය",
    "roleId": "භූමිකා අංකය",
    "nic": "ජාතික හැඳුනුම්පත",
    "language": "භාෂාව",
    "status": "තත්ත්වය",
    "view": "බලන්න",
    "edit": "සංස්කරණය",
    "activate": "සක්‍රීය කරන්න",
    "deactivate": "අක්‍රීය කරන්න",
    "delete": "මකන්න",
    "addNewUser": "නව පරිශීලකයෙකු එක් කරන්න",
    "editUser": "පරිශීලකයා සංස්කරණය",
    "userDetails": "පරිශීලක විස්තර",
    "reactivateQuestion": "නැවත සක්‍රීය කරන්නද?",
    "deactivateQuestion": "අක්‍රීය කරන්නද?",
    "deleteQuestion": "ස්ථිරව මකන්නද?",
    "userRole": "පරිශීලක භූමිකාව",
    "patientTip": "රෝහල් රෝගී වාර්තාවකි. SMS ලැබිය හැකි දුරකථන අංකයක් අවශ්‍ය වේ. විද්‍යුත් තැපෑල අත්‍යවශ්‍ය නොවේ. රෝගී අංකය ස්වයංක්‍රීයව සාදන අතර පිවිසුම් මුරපදයක් ලබා නොදේ.",
    "staffTip": "පිවිසුම් තොරතුරු සමඟ කාර්ය මණ්ඩල ගිණුමක් සාදන්න.",
    "adminTip": "පරිපාලක ගිණුමට පූර්ණ පරිපාලන ප්‍රවේශය ඇත. අවසරය ඇති විට පමණක් සාදන්න.",
    "firstName": "මුල් නම",
    "lastName": "වාසගම",
    "emailOptional": "විද්‍යුත් තැපෑල (විකල්ප)",
    "phoneRequired": "දුරකථන අංකය (SMS අවශ්‍යයි)",
    "nicOptional": "ජාතික හැඳුනුම්පත (විකල්ප)",
    "staffPassword": "තාවකාලික මුරපදය (අක්ෂර 6ක් වත්)",
    "adminPassword": "තාවකාලික මුරපදය (අක්ෂර 10ක් වත්)",
    "editTip": "මෙම පෝරමයෙන් භූමිකාව, අංක හෝ මුරපදය වෙනස් කළ නොහැක. තත්ත්වය වෙනම කළමනාකරණය කෙරේ.",
    "confirmReactivate": "{name} නැවත සක්‍රීය කරන්නද?",
    "confirmDeactivate": "{name} අක්‍රීය කරන්නද?",
    "confirmDelete": "{name} ස්ථිරව මකා දැමීමට අවශ්‍ය බව විශ්වාසද?",
    "reactivateInfo": "මෙම පරිශීලකයාට නැවත පිවිසිය හැක. කලින් අවලංගු කළ රැකබලා ගන්නා සම්බන්ධතා සඳහා නව අවසරයක් අවශ්‍ය වේ.",
    "deactivateInfo": "මෙම පරිශීලකයාගේ ප්‍රවේශය වහාම නවතී. ගිණුම සහ වෛද්‍ය වාර්තා MongoDB තුළ තබා ගනී.",
    "deleteInfo": "මෙම කාර්ය මණ්ඩල ගිණුම ස්ථිරව මකා දමන අතර ආපසු ලබා ගත නොහැක. රෝහල් වාර්තාවලට සම්බන්ධ නොවේ නම් පමණක් මකා දැමේ. රෝගී හෝ රෝහල් වාර්තා මකා නොදමයි.",
    "saveChanges": "වෙනස්කම් සුරකින්න",
    "reactivateUser": "නැවත සක්‍රීය කරන්න",
    "deactivateUser": "අක්‍රීය කරන්න",
    "deleteAccount": "ගිණුම මකන්න",
    "cancel": "අවලංගු කරන්න",
    "close": "වසන්න",
    "nameRequired": "මුල් නම සහ වාසගම ඇතුළත් කරන්න.",
    "phoneMissing": "රෝගීන් ඇතුළු සියලු පරිශීලකයින් සඳහා දුරකථන අංකයක් අවශ්‍ය වේ.",
    "phoneInvalid": "වලංගු ශ්‍රී ලාංකික SMS ලැබිය හැකි ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).",
    "emailRequired": "කාර්ය මණ්ඩල සහ පරිපාලක ගිණුම් සඳහා විද්‍යුත් තැපෑල අවශ්‍ය වේ.",
    "emailInvalid": "වලංගු විද්‍යුත් තැපෑල් ලිපිනයක් ඇතුළත් කරන්න.",
    "roleInvalid": "රෝගියා, කාර්ය මණ්ඩලය හෝ පරිපාලක තෝරන්න.",
    "passwordMin": "මුරපදයට අවම වශයෙන් අක්ෂර {count}ක් තිබිය යුතුය.",
    "created": "{role} වාර්තාව සාර්ථකව සාදන ලදී.",
    "updated": "පරිශීලකයා යාවත්කාලීන විය.",
    "activatedSuccess": "පරිශීලකයා නැවත සක්‍රීය විය. දැන් පිවිසිය හැක.",
    "deactivatedSuccess": "පරිශීලකයා අක්‍රීය විය. පවතින පිවිසුම් ටෝකන ප්‍රතික්ෂේප වේ.",
    "deletedSuccess": "කාර්ය මණ්ඩල ගිණුම ස්ථිරව මකා දමන ලදී.",
    "genericError": "දෝෂයක් සිදුවිය.",
    "openMenu": "මෙනුව විවෘත කරන්න",
    "refresh": "නැවුම් කරන්න",
    "searchUsers": "පරිශීලකයින් සොයන්න"
  },
  "ta": {
    "languageMenuTitle": "காட்சி மொழி",
    "languageMenuHint": "திரையின் மொழியைத் தேர்ந்தெடுக்கவும்",
    "languageMenuButton": "காட்சி மொழியை மாற்று",
    "usersHeading": "பயனர்கள்",
    "adminManagement": "நிர்வாக மேலாண்மை",
    "managementTitle": "பயனர் மேலாண்மை",
    "managementSub": "நோயாளிகள், பராமரிப்பாளர்கள், ஊழியர்கள் மற்றும் நிர்வாகிகள்",
    "addUser": "பயனரைச் சேர்",
    "searchPlaceholder": "பெயர், அடையாள எண், மின்னஞ்சல், தொலைபேசி தேடுக...",
    "filterRole": "பங்கு அடிப்படையில் வடிகட்டு",
    "filterStatus": "நிலை அடிப்படையில் வடிகட்டு",
    "all": "அனைத்தும்",
    "patients": "நோயாளிகள்",
    "caregivers": "பராமரிப்பாளர்கள்",
    "staff": "ஊழியர்கள்",
    "admins": "நிர்வாகிகள்",
    "active": "செயலில்",
    "inactive": "செயலற்றது",
    "pending": "நிலுவையில்",
    "clearFilters": "வடிகட்டிகளை நீக்கு",
    "oneUser": "பயனர்",
    "manyUsers": "பயனர்கள்",
    "noUsers": "இந்த வடிகட்டிகளுக்குப் பொருந்தும் பயனர்கள் இல்லை.",
    "roleLabel": "பங்கு",
    "patient": "நோயாளி",
    "caregiver": "பராமரிப்பாளர்",
    "staffRole": "ஊழியர்",
    "admin": "நிர்வாகி",
    "email": "மின்னஞ்சல்",
    "phone": "தொலைபேசி",
    "name": "பெயர்",
    "userId": "பயனர் எண்",
    "roleId": "பங்கு எண்",
    "nic": "தேசிய அடையாள அட்டை",
    "language": "மொழி",
    "status": "நிலை",
    "view": "பார்",
    "edit": "திருத்து",
    "activate": "செயல்படுத்து",
    "deactivate": "செயல்நீக்கு",
    "delete": "நீக்கு",
    "addNewUser": "புதிய பயனரைச் சேர்",
    "editUser": "பயனரைத் திருத்து",
    "userDetails": "பயனர் விவரங்கள்",
    "reactivateQuestion": "மீண்டும் செயல்படுத்தவா?",
    "deactivateQuestion": "செயல்நீக்கவா?",
    "deleteQuestion": "நிரந்தரமாக நீக்கவா?",
    "userRole": "பயனர் பங்கு",
    "patientTip": "மருத்துவமனை நோயாளர் பதிவு. SMS பெறக்கூடிய கைப்பேசி எண் தேவை. மின்னஞ்சல் கட்டாயமில்லை. நோயாளர் எண் தானாக உருவாக்கப்படும்; உள்நுழைவு கடவுச்சொல் வழங்கப்படாது.",
    "staffTip": "உள்நுழைவு விவரங்களுடன் ஊழியர் கணக்கை உருவாக்கவும்.",
    "adminTip": "நிர்வாகி கணக்குகளுக்கு முழு நிர்வாக அணுகல் உள்ளது. அனுமதியுடன் மட்டுமே உருவாக்கவும்.",
    "firstName": "முதல் பெயர்",
    "lastName": "குடும்பப் பெயர்",
    "emailOptional": "மின்னஞ்சல் (விருப்பம்)",
    "phoneRequired": "தொலைபேசி எண் (SMS அவசியம்)",
    "nicOptional": "தேசிய அடையாள எண் (விருப்பம்)",
    "staffPassword": "தற்காலிக கடவுச்சொல் (குறைந்தது 6 எழுத்துகள்)",
    "adminPassword": "தற்காலிக கடவுச்சொல் (குறைந்தது 10 எழுத்துகள்)",
    "editTip": "இந்தப் படிவத்தில் பங்கு, அடையாள எண்கள், கடவுச்சொல் ஆகியவற்றை மாற்ற முடியாது. நிலை தனியாக நிர்வகிக்கப்படுகிறது.",
    "confirmReactivate": "{name} ஐ மீண்டும் செயல்படுத்தவா?",
    "confirmDeactivate": "{name} ஐ செயல்நீக்கவா?",
    "confirmDelete": "{name} ஐ நிரந்தரமாக நீக்க விரும்புகிறீர்களா?",
    "reactivateInfo": "இந்தப் பயனர் மீண்டும் உள்நுழையலாம். முன்பு ரத்து செய்யப்பட்ட பராமரிப்பாளர் இணைப்புகளுக்கு புதிய ஒப்புதல் தேவை.",
    "deactivateInfo": "இந்தப் பயனரின் அணுகல் உடனடியாக நிறுத்தப்படும். கணக்கும் மருத்துவப் பதிவுகளும் MongoDB இல் பாதுகாக்கப்படும்.",
    "deleteInfo": "இந்த ஊழியர் கணக்கு நிரந்தரமாக நீக்கப்படும்; மீட்க முடியாது. மருத்துவமனைப் பதிவுகளுடன் இணைக்கப்படாதபோது மட்டுமே நீக்கப்படும். நோயாளர் அல்லது மருத்துவமனைப் பதிவுகள் நீக்கப்படாது.",
    "saveChanges": "மாற்றங்களைச் சேமி",
    "reactivateUser": "மீண்டும் செயல்படுத்து",
    "deactivateUser": "செயல்நீக்கு",
    "deleteAccount": "கணக்கை நீக்கு",
    "cancel": "ரத்து செய்",
    "close": "மூடு",
    "nameRequired": "முதல் பெயரையும் குடும்பப் பெயரையும் உள்ளிடவும்.",
    "phoneMissing": "நோயாளிகள் உட்பட எல்லாப் பயனர்களுக்கும் தொலைபேசி எண் அவசியம்.",
    "phoneInvalid": "SMS பெறக்கூடிய சரியான இலங்கை கைப்பேசி எண்ணை உள்ளிடவும் (எ.கா. 0771234567).",
    "emailRequired": "ஊழியர் மற்றும் நிர்வாகி கணக்குகளுக்கு மின்னஞ்சல் தேவை.",
    "emailInvalid": "சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.",
    "roleInvalid": "நோயாளி, ஊழியர் அல்லது நிர்வாகியைத் தேர்ந்தெடுக்கவும்.",
    "passwordMin": "கடவுச்சொல்லில் குறைந்தது {count} எழுத்துகள் இருக்க வேண்டும்.",
    "created": "{role} பதிவு வெற்றிகரமாக உருவாக்கப்பட்டது.",
    "updated": "பயனர் புதுப்பிக்கப்பட்டார்.",
    "activatedSuccess": "பயனர் மீண்டும் செயல்படுத்தப்பட்டார். இப்போது உள்நுழையலாம்.",
    "deactivatedSuccess": "பயனர் செயல்நீக்கப்பட்டார். ஏற்கனவே உள்ள உள்நுழைவு டோக்கன்கள் நிராகரிக்கப்படும்.",
    "deletedSuccess": "ஊழியர் கணக்கு நிரந்தரமாக நீக்கப்பட்டது.",
    "genericError": "ஏதோ பிழை ஏற்பட்டது.",
    "openMenu": "பட்டியைத் திற",
    "refresh": "புதுப்பி",
    "searchUsers": "பயனர்களைத் தேடு"
  }
};
const fill = (template, values = {}) => Object.entries(values).reduce(
  (result, [key, value]) => result.split(`{${key}}`).join(String(value)), template
);


function Chip({ label, active, onPress }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[s.chip, active && s.chipActive]}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
  </TouchableOpacity>;
}
function Field({ label, value, onChangeText, ...props }) {
  return <View style={s.field}>
    <Text style={s.fieldLabel}>{label}</Text>
    <TextInput value={String(value ?? '')} onChangeText={onChangeText} placeholder={label}
      placeholderTextColor="#94A3B8" style={s.input}
      editable={true} showSoftInputOnFocus={true} autoCorrect={false}
      {...props}/>
  </View>;
}

export default function UserManagement({ navigation }) {
  const safeInsets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [uiLanguage, setUiLanguage] = useState('en');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const t = SCREEN_TEXT[uiLanguage] || SCREEN_TEXT.en;
  const roleName = value => ({ patient:t.patient,caregiver:t.caregiver,staff:t.staffRole,admin:t.admin }[value] || value || '—');
  const statusName = value => ({ active:t.active,inactive:t.inactive,pending:t.pending }[value] || value || '—');
  const setDisplayLanguage = async (value) => {
    setUiLanguage(value);
    setLanguageMenuOpen(false);
    try { await AsyncStorage.setItem(ADMIN_LANGUAGE_KEY, value); }
    catch (storageError) { console.warn('Could not save Admin language preference:', storageError); }
  };
  // Preserve the existing form behavior: this language also previews the translated form.
  // The three-dot menu separately saves the Admin's persistent display preference.
  const changeFormLanguage = value => { setForm(old => ({...old, language:value})); setUiLanguage(value); setError(''); };

  const load = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const response = await listUsersAdmin(params);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (e) { setError(messageOf(e)); }
    finally { setLoading(false); }
  }, []);

  const reload = (nextSearch = search, nextRole = role, nextStatus = status) => load({
    ...(nextSearch.trim() && { search: nextSearch.trim() }),
    ...(nextRole !== 'all' && { role: nextRole }),
    ...(nextStatus !== 'all' && { status: nextStatus })
  });
  useFocusEffect(useCallback(() => {
    let active = true;
    load();
    AsyncStorage.getItem(ADMIN_LANGUAGE_KEY)
      .then(value => { if (active && ['en', 'si', 'ta'].includes(value)) setUiLanguage(value); })
      .catch(() => {});
    return () => { active = false; };
  }, [load]));
  const changeRole = next => { setRole(next); reload(search, next, status); };
  const changeStatus = next => { setStatus(next); reload(search, role, next); };
  const resetFilters = () => { setSearch(''); setRole('all'); setStatus('all'); load(); };
  const setValue = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const openAdd = () => { setSelected(null); setForm({ ...EMPTY, language: uiLanguage }); setError(''); setModal('add'); };
  const openEdit = user => {
    setSelected(user);
    setForm({
      role:user.role || 'patient', firstName:user.firstName || '', lastName:user.lastName || '',
      email:user.email || '', phone:user.phone || '', nic:user.nic || '',
      password:'', language:user.language || 'en'
    });
    setError(''); setModal('edit');
  };
  const openView = async user => {
    setError('');
    try {
      const response = await getUserAdmin(user.userId);
      setSelected(response?.data || user);
    } catch (e) { setSelected(user); setError(messageOf(e)); }
    setModal('view');
  };
  const openConfirm = (kind, user) => { setSelected(user); setError(''); setModal(kind); };
  const close = () => { if (!busy) {setModal('');setError('');} };

  const save = async () => {
    if (busy) return;
    const isAdd = modal === 'add';
    const targetRole = isAdd ? form.role : selected?.role;
    const patient = targetRole === 'patient';
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(t.nameRequired); return;
    }
    const phoneChanged = isAdd || phone !== String(selected?.phone || '');
    if (!phone && phoneChanged) {
      setError(t.phoneMissing); return;
    }
    const rawPhone = phone.replace(/[\s()-]/g, '');
    const localPhone = rawPhone.startsWith('+94') ? `0${rawPhone.slice(3)}` :
      rawPhone.startsWith('94') ? `0${rawPhone.slice(2)}` : rawPhone;
    if (phoneChanged && !/^07\d{8}$/.test(localPhone)) {
      setError(t.phoneInvalid); return;
    }
    if (!patient && !email) {
      setError(t.emailRequired); return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError(t.emailInvalid); return;
    }
    if (isAdd && !['patient','staff','admin'].includes(targetRole)) {
      setError(t.roleInvalid); return;
    }
    if (isAdd && !patient) {
      const minLength = targetRole === 'admin' ? 10 : 6;
      if (form.password.length < minLength) {
        setError(fill(t.passwordMin, {count:minLength})); return;
      }
    }
    const payload = {
      firstName:form.firstName.trim(), lastName:form.lastName.trim(),
      email, phone: phoneChanged ? localPhone : phone, nic:form.nic.trim(), language:form.language
    };
    if (isAdd) {
      payload.role = targetRole;
      if (!patient) payload.password = form.password;
    }
    setBusy(true); setError('');
    try {
      if (isAdd) await addUserAdmin(payload);
      else await updateUserAdmin(selected.userId, payload);
      setNotice(isAdd ? fill(t.created, {role:roleName(targetRole)}) : t.updated);
      setModal(''); await reload();
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };

  const confirmStatus = async () => {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      if (modal === 'activate') await updateUserAdmin(selected.userId, { status:'active' });
      else await deactivateUserAdmin(selected.userId);
      setNotice(modal === 'activate' ? t.activatedSuccess : t.deactivatedSuccess);
      setModal(''); await reload();
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };
  const confirmPermanent = async () => {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      await permanentlyDeleteStaffAdmin(selected.userId);
      setNotice(t.deletedSuccess);
      setModal(''); await reload();
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  };

  const fullName = user => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const idFor = user => user?.patientId || user?.caregiverId || user?.staffId || user?.adminId || user?.userId;
  const formBody = <>
    {modal === 'add' && <>
      <Text style={s.fieldLabel}>{t.userRole}</Text>
      <View style={s.chipRow}>
        {[[t.patient,'patient'],[t.staffRole,'staff'],[t.admin,'admin']].map(([label,value]) =>
          <Chip key={value} label={label} active={form.role === value} onPress={()=>setValue('role',value)}/>) }
      </View>
      <Text style={s.finePrint}>
        {form.role === 'patient'
          ? t.patientTip
          : form.role === 'admin'
            ? t.adminTip
            : t.staffTip}
      </Text>
    </>}
    <Field label={t.firstName} value={form.firstName} onChangeText={v=>setValue('firstName',v)} autoCapitalize="words"/>
    <Field label={t.lastName} value={form.lastName} onChangeText={v=>setValue('lastName',v)} autoCapitalize="words"/>
    <Field label={form.role === 'patient' ? t.emailOptional : t.email} value={form.email} onChangeText={v=>setValue('email',v)} keyboardType="email-address" autoCapitalize="none"/>
    <Field label={form.role === 'patient' ? t.phoneRequired : t.phone} value={form.phone} onChangeText={v=>setValue('phone',v)} keyboardType="phone-pad"/>
    <Field label={t.nicOptional} value={form.nic} onChangeText={v=>setValue('nic',v)} autoCapitalize="characters"/>
    {modal === 'add' && form.role !== 'patient' &&
      <Field label={form.role === 'admin' ? t.adminPassword : t.staffPassword}
        value={form.password} onChangeText={v=>setValue('password',v)} secureTextEntry/>}
    <Text style={s.fieldLabel}>{t.language}</Text>
    <View style={s.chipRow}>
      {[['English','en'],['සිංහල','si'],['தமிழ்','ta']].map(([label,value]) =>
        <Chip key={value} label={label} active={form.language === value} onPress={()=>changeFormLanguage(value)}/>) }
    </View>
  </>;

  return <SafeAreaView style={s.outer} edges={['top', 'bottom']}><View style={s.screen}>
    <View style={s.topbar}>
      <TouchableOpacity accessibilityLabel={t.openMenu} onPress={()=>navigation.openDrawer()} style={s.topIcon}>
        <Ionicons name="menu" size={23} color={BLUE}/>
      </TouchableOpacity>
      <View style={{flex:1}}><Text style={s.headerTitle}>{t.usersHeading}</Text><Text style={s.headerSub}>{t.adminManagement}</Text></View>
      <TouchableOpacity accessibilityLabel={t.refresh} onPress={()=>reload()} style={s.topIcon}><Ionicons name="refresh" size={20} color={BLUE}/></TouchableOpacity>
    </View>
    <View style={s.languageMenuRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.languageMenuButton}
          onPress={() => setLanguageMenuOpen(true)} style={s.languageMenuButton}>
          <Ionicons name="ellipsis-vertical" size={19} color="#475569" />
        </TouchableOpacity>
    </View>
    <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="none" contentContainerStyle={s.content}>
      <View style={s.headingRow}>
        <View style={{flex:1}}><Text style={s.pageTitle}>{t.managementTitle}</Text><Text style={s.hint}>{t.managementSub}</Text></View>
        <TouchableOpacity onPress={openAdd} style={s.addButton}><Ionicons name="person-add-outline" size={15} color="#FFFFFF"/><Text style={s.addText}>{t.addUser}</Text></TouchableOpacity>
      </View>
      {!!notice && <TouchableOpacity style={s.notice} onPress={()=>setNotice('')}><Text style={s.noticeText}>{notice}  ×</Text></TouchableOpacity>}
      {!!error && !modal && <Text style={s.error}>{error}</Text>}
      <View style={s.searchRow}>
        <TextInput style={s.search} placeholder={t.searchPlaceholder} placeholderTextColor="#94A3B8"
          value={search} onChangeText={setSearch} onSubmitEditing={()=>reload()} returnKeyType="search"
          editable={true} showSoftInputOnFocus={true} autoCorrect={false} />
        <TouchableOpacity onPress={()=>reload()} style={s.searchButton} accessibilityLabel={t.searchUsers}><Ionicons name="search" size={19} color="#FFFFFF"/></TouchableOpacity>
      </View>
      <Text style={s.filterTitle}>{t.filterRole}</Text>
      <View style={s.chipRow}>{[[t.all,'all'],[t.patients,'patient'],[t.caregivers,'caregiver'],[t.staff,'staff'],[t.admins,'admin']].map(([label,value]) =>
        <Chip key={value} label={label} active={role===value} onPress={()=>changeRole(value)}/>)}</View>
      <Text style={s.filterTitle}>{t.filterStatus}</Text>
      <View style={s.chipRow}>{[[t.all,'all'],[t.active,'active'],[t.inactive,'inactive'],[t.pending,'pending']].map(([label,value]) =>
        <Chip key={value} label={label} active={status===value} onPress={()=>changeStatus(value)}/>)}</View>
      <TouchableOpacity onPress={resetFilters} style={s.reset}><Text style={s.resetText}>{t.clearFilters}</Text></TouchableOpacity>
      <Text style={s.resultText}>{users.length} {users.length === 1 ? t.oneUser : t.manyUsers}</Text>
      {loading ? <ActivityIndicator size="large" color={BLUE} style={{marginTop:38}}/> : users.length === 0 ?
        <View style={s.empty}><Text style={s.hint}>{t.noUsers}</Text></View> :
        users.map(user => <View key={user.userId} style={s.card}>
          <View style={s.cardHead}>
            <View style={s.avatar}><Text style={s.avatarText}>{(user.firstName?.[0] || 'U')+(user.lastName?.[0] || '')}</Text></View>
            <View style={{flex:1}}><Text style={s.name}>{fullName(user)}</Text>
              <Text style={s.subtitle}>{idFor(user)}</Text></View>
            <View style={[s.badge, user.status==='active'?s.active:user.status==='inactive'?s.inactive:s.pending]}>
              <Text style={[s.badgeText,{color:user.status==='active'?'#15803D':user.status==='inactive'?'#64748B':'#92400E'}]}>{statusName(user.status)}</Text>
            </View>
          </View>
          <Text style={s.detail}>{t.roleLabel}: {roleName(user.role)}</Text>
          <Text style={s.detail}>{t.email}: {user.email || '—'}</Text>
          <Text style={s.detail}>{t.phone}: {user.phone || '—'}</Text>
          <View style={s.actions}>
            <TouchableOpacity style={s.action} onPress={()=>openView(user)}><Ionicons name="eye-outline" size={15} color={BLUE}/><Text style={s.actionLabel}>{t.view}</Text></TouchableOpacity>
            <TouchableOpacity style={s.action} onPress={()=>openEdit(user)}><Ionicons name="create-outline" size={15} color={BLUE}/><Text style={s.actionLabel}>{t.edit}</Text></TouchableOpacity>
            {user.status === 'inactive' ?
              <TouchableOpacity style={s.action} onPress={()=>openConfirm('activate',user)}><Ionicons name="checkmark-circle-outline" size={15} color="#15803D"/><Text style={[s.actionLabel,{color:'#15803D'}]}>{t.activate}</Text></TouchableOpacity> :
              <TouchableOpacity style={s.action} onPress={()=>openConfirm('deactivate',user)}><Ionicons name="ban-outline" size={15} color="#DC2626"/><Text style={[s.actionLabel,{color:'#DC2626'}]}>{t.deactivate}</Text></TouchableOpacity>}
          </View>
          {user.role === 'staff' && <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${t.delete} ${fullName(user)}`}
            onPress={()=>openConfirm('permanent',user)}
            style={s.permanentLink}>
            <Ionicons name="trash-outline" size={14} color="#B91C1C"/>
            <Text style={s.permanentText}>{t.delete}</Text>
          </TouchableOpacity>}
        </View>) }
    </ScrollView>
    <Modal visible={!!modal} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[s.scrim, { paddingTop: Math.max(16, safeInsets.top + 8), paddingBottom: Math.max(16, safeInsets.bottom + 8) }]}>
        <View style={s.modalBox}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{modal==='add'?t.addNewUser:modal==='edit'?t.editUser:modal==='view'?t.userDetails:modal==='activate'?t.reactivateQuestion:modal==='deactivate'?t.deactivateQuestion:t.deleteQuestion}</Text>
          <TouchableOpacity disabled={busy} onPress={close}><Ionicons name="close-circle-outline" size={25} color="#64748B"/></TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="none"
          keyboardOpeningTime={0} showsVerticalScrollIndicator={false}>
          {(modal==='add' || modal==='edit') && <>
            {formBody}
            {modal==='edit' && <Text style={s.finePrint}>{t.editTip}</Text>}
          </>}
          {modal === 'view' && !!selected && <View style={s.infoBox}>
            {[
              [t.name,fullName(selected)],[t.userId,selected.userId],[t.roleLabel,roleName(selected.role)],
              [t.roleId,idFor(selected)],[t.email,selected.email || '—'],[t.phone,selected.phone || '—'],
              [t.nic,selected.nic || '—'],[t.language,selected.language || '—'],[t.status,statusName(selected.status)]
            ].map(([label,value])=><View key={label} style={s.infoRow}><Text style={s.infoKey}>{label}</Text><Text style={s.infoValue}>{value}</Text></View>)}
          </View>}
          {(modal==='activate'||modal==='deactivate') && <>
            <Text style={s.confirmText}>{fill(modal==='activate' ? t.confirmReactivate : t.confirmDeactivate, {name:fullName(selected)})}</Text>
            <Text style={s.finePrint}>{modal==='activate' ?
              t.reactivateInfo :
              t.deactivateInfo}</Text>
          </>}
          {modal==='permanent' && <>
            <Text style={s.confirmText}>{fill(t.confirmDelete, {name:fullName(selected)})}</Text>
            <Text style={s.finePrint}>
              {t.deleteInfo}
            </Text>
          </>}
          {!!error && <Text style={s.error}>{error}</Text>}
          {modal!=='view' && <TouchableOpacity disabled={busy}
            onPress={modal==='add'||modal==='edit'?save:modal==='permanent'?confirmPermanent:confirmStatus}
            style={[s.confirmButton,(modal==='deactivate'||modal==='permanent')&&s.dangerButton,busy&&{opacity:0.4}]}>
            {busy ? <ActivityIndicator color="#FFFFFF"/> : <Text style={s.confirmButtonText}>{modal==='add'?t.addUser:modal==='edit'?t.saveChanges:modal==='activate'?t.reactivateUser:modal==='deactivate'?t.deactivateUser:t.deleteAccount}</Text>}
          </TouchableOpacity>}
          <TouchableOpacity disabled={busy} style={s.cancelButton} onPress={close}><Text style={s.cancelText}>{modal==='view'?t.close:t.cancel}</Text></TouchableOpacity>
        </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <Modal visible={languageMenuOpen} transparent animationType="fade"
      onRequestClose={() => setLanguageMenuOpen(false)}>
      <View style={s.languageOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setLanguageMenuOpen(false)} />
        <View style={[s.languageMenuPanel, { top: safeInsets.top + 102 }]}>
          <Text style={s.languageMenuTitle}>{t.languageMenuTitle}</Text>
          <Text style={s.languageMenuHint}>{t.languageMenuHint}</Text>
          {LANGUAGE_OPTIONS.map(([label,value]) => (
            <TouchableOpacity key={value} accessibilityRole="button"
              onPress={() => setDisplayLanguage(value)}
              style={[s.languageOption, uiLanguage === value && s.languageOptionActive]}>
              <Text style={[s.languageOptionText, uiLanguage === value && s.languageOptionTextActive]}>{label}</Text>
              {uiLanguage === value && <Ionicons name="checkmark" size={18} color={BLUE} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  </View></SafeAreaView>;
}

const s = StyleSheet.create({
  outer:{flex:1,backgroundColor:'#EDF1F5'},screen:{flex:1,width:'100%',maxWidth:760,alignSelf:'center',backgroundColor:'#F8F7FC'},
  topbar:{padding:14,backgroundColor:'#FFFFFF',borderBottomWidth:1,borderColor:'#E5E7EB',flexDirection:'row',alignItems:'center',gap:12},
  topIcon:{width:36,height:36,justifyContent:'center',alignItems:'center',backgroundColor:'#EEF4FF',borderRadius:10},
  headerTitle:{fontSize:17,fontWeight:'800',color:'#111827'},headerSub:{color:'#94A3B8',fontSize:10},
  languageMenuRow:{alignItems:'flex-end',paddingHorizontal:16,paddingTop:4,paddingBottom:2},
  languageMenuButton:{width:34,height:32,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#EFF4FA'},
  languageOverlay:{flex:1,backgroundColor:'rgba(15,23,42,0.10)'},
  languageMenuPanel:{position:'absolute',right:16,width:230,backgroundColor:'#FFFFFF',borderRadius:14,
    padding:10,borderWidth:1,borderColor:'#E2E8F0',elevation:9,shadowColor:'#000',shadowOpacity:0.14,
    shadowOffset:{width:0,height:4},shadowRadius:12},
  languageMenuTitle:{fontSize:13,fontWeight:'800',color:'#111827',paddingHorizontal:9,paddingTop:6},
  languageMenuHint:{fontSize:10,color:'#64748B',paddingHorizontal:9,marginTop:3,marginBottom:7},
  languageOption:{minHeight:43,flexDirection:'row',alignItems:'center',justifyContent:'space-between',
    borderRadius:9,paddingHorizontal:11},
  languageOptionActive:{backgroundColor:'#EEF4FF'},
  languageOptionText:{fontSize:13,color:'#334155',fontWeight:'600'},
  languageOptionTextActive:{color:BLUE,fontWeight:'800'},
  content:{padding:16,paddingBottom:45},headingRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:17},
  pageTitle:{fontSize:16,fontWeight:'800',color:'#111827'},hint:{fontSize:10,color:'#64748B',marginTop:4},
  addButton:{backgroundColor:BLUE,borderRadius:10,padding:11,minHeight:38,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},
  addText:{color:'#FFFFFF',fontSize:11,fontWeight:'800'},
  searchRow:{flexDirection:'row',gap:7,alignItems:'center'},search:{flex:1,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#D9E1EC',paddingHorizontal:12,borderRadius:10,height:42,color:'#111827',fontSize:12},
  searchButton:{height:42,width:42,justifyContent:'center',alignItems:'center',borderRadius:10,backgroundColor:BLUE},
  filterTitle:{fontSize:10,fontWeight:'700',color:'#64748B',marginTop:14,marginBottom:7},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:4},chip:{paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:'#CBD5E1',borderRadius:20,backgroundColor:'#FFFFFF'},
  chipActive:{backgroundColor:'#EAF1FF',borderColor:BLUE},chipText:{fontSize:10,fontWeight:'600',color:'#64748B'},chipTextActive:{color:BLUE,fontWeight:'800'},
  reset:{alignSelf:'flex-start',marginTop:10},resetText:{fontSize:10,color:BLUE,fontWeight:'700'},
  resultText:{fontSize:11,color:'#64748B',fontWeight:'700',marginVertical:13},empty:{padding:25,backgroundColor:'#FFFFFF',borderRadius:12,marginTop:20},
  card:{padding:14,borderRadius:15,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E0E5EC',marginBottom:13},
  cardHead:{flexDirection:'row',alignItems:'center',gap:9,marginBottom:10},avatar:{width:38,height:38,backgroundColor:'#EAF1FF',borderRadius:10,justifyContent:'center',alignItems:'center'},
  avatarText:{fontSize:12,fontWeight:'800',color:BLUE},name:{fontSize:13,fontWeight:'800',color:'#111827'},subtitle:{fontSize:9,color:'#94A3B8',marginTop:2},
  badge:{paddingHorizontal:8,paddingVertical:5,borderRadius:15},active:{backgroundColor:'#ECFDF3'},inactive:{backgroundColor:'#F1F5F9'},pending:{backgroundColor:'#FFFBEB'},badgeText:{fontSize:9,fontWeight:'800'},
  detail:{fontSize:11,color:'#475569',marginVertical:3},actions:{flexDirection:'row',gap:6,marginTop:12,paddingTop:12,borderTopWidth:1,borderTopColor:'#F1F5F9'},
  action:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DBEAFE',borderRadius:9,paddingVertical:10,gap:4},
  actionLabel:{color:BLUE,fontSize:10,fontWeight:'700'},permanentLink:{alignSelf:'flex-end',marginTop:11,flexDirection:'row',alignItems:'center',gap:6},
  permanentText:{fontSize:10,fontWeight:'600',color:'#B91C1C'},
  notice:{backgroundColor:'#ECFDF3',padding:12,borderRadius:10,marginBottom:12},noticeText:{fontSize:11,color:'#166534'},
  error:{fontSize:11,color:'#B91C1C',backgroundColor:'#FEF2F2',padding:10,borderRadius:9,marginVertical:12},
  scrim:{flex:1,backgroundColor:'rgba(15,23,42,0.56)',padding:16,alignItems:'center',justifyContent:'center'},
  modalBox:{backgroundColor:'#FFFFFF',padding:18,borderRadius:20,width:'100%',maxWidth:460,maxHeight:'90%'},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},modalTitle:{fontSize:17,fontWeight:'800',color:'#111827',flex:1},
  field:{marginBottom:13},fieldLabel:{fontSize:11,fontWeight:'700',color:'#334155',marginBottom:7},
  input:{height:43,backgroundColor:'#FFFFFF',borderColor:'#CBD5E1',borderWidth:1,paddingHorizontal:12,borderRadius:10,color:'#111827',fontSize:12},
  finePrint:{fontSize:11,color:'#64748B',lineHeight:18,marginVertical:12},confirmText:{fontSize:14,fontWeight:'800',color:'#111827',marginTop:6},
  confirmButton:{minHeight:44,backgroundColor:BLUE,borderRadius:10,alignItems:'center',justifyContent:'center',marginTop:12},
  dangerButton:{backgroundColor:'#DC2626'},confirmButtonText:{color:'#FFFFFF',fontSize:12,fontWeight:'800'},
  cancelButton:{minHeight:44,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,marginTop:10},cancelText:{fontSize:12,color:'#334155',fontWeight:'700'},
  infoBox:{backgroundColor:'#F8FAFC',padding:12,borderRadius:10},infoRow:{flexDirection:'row',alignItems:'flex-start',paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#E5E7EB'},
  infoKey:{width:'30%',color:'#64748B',fontSize:11},infoValue:{flex:1,color:'#111827',fontSize:11,fontWeight:'700'}
});
