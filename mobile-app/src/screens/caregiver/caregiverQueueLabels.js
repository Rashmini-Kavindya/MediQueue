const caregiverQueueLabels = {
  en: {
    title: 'PATIENT QUEUE', emptyTitle: 'No Active Queue',
    emptyText: 'Your linked patient does not currently have an active queue token.',
    opd: 'OPD', tokenNumber: 'YOUR TOKEN NUMBER', nowServing: 'NOW SERVING',
    ahead: 'PATIENTS AHEAD', wait: 'ESTIMATED WAIT TIME', minutes: 'MIN',
    progressing: 'Queue progressing', normal: 'QUEUE IS MOVING NORMALLY',
    remaining: (n) => `${n} Numbers Remaining`,
    alertHint: (n) => `Get alert when you are ${n} patient(s) away from your turn`,
    dental:'Dental Clinic', general:'General Medicine',
  },
  si: {
    title: 'රෝගී පෝලිම', emptyTitle: 'සක්‍රීය පෝලිමක් නොමැත',
    emptyText: 'සම්බන්ධ කළ රෝගියාට දැනට සක්‍රීය පෝලිම් අංකයක් නොමැත.',
    opd: 'බාහිර රෝගී අංශය', tokenNumber: 'ඔබගේ පෝලිම් අංකය', nowServing: 'දැන් සේවය ලබන අංකය',
    ahead: 'ඉදිරියේ සිටින රෝගීන්', wait: 'ඇස්තමේන්තුගත පොරොත්තු කාලය', minutes: 'මිනිත්තු',
    progressing: 'පෝලිම ඉදිරියට යමින් පවතී', normal: 'පෝලිම සාමාන්‍ය ලෙස ක්‍රියාත්මක වේ',
    remaining: (n) => `තවත් අංක ${n}ක් ඉතිරිව ඇත`,
    alertHint: (n) => `ඔබගේ වාරයට රෝගීන් ${n}ක් ඉතිරි වන විට දැනුම් දෙන්න`,
    dental:'දන්ත වෛද්‍ය සායනය', general:'සාමාන්‍ය වෛද්‍ය අංශය',
  },
  ta: {
    title: 'நோயாளி வரிசை', emptyTitle: 'செயலில் உள்ள வரிசை இல்லை',
    emptyText: 'இணைக்கப்பட்ட நோயாளிக்கு தற்போது செயலில் உள்ள வரிசை எண் இல்லை.',
    opd: 'வெளிநோயாளர் பிரிவு', tokenNumber: 'உங்கள் டோக்கன் எண்', nowServing: 'தற்போது அழைக்கப்படும் எண்',
    ahead: 'முன்னால் உள்ள நோயாளிகள்', wait: 'மதிப்பிடப்பட்ட காத்திருப்பு நேரம்', minutes: 'நிமிடம்',
    progressing: 'வரிசை முன்னேறுகிறது', normal: 'வரிசை வழக்கமாக நகர்கிறது',
    remaining: (n) => `இன்னும் ${n} எண்கள் உள்ளன`,
    alertHint: (n) => `உங்கள் முறைக்கு முன் ${n} நோயாளிகள் இருக்கும்போது அறிவிக்கவும்`,
    dental:'பல் மருத்துவப் பிரிவு', general:'பொது மருத்துவம்',
  }
};

export const getLocalizedOpdName = (name, language) => {
  const raw = String(name || '');
  const L = caregiverQueueLabels[language] || caregiverQueueLabels.en;
  // Unknown/custom OPDs stay exactly as supplied by the backend.
  if (/dental/i.test(raw)) return L.dental;
  if (/general\s*medicine/i.test(raw)) return L.general;
  return raw;
};

export default caregiverQueueLabels;
