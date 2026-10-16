import api from './api';

// Every function returns the backend body: { success, data, pagination?, message? }

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

// ---- Notifications ----
export const getStats = () =>
  api.get('/admin/notifications/stats').then((r) => r.data);

export const getNotifications = (params = {}) =>
  api.get('/admin/notifications', { params }).then((r) => r.data);

export const getNotification = (id) =>
  api.get(`/admin/notifications/${id}`).then((r) => r.data);

// payload: { userId | role, title?, message }
export const createNotification = (payload) =>
  api.post('/admin/notifications', payload).then((r) => r.data);

// payload: { title?, message?, isRead? }
export const updateNotification = (id, payload) =>
  api.put(`/admin/notifications/${id}`, payload).then((r) => r.data);

export const deleteNotification = (id) =>
  api.delete(`/admin/notifications/${id}`).then((r) => r.data);

// ---- Logs ----
// params: { status, channel, from, to, page, limit }
export const getLogs = (params = {}) =>
  api.get('/notification-logs', { params }).then((r) => r.data);

// ---- Templates ----
export const getTemplates = () =>
  api.get('/templates').then((r) => r.data);

// payload: { type, language, body, status? }
export const createTemplate = (payload) =>
  api.post('/templates', payload).then((r) => r.data);

export const updateTemplate = (id, payload) =>
  api.put(`/templates/${id}`, payload).then((r) => r.data);

export const deleteTemplate = (id) =>
  api.delete(`/templates/${id}`).then((r) => r.data);

// ---- Alert preferences (admin) ----
// params: { language, channel, search, page, limit }
export const getAlertPreferences = (params = {}) =>
  api.get('/admin/alert-preferences', { params }).then((r) => r.data);

// userId = the patient's userId; payload: { threshold?, channels?, language? }
export const updateAlertPreference = (userId, payload) =>
  api.put(`/admin/alert-preferences/${userId}`, payload).then((r) => r.data);

export const deleteAlertPreference = (userId) =>
  api.delete(`/admin/alert-preferences/${userId}`).then((r) => r.data);