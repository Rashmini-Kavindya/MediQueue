import { Alert, Platform } from 'react-native';

export const TYPE_LABELS = {
  booked: 'Token booked',
  near: 'Turn approaching',
  called: 'Your turn',
  update: 'Update',
  QUEUE_UPDATE: 'Queue update',
  YOUR_TURN: 'Your turn',
  TURN_NEAR: 'Turn approaching',
};

export const TYPE_ICONS = {
  booked: 'ticket-outline',
  near: 'time-outline',
  called: 'megaphone-outline',
  update: 'notifications-outline',
  QUEUE_UPDATE: 'swap-vertical-outline',
  YOUR_TURN: 'megaphone-outline',
  TURN_NEAR: 'time-outline',
};

// Must match the role values stored on your User model.
// Add / remove roles here if your project uses different names.
export const ROLES = [
  { key: 'patient', label: 'Patients' },
  { key: 'staff', label: 'Staff' },
  { key: 'caregiver', label: 'Caregivers' },
];

export const formatTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
};

export const showNotice = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// Alert.alert has no button support on web, so fall back to window.confirm
export const confirmAction = (title, message, confirmLabel, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

export const AUDIENCE_ALL = { key: 'all', label: 'Everyone' };

// 'all' -> Everyone, 'role:patient' -> Patients, 'user' / empty -> ''
export const formatAudience = (audience) => {
  if (!audience || audience === 'user') return '';
  if (audience === 'all') return 'Everyone';
  const key = audience.replace('role:', '');
  const role = ROLES.find((r) => r.key === key);
  return role ? role.label : key;
};