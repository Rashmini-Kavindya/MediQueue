// Shared constants for the Templates tab + form

export const TYPES = [
  {
    key: 'booked',
    label: 'Token booked',
    hint: 'Sent when a patient books a token',
    placeholders: ['tokenNo', 'opdName'],
  },
  {
    key: 'near',
    label: 'Turn approaching',
    hint: "Sent when patients ahead reaches the patient's alert threshold",
    placeholders: ['tokenNo', 'patientsAhead'],
  },
  {
    key: 'called',
    label: 'Your turn',
    hint: 'Sent when the token is called',
    placeholders: ['tokenNo', 'room'],
  },
  {
    key: 'update',
    label: 'Status update',
    hint: 'General status updates',
    placeholders: ['tokenNo'],
  },
];

export const LANGS = [
  { key: 'en', label: 'English', short: 'EN' },
  { key: 'si', label: 'Sinhala', short: 'SI' },
  { key: 'ta', label: 'Tamil', short: 'TA' },
];

const SAMPLE = {
  tokenNo: 'A025',
  patientsAhead: 3,
  room: 'Room 4',
  opdName: 'General OPD',
};

// Same replacement rule as the backend: unknown placeholders become empty
export const renderPreview = (body = '') =>
  body.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    SAMPLE[key] !== undefined ? String(SAMPLE[key]) : ''
  );