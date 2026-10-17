import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';

export const SettingsContext = createContext();

// Dynamic translations object
export const translations = {
  English: {
    appTitle: 'MEDIQUEUE',
    home: 'Home',
    myQueueHeader: 'MY QUEUE',
    alertsHeader: 'ALERTS',
    goodMorning: 'GOOD MORNING',
    nicVerified: 'NIC Verified',
    yourToken: 'YOUR TOKEN',
    nowServing: 'NOW SERVING',
    aheadOfYou: 'AHEAD OF YOU',
    estimatedWait: 'Estimated Wait:',
    queueMovingSteadily: 'Queue is moving steadily',
    noActiveQueue: 'No active queue tokens found.',
    viewLiveQueue: 'View Live Queue',
    getNewToken: 'Get New Token',
    liveQueueTitle: 'Live Queue',
    yourTokenNumber: 'YOUR TOKEN NUMBER',
    doctorWithPatient: 'Doctor is currently with patient',
    estWaitTime: 'EST. WAIT TIME',
    queueProgress: 'Queue Progress',
    statusCurrent: 'CURRENT',
    statusYou: 'YOU',
    queueStatusMoving: 'STATUS: QUEUE IS MOVING',
    olderNotifications: 'OLDER NOTIFICATIONS',
    noOlderNotifications: 'No older notifications',
    profileHeader: 'PROFILE',
    patientProfile: 'Patient Profile',
    profileSubtitle: 'Manage identity, clinical alerts & tri-lingual voice cues',
    verifiedNic: 'Verified NIC',
    appSettings: 'APP SETTINGS',
    general: 'General',
    language: 'Language',
    languageSubtitle: 'Sinhala, Tamil & English',
    notifications: 'Notification Preferences',
    notificationsSubtitle: 'Medication & task alerts',
    accessibility: 'Accessibility & Text Size',
    accessibilitySubtitle: 'Display scale, high contrast',
    privacy: 'Privacy & Security',
    privacySubtitle: 'PIN, biometric unlock',
    logOut: 'Log Out',
    selectLanguage: 'Select Language',
    queueAlerts: 'Queue & Task Alerts',
    queueAlertsSubtitle: 'Receive instant push notifications',
    savePreferences: 'Save Preferences',
    textSizeDisplay: 'Text Size & Display',
    smallText: 'Small Text',
    mediumText: 'Medium Text',
    largeText: 'Large Text',
    biometricUnlock: 'Biometric Unlock',
    biometricSubtitle: 'Use Face ID / Fingerprint to open app',
    changePin: 'Change App PIN',
    yourTurn: 'YOUR TURN',
    yourTurnNear: 'YOUR TURN IS NEAR',
    queueUpdate: 'QUEUE UPDATE',
    pleaseProceedTo: 'Please proceed to',
    viewDirections: 'VIEW DIRECTIONS',
    dismiss: 'DISMISS',
    numbersRemaining: 'numbers remaining.',
    opdReturnMessage: 'Please return to the OPD waiting area immediately.',
    queueUpdateDefaultMsg: '10 patients remaining before your turn. Estimated wait time is approx. ~35 mins.',
    currentServingText: 'Current serving:',
    aheadText: 'ahead',
  },
  Sinhala: {
    appTitle: 'මැඩිකියු',
    home: 'මුල් පිටුව',
    myQueueHeader: 'මගේ පෝලිම',
    alertsHeader: 'දැනුම්දීම්',
    goodMorning: 'සුබ උදෑසනක්',
    nicVerified: 'ජා.හැ. අංකය තහවුරුයි',
    yourToken: 'ඔබගේ ටෝකන් අංකය',
    nowServing: 'දැන් කැඳවන්නේ',
    aheadOfYou: 'ඔබට ඉදිරියෙන්',
    estimatedWait: 'අපේක්ෂිත වේලාව:',
    queueMovingSteadily: 'පෝලිම ක්‍රමවත්ව ඉදිරියට යයි',
    noActiveQueue: 'සක්‍රිය ටෝකන නොමැත.',
    viewLiveQueue: 'සජීවී පෝලිම බලන්න',
    getNewToken: 'අලුත් ටෝකනයක් ගන්න',
    liveQueueTitle: 'සජීවී පෝලිම',
    yourTokenNumber: 'ඔබගේ ටෝකන් අංකය',
    doctorWithPatient: 'වෛද්‍යවරයා රෝගියා පරීක්ෂා කරයි',
    estWaitTime: 'අපේක්ෂිත කාලය',
    queueProgress: 'පෝලිමේ තත්ත්වය',
    statusCurrent: 'දැන්',
    statusYou: 'ඔබ',
    queueStatusMoving: 'තත්ත්වය: පෝලිම ක්‍රියාත්මකයි',
    olderNotifications: 'පැරණි දැනුම්දීම්',
    noOlderNotifications: 'පැරණි දැනුම්දීම් නැත',
    profileHeader: 'ගිණුම',
    patientProfile: 'රෝගී ගිණුම',
    profileSubtitle: 'මෙහිදී ඔබගේ තොරතුරු, දැනුම්දීම් සහ භාෂා සැකසුම් කළමනාකරණය කළ හැක',
    verifiedNic: 'තහවුරු කළ ජා.හැ.අ',
    appSettings: 'යෙදුම් සැකසුම්',
    general: 'සාමාන්‍ය',
    language: 'භාෂාව',
    languageSubtitle: 'සිංහල, දෙමළ සහ ඉංග්‍රීසි',
    notifications: 'දැනුම්දීම් මනාප',
    notificationsSubtitle: 'බෙහෙත් සහ කාර්යයන් පිළිබඳ දැනුම්දීම්',
    accessibility: 'ප්‍රවේශ්‍යතාව සහ අකුරු ප්‍රමාණය',
    accessibilitySubtitle: 'තිරයේ විශාලත්වය සහ පැහැදිලි බව',
    privacy: 'පුද්ගලිකත්වය සහ ආරක්ෂාව',
    privacySubtitle: 'PIN අංකය සහ ජෛවමිතිය',
    logOut: 'නික්මෙන්න',
    selectLanguage: 'භාෂාව තෝරන්න',
    queueAlerts: 'පෝලිම් සහ කාර්යයන් දැනුම්දීම්',
    queueAlertsSubtitle: 'ක්ෂණික තල්ලු දැනුම්දීම් ලබා ගන්න',
    savePreferences: 'මනාප සුරකින්න',
    textSizeDisplay: 'අකුරු ප්‍රමාණය සහ දර්ශනය',
    smallText: 'කඩා අකුරු (Small)',
    mediumText: 'සාමාන්‍ය අකුරු (Medium)',
    largeText: 'විශාල අකුරු (Large)',
    biometricUnlock: 'ජෛවමිතික අගුළු ඇරීම',
    biometricSubtitle: 'Face ID / ඇඟිලි සලකුණ භාවිත කරන්න',
    changePin: 'PIN අංකය වෙනස් කරන්න',
    yourTurn: 'ඔබගේ වාරය පැමිණ ඇත',
    yourTurnNear: 'ඔබගේ වාරය ආසන්නයි',
    queueUpdate: 'පෝලිමේ යාවත්කාලීන කිරීම්',
    pleaseProceedTo: 'කරුණාකර මෙතැනට යන්න:',
    viewDirections: 'මඟ පෙන්වීම් බලන්න',
    dismiss: 'ඉවත් කරන්න',
    numbersRemaining: 'අංක ඉතිරිව ඇත.',
    opdReturnMessage: 'කරුණාකර වහාම OPD රැඳී සිටින ස්ථානයට පැමිණෙන්න.',
    queueUpdateDefaultMsg: 'ඔබගේ වාරයට පෙර තවත් රෝගීන් 10 දෙනෙකු සිටී. අපේක්ෂිත වේලාව විනාඩි 35 කි.',
    currentServingText: 'දැන් කැඳවන්නේ:',
    aheadText: 'ඔබට ඉදිරියෙන්',
  },
  Tamil: {
    appTitle: 'மெடிகியூ',
    home: 'முகப்பு',
    myQueueHeader: 'என் வரிசை',
    alertsHeader: 'அறிவிப்புகள்',
    goodMorning: 'காலை வணக்கம்',
    nicVerified: 'அடையாள அட்டை சரிபார்க்கப்பட்டது',
    yourToken: 'உங்கள் டோக்கன்',
    nowServing: 'தற்போது அழைக்கப்படுவது',
    aheadOfYou: 'உங்களுக்கு முன்னால்',
    estimatedWait: 'எதிர்பார்க்கப்படும் நேரம்:',
    queueMovingSteadily: 'வரிசை சீராக இயங்குகிறது',
    noActiveQueue: 'செயலில் உள்ள டோக்கன்கள் இல்லை.',
    viewLiveQueue: 'நேரலை வரிசையைக் காண்க',
    getNewToken: 'புதிய டோக்கன் பெறுக',
    liveQueueTitle: 'நேரலை வரிசை',
    yourTokenNumber: 'உங்கள் டோக்கன் எண்',
    doctorWithPatient: 'மருத்துவர் நோயாளியை பரிசோதிக்கிறார்',
    estWaitTime: 'எதிர்பார்க்கப்படும் காத்திருப்பு',
    queueProgress: 'வரிசை நிலை',
    statusCurrent: 'தற்போது',
    statusYou: 'நீங்கள்',
    queueStatusMoving: 'நிலை: வரிசை இயங்குகிறது',
    olderNotifications: 'பழைய அறிவிப்புகள்',
    noOlderNotifications: 'பழைய அறிவிப்புகள் இல்லை',
    profileHeader: 'சுயவிவரம்',
    patientProfile: 'நோயாளி சுயவிவரம்',
    profileSubtitle: 'அடையாளம், விழிப்பூட்டல்கள் மற்றும் மொழி அமைப்புகளை நிர்வகிக்கவும்',
    verifiedNic: 'உறுதிப்படுத்தப்பட்ட NIC',
    appSettings: 'செயலி அமைப்புகள்',
    general: 'பொதுவானவை',
    language: 'மொழி',
    languageSubtitle: 'சிங்களம், தமிழ் மற்றும் ஆங்கிலம்',
    notifications: 'அறிவிப்பு விருப்பத்தேர்வுகள்',
    notificationsSubtitle: 'மருந்து மற்றும் பணி விழிப்பூட்டல்கள்',
    accessibility: 'அணுகல்தன்மை & எழுத்து அளவு',
    accessibilitySubtitle: 'காட்சி அளவு, உயர் மாறுபாடு',
    privacy: 'தனியுரிமை & பாதுகாப்பு',
    privacySubtitle: 'PIN, பயோமெட்ரிக் பூட்டு',
    logOut: 'வெளியேறு',
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    queueAlerts: 'வரிசை & பணி விழிப்பூட்டல்கள்',
    queueAlertsSubtitle: 'உடனடி அறிவிப்புகளைப் பெறுங்கள்',
    savePreferences: 'விருப்பங்களைச் சேமிக்கவும்',
    textSizeDisplay: 'எழுத்து அளவு & காட்சி',
    smallText: 'சிறிய எழுத்து (Small)',
    mediumText: 'நடுத்தர எழுத்து (Medium)',
    largeText: 'பெரிய எழுத்து (Large)',
    biometricUnlock: 'பயோமெட்ரிக் திறப்பு',
    biometricSubtitle: 'Face ID / கைரேகையைப் பயன்படுத்தவும்',
    changePin: 'PIN ஐ மாற்றவும்',
    yourTurn: 'உங்கள் முறை',
    yourTurnNear: 'உங்கள் முறை அருகில் உள்ளது',
    queueUpdate: 'வரிசை புதுப்பிப்பு',
    pleaseProceedTo: 'தயவுசெய்து செல்லவும்:',
    viewDirections: 'திசைகளைக் காண்க',
    dismiss: 'நிராகரி',
    numbersRemaining: 'எண்கள் மீதம் உள்ளன.',
    opdReturnMessage: 'தயவுசெய்து உடனடியாக OPD காத்திருக்கும் இடத்திற்குத் திரும்பவும்.',
    queueUpdateDefaultMsg: 'உங்கள் முறைக்கு முன் 10 நோயாளிகள் உள்ளனர். எதிர்பார்க்கப்படும் நேரம் ~35 நிமிடங்கள்.',
    currentServingText: 'தற்போது அழைக்கப்படுவது:',
    aheadText: 'முன்னால்',
  },
};

