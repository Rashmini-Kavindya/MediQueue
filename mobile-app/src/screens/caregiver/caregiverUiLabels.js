// Caregiver-owned labels. Reacts to the existing i18next language selection.
// Other screens must import these labels or their own translation keys.
const caregiverUiLabels = {
  en: {
    home:'Home', queue:'Queue', alerts:'Alerts', profile:'Profile',
    welcomeBack:'WELCOME BACK', hello:'Hello, ', updated:'Updated just now', activePatients:'Active Patients',active:'Active',
    addPatient:'Add Patient',addPatientCaps:'ADD PATIENT',addPatientHint:'Track another appointment or prescription',
    waiting:'Waiting',verified:'Verified', token:'TOKEN',inLine:'IN LINE',ahead:'ahead',estimatedWait:'EST. WAIT',viewLiveQueue:'View Live Queue',
    noActiveQueue:'No active queue for this patient',noLinks:'Unable to load linked patients.',
    caregiverAlerts:'Caregiver Alerts',alertsSubtitle:'Your account updates and queue notifications for linked patients',
    all:'All', updates:'Updates',noAlerts:'No alerts yet', alertsEmpty:'Your caregiver updates and linked patient queue alerts will appear here.',
    queueEmpty:'No queue alerts are available.', updatesEmpty:'No updates alerts are available.', loadingAlertsError:'Some alerts could not be loaded. Try again later.',
    turnNear:'Your Turn is Near',patientCalled:'Patient Called',queueUpdate:'Queue Update',accountUpdate:'Account Update',patientLabel:'Patient: '
  },
  si: {
    home:'මුල් පිටුව',queue:'පෝලිම',alerts:'දැනුම්දීම්',profile:'පැතිකඩ',
    welcomeBack:'නැවත සාදරයෙන් පිළිගනිමු',hello:'ආයුබෝවන්, ',updated:'දැන් යාවත්කාලීන කරන ලදී',activePatients:'සක්‍රීය රෝගීන්',active:'සක්‍රීය',
    addPatient:'රෝගියෙකු එක් කරන්න',addPatientCaps:'රෝගියෙකු එක් කරන්න',addPatientHint:'වෙනත් හමුවීමක් හෝ බෙහෙත් වට්ටෝරුවක් නිරීක්ෂණය කරන්න',
    waiting:'රැඳී සිටී',verified:'තහවුරු කරන ලදී',token:'අංකය',inLine:'පෝලිමේ',ahead:'ඉදිරියෙන්',estimatedWait:'ඇස්තමේන්තු කාලය',viewLiveQueue:'සජීවී පෝලිම බලන්න',
    noActiveQueue:'මෙම රෝගියාට සක්‍රීය පෝලිමක් නොමැත',noLinks:'සම්බන්ධ කළ රෝගීන් පෙන්විය නොහැක.',
    caregiverAlerts:'රැකබලා ගන්නාගේ දැනුම්දීම්',alertsSubtitle:'ඔබේ ගිණුම සහ සම්බන්ධිත රෝගීන්ගේ පෝලිම් දැනුම්දීම්',
    all:'සියල්ල',updates:'යාවත්කාලීන',noAlerts:'දැනුම්දීම් නොමැත',alertsEmpty:'ඔබගේ ගිණුම සහ රෝගීන්ගේ පෝලිම් දැනුම්දීම් මෙහි දිස්වේ.',
    queueEmpty:'පෝලිම් දැනුම්දීම් නොමැත.',updatesEmpty:'යාවත්කාලීන දැනුම්දීම් නොමැත.',loadingAlertsError:'සමහර දැනුම්දීම් ලබාගත නොහැකි විය. නැවත උත්සාහ කරන්න.',
    turnNear:'ඔබගේ වාරය ළඟයි',patientCalled:'රෝගියා කැඳවන ලදී',queueUpdate:'පෝලිම් යාවත්කාලීන',accountUpdate:'ගිණුම් යාවත්කාලීන',patientLabel:'රෝගියා: '
  },
  ta: {
    home:'முகப்பு',queue:'வரிசை',alerts:'அறிவிப்புகள்',profile:'சுயவிவரம்',
    welcomeBack:'மீண்டும் வரவேற்கிறோம்',hello:'வணக்கம், ',updated:'இப்போது புதுப்பிக்கப்பட்டது',activePatients:'செயலில் உள்ள நோயாளிகள்',active:'செயலில்',
    addPatient:'நோயாளியைச் சேர்',addPatientCaps:'நோயாளியைச் சேர்',addPatientHint:'மற்றொரு சந்திப்பு அல்லது மருந்துச் சீட்டைக் கண்காணிக்கவும்',
    waiting:'காத்திருக்கிறார்',verified:'சரிபார்க்கப்பட்டது',token:'டோக்கன்',inLine:'வரிசையில்',ahead:'முன்னால்',estimatedWait:'காத்திருக்கும் நேரம்',viewLiveQueue:'நேரடி வரிசையைக் காண்க',
    noActiveQueue:'இந்த நோயாளிக்குச் செயலில் வரிசை இல்லை',noLinks:'இணைக்கப்பட்ட நோயாளிகளை ஏற்ற முடியவில்லை.',
    caregiverAlerts:'பராமரிப்பாளர் அறிவிப்புகள்',alertsSubtitle:'உங்கள் கணக்கு மற்றும் இணைக்கப்பட்ட நோயாளிகளின் வரிசை அறிவிப்புகள்',
    all:'அனைத்தும்',updates:'புதுப்பிப்புகள்',noAlerts:'அறிவிப்புகள் இல்லை',alertsEmpty:'உங்கள் கணக்கு மற்றும் நோயாளி வரிசை அறிவிப்புகள் இங்கே தோன்றும்.',
    queueEmpty:'வரிசை அறிவிப்புகள் இல்லை.',updatesEmpty:'புதுப்பிப்பு அறிவிப்புகள் இல்லை.',loadingAlertsError:'சில அறிவிப்புகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    turnNear:'உங்கள் முறை நெருங்குகிறது',patientCalled:'நோயாளி அழைக்கப்பட்டார்',queueUpdate:'வரிசை புதுப்பிப்பு',accountUpdate:'கணக்கு புதுப்பிப்பு',patientLabel:'நோயாளி: '
  }
};
export default caregiverUiLabels;
