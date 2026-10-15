import api from './api';

// The shared API client attaches the current JWT. All admin endpoints are admin-protected.
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

// Supports role patient, staff, or admin. Doctors belong to the separate Doctor module.
export const addUserAdmin = async (payload) =>
  (await api.post('/admin/users', payload)).data;

// Backwards compatibility: existing imports elsewhere can still create staff.
export const addStaffAdmin = async (payload) =>
  addUserAdmin({ ...payload, role: 'staff' });

export const updateUserAdmin = async (id, payload) =>
  (await api.put(`/admin/users/${encodeURIComponent(id)}`, payload)).data;
export const deactivateUserAdmin = async (id) =>
  (await api.delete(`/admin/users/${encodeURIComponent(id)}`)).data;

// This endpoint remains staff-only and subject to hospital-record checks.
export const permanentlyDeleteStaffAdmin = async (id) =>
  (await api.delete(`/admin/users/${encodeURIComponent(id)}/permanent`)).data;
