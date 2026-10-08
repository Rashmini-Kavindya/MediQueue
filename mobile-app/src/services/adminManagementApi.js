import api from './api';

// Existing shared api.js provides the JWT from AsyncStorage.
// Both modules require role=admin; authorization is enforced in backend routes.
export const listWaitingAreasAdmin = async () =>
  (await api.get('/waiting-areas/admin/all')).data;
export const createWaitingAreaAdmin = async (payload) =>
  (await api.post('/waiting-areas', payload)).data;
export const updateWaitingAreaAdmin = async (id, payload) =>
  (await api.put(`/waiting-areas/${encodeURIComponent(id)}`, payload)).data;
export const deleteWaitingAreaAdmin = async (id) =>
  (await api.delete(`/waiting-areas/${encodeURIComponent(id)}`)).data;

export const listUsersAdmin = async (params = {}) =>
  (await api.get('/admin/users', { params })).data;
export const getUserAdmin = async (id) =>
  (await api.get(`/admin/users/${encodeURIComponent(id)}`)).data;
export const addStaffAdmin = async (payload) =>
  (await api.post('/admin/users', payload)).data;
export const updateUserAdmin = async (id, payload) =>
  (await api.put(`/admin/users/${encodeURIComponent(id)}`, payload)).data;
export const deactivateUserAdmin = async (id) =>
  (await api.delete(`/admin/users/${encodeURIComponent(id)}`)).data;
// Deliberately restricted by backend to unused, admin-provisioned staff test accounts.
export const permanentlyDeleteStaffAdmin = async (id) =>
  (await api.delete(`/admin/users/${encodeURIComponent(id)}/permanent`)).data;
