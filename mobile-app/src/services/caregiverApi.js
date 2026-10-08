import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// ======================================================
// AUTH CONFIG
// ======================================================
const getAuthConfig = async () => {
  const token = await AsyncStorage.getItem('token');

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// ======================================================
// PATIENT NAME SUGGESTIONS
// ======================================================
export const getPatientSuggestions = async (name) => {
  const config = await getAuthConfig();
  const response = await api.get('/links/patient-suggestions', {
    ...config,
    params: { name }
  });
  return response.data;
};

// ======================================================
// SEARCH PATIENT
// ======================================================
export const searchPatient = async ({
  name = '',
  patientIdentifier = '',
  phone = ''
}) => {
  const config = await getAuthConfig();
  const response = await api.get('/links/search-patient', {
    ...config,
    params: { name, patientIdentifier, phone }
  });
  return response.data;
};

// ======================================================
// GET LINKED PATIENTS
// ======================================================
export const getLinkedPatients = async () => {
  const config = await getAuthConfig();
  const response = await api.get('/links', config);
  return response.data;
};

// ======================================================
// LINK PATIENT (LEGACY)
// POST /api/links now rejects direct linking by design.
// Kept so imports elsewhere in the app do not break.
// New caregiver linking uses OTP functions below.
// ======================================================
export const linkPatient = async (data) => {
  const config = await getAuthConfig();
  const response = await api.post('/links', data, config);
  return response.data;
};

// ======================================================
// START PATIENT CONSENT VERIFICATION
// POST /api/links/verification/start
// ======================================================
export const startCaregiverLinkVerification = async ({
  patientId,
  phone,
  relationship = 'Caregiver'
}) => {
  const config = await getAuthConfig();
  const response = await api.post(
    '/links/verification/start',
    { patientId, phone, relationship },
    config
  );
  return response.data;
};

// ======================================================
// VERIFY PATIENT CONSENT OTP
// POST /api/links/verification/verify
// ======================================================
export const verifyCaregiverLinkOtp = async ({
  verificationId,
  otp
}) => {
  const config = await getAuthConfig();
  const response = await api.post(
    '/links/verification/verify',
    { verificationId, otp },
    config
  );
  return response.data;
};

// ======================================================
// LINKED PATIENT STATUS
// ======================================================
export const getLinkedPatientStatus = async (linkId) => {
  const config = await getAuthConfig();
  const response = await api.get(`/links/${linkId}/status`, config);
  return response.data;
};

// ======================================================
// LINKED PATIENT NOTIFICATIONS
// ======================================================
export const getLinkedPatientNotifications = async (linkId) => {
  const config = await getAuthConfig();
  const response = await api.get(`/links/${linkId}/notifications`, config);
  return response.data;
};

// ======================================================
// UPDATE RELATIONSHIP
// ======================================================
export const updateRelationship = async (linkId, data) => {
  const config = await getAuthConfig();
  const response = await api.put(`/links/${linkId}`, data, config);
  return response.data;
};

// ======================================================
// UNLINK PATIENT
// ======================================================
export const unlinkPatient = async (linkId) => {
  const config = await getAuthConfig();
  const response = await api.delete(`/links/${linkId}`, config);
  return response.data;
};

// ======================================================
// PROFILE
// ======================================================
export const getProfile = async () => {
  const config = await getAuthConfig();
  const response = await api.get('/users/me', config);
  return response.data;
};

export const updateProfile = async (data) => {
  const config = await getAuthConfig();
  const response = await api.put('/users/me', data, config);
  return response.data;
};

// ======================================================
// USER PREFERENCES
// ======================================================
export const getUserPreferences = async () => {
  const config = await getAuthConfig();
  const response = await api.get('/users/me/preferences', config);
  return response.data;
};

export const updateUserPreferences = async (data) => {
  const config = await getAuthConfig();
  const response = await api.put('/users/me/preferences', data, config);
  return response.data;
};

// ======================================================
// WAITING AREAS
// ======================================================
export const getWaitingAreas = async () => {
  const config = await getAuthConfig();
  const response = await api.get('/waiting-areas', config);
  return response.data;
};

// ======================================================
// ALERT PREFERENCES
// ======================================================
export const getAlertPreferences = async () => {
  const config = await getAuthConfig();
  const response = await api.get('/alert-preferences', config);
  return response.data;
};

export const updateAlertPreferences = async (data) => {
  const config = await getAuthConfig();
  const response = await api.put('/alert-preferences', data, config);
  return response.data;
};

// ======================================================
// CAREGIVER'S OWN NOTIFICATIONS
// The shared endpoint reads req.user.userId from the JWT.
// ======================================================
export const getMyNotifications = async () => {
  const config = await getAuthConfig();
  const response = await api.get('/notifications', config);
  return response.data;
};

// ======================================================
// CAREGIVER PROFILE SETTINGS (caregiver-owned endpoints)
// ======================================================
export const getCaregiverProfileSettings = async () => {
  const response = await api.get('/links/account', await getAuthConfig());
  return response.data;
};
export const updateCaregiverName = async ({ firstName, lastName }) => {
  const response = await api.put('/links/account/name',
    { firstName, lastName }, await getAuthConfig());
  return response.data;
};
export const saveCaregiverPhotoUrl = async (photoUrl) => {
  const response = await api.put('/links/account/photo',
    { photoUrl }, await getAuthConfig());
  return response.data;
};
export const startCaregiverPhoneChange = async (phone) => {
  const response = await api.post('/links/account/phone/start',
    { phone }, await getAuthConfig());
  return response.data;
};
export const verifyCaregiverPhoneChange = async (otp) => {
  const response = await api.post('/links/account/phone/verify',
    { otp }, await getAuthConfig());
  return response.data;
};

export const deactivateMyAccount = async () => {
  const response = await api.delete(
    '/users/me',
    await getAuthConfig()
  );

  return response.data;
};