export const SettingsProvider = ({ children }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [textSize, setTextSize] = useState('Medium');

  // App eka load weddi profile data genalla settings set kirima
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.get('/patient/profile');
        const data = res.data?.data || res.data;
        if (data?.language) setSelectedLanguage(data.language);
        if (data?.textSize) setTextSize(data.textSize);
      } catch (error) {
        console.log('Settings fetch error:', error.message);
      }
    };
    fetchSettings();
  }, []);

  // Text size ekata anuwah size eka calculate karana helper
  const getFontSize = (baseSize) => {
    let scale = 1;
    if (textSize === 'Small') scale = 0.88;
    if (textSize === 'Large') scale = 1.18;
    return baseSize * scale;
  };

  // Language update karala backend ekata yawana function
  const updateLanguage = async (lang) => {
    setSelectedLanguage(lang);
    try {
      await API.patch('/patient/profile', { language: lang });
    } catch (error) {
      console.log('Language save error:', error.message);
    }
  };

  // TextSize update karala backend ekata yawana function
  const updateTextSize = async (size) => {
    setTextSize(size);
    try {
      await API.patch('/patient/profile', { textSize: size });
    } catch (error) {
      console.log('Text size save error:', error.message);
    }
  };

  const t = translations[selectedLanguage] || translations.English;

  return (
    <SettingsContext.Provider
      value={{
        selectedLanguage,
        textSize,
        getFontSize,
        updateLanguage,
        updateTextSize,
        t,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);