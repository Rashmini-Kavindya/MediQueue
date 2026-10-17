// Shared constants + helpers for the Token Management screens

export const STATUS_META = {
  waiting: { label: 'Waiting', bg: 'bg-slate-100', text: 'text-slate-600', color: '#64748B', icon: 'time-outline' },
  called: { label: 'Called', bg: 'bg-sky-50', text: 'text-sky-700', color: '#0284C7', icon: 'megaphone-outline' },
  'in-consultation': { label: 'In consultation', bg: 'bg-sky-600', text: 'text-white', color: '#0284C7', icon: 'medkit-outline' },
  hold: { label: 'On hold', bg: 'bg-slate-900', text: 'text-white', color: '#0F172A', icon: 'pause-circle-outline' },
  skipped: { label: 'Skipped', bg: 'bg-red-50', text: 'text-red-600', color: '#EF4444', icon: 'play-skip-forward-outline' },
  completed: { label: 'Completed', bg: 'bg-slate-100', text: 'text-slate-500', color: '#94A3B8', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600', color: '#EF4444', icon: 'close-circle-outline' },
};

// key '' means "all"; 'active' is handled by the backend
export const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: '', label: 'All', countKey: 'all' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'called', label: 'Called' },
  { key: 'in-consultation', label: 'In consultation' },
  { key: 'hold', label: 'On hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'skipped', label: 'Skipped' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ---- dates (queueDate is a plain 'YYYY-MM-DD' string) ----
const toDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayLocal = () => toDateString(new Date());

export const shiftDate = (dateString, days) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return toDateString(new Date(y, m - 1, d + days));
};

export const dateLabel = (dateString) => {
  const today = todayLocal();
  if (dateString === today) return 'Today';
  if (dateString === shiftDate(today, -1)) return 'Yesterday';
  if (dateString === shiftDate(today, 1)) return 'Tomorrow';

  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// ---- times ----
export const formatClock = (value) =>
  value ? new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

export const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatClock(value)}`;
};

export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
};