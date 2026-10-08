import AsyncStorage
  from '@react-native-async-storage/async-storage';

import api from './api';


// ======================================================
// AUTH CONFIG
// ======================================================

const getAuthConfig = async () => {
  const token =
    await AsyncStorage.getItem(
      'token'
    );

  return {
    headers: {
      Authorization:
        `Bearer ${token}`
    }
  };
};


// ======================================================
// PATIENT NAME SUGGESTIONS
// ======================================================

export const getPatientSuggestions =
  async (name) => {
    const config =
      await getAuthConfig();


    const response =
      await api.get(
        '/links/patient-suggestions',

        {
          ...config,

          params: {
            name
          }
        }
      );


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
  const config =
    await getAuthConfig();


  const response =
    await api.get(
      '/links/search-patient',

      {
        ...config,

        params: {
          name,
          patientIdentifier,
          phone
        }
      }
    );


  return response.data;
};


// ======================================================
// GET LINKED PATIENTS
// ======================================================

export const getLinkedPatients =
  async () => {
    const config =
      await getAuthConfig();


    const response =
      await api.get(
        '/links',
        config
      );


    return response.data;
  };


// ======================================================
// LINK PATIENT
// ======================================================

export const linkPatient =
  async (data) => {
    const config =
      await getAuthConfig();


    const response =
      await api.post(
        '/links',
        data,
        config
      );


    return response.data;
  };


// ======================================================
// LINKED PATIENT STATUS
// ======================================================

export const getLinkedPatientStatus =
  async (linkId) => {
    const config =
      await getAuthConfig();


    const response =
      await api.get(
        `/links/${linkId}/status`,
        config
      );


    return response.data;
  };


// ======================================================
// LINKED PATIENT NOTIFICATIONS
// ======================================================

export const getLinkedPatientNotifications =
  async (linkId) => {
    const config =
      await getAuthConfig();


    const response =
      await api.get(
        `/links/${linkId}/notifications`,
        config
      );


    return response.data;
  };


// ======================================================
// UPDATE RELATIONSHIP
// ======================================================

export const updateRelationship =
  async (
    linkId,
    data
  ) => {
    const config =
      await getAuthConfig();


    const response =
      await api.put(
        `/links/${linkId}`,
        data,
        config
      );


    return response.data;
  };


// ======================================================
// UNLINK PATIENT
// ======================================================

export const unlinkPatient =
  async (linkId) => {
    const config =
      await getAuthConfig();


    const response =
      await api.delete(
        `/links/${linkId}`,
        config
      );


    return response.data;
  };


// ======================================================
// PROFILE
// ======================================================

export const getProfile =
  async () => {
    const config =
      await getAuthConfig();


    const response =
      await api.get(
        '/users/me',
        config
      );


    return response.data;
  };


export const updateProfile =
  async (data) => {
    const config =
      await getAuthConfig();


    const response =
      await api.put(
        '/users/me',
        data,
        config
      );


    return response.data;
  };


// ======================================================
// USER PREFERENCES
// ======================================================

export const getUserPreferences =
  async () => {
    const config =
      await getAuthConfig();


    const response =
      await api.get(
        '/users/me/preferences',
        config
      );


    return response.data;
  };


export const updateUserPreferences =
  async (data) => {
    const config =
      await getAuthConfig();


    const response =
      await api.put(
        '/users/me/preferences',
        data,
        config
      );


    return response.data;
  };


// ======================================================
// WAITING AREAS
// ======================================================

export const getWaitingAreas =
  async () => {
    const config =
      await getAuthConfig();


    const response =
      await api.get(
        '/waiting-areas',
        config
      );


    return response.data;
  };


// ======================================================
// ALERT PREFERENCES
// ======================================================

export const getAlertPreferences =
  async () => {
    const config =
      await getAuthConfig();


    const response =
      await api.get(
        '/alert-preferences',
        config
      );


    return response.data;
  };


export const updateAlertPreferences =
  async (data) => {
    const config =
      await getAuthConfig();


    const response =
      await api.put(
        '/alert-preferences',
        data,
        config
      );


    return response.data;
  };