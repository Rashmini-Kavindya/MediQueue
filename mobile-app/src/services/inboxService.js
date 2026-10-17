import api from './api';

// "My notifications" = the logged-in user's own inbox (works for any role)
// getMyNotifications resolves to { success, data, unreadCount }

export { getErrorMessage } from './adminNotificationService';

export const getMyNotifications = (params = {}) =>
  api.get('/notifications', { params }).then((r) => r.data);

export const markNotificationRead = (id) =>
  api.put(`/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsRead = () =>
  api.put('/notifications/read-all').then((r) => r.data);

export const deleteMyNotification = (id) =>
  api.delete(`/notifications/${id}`).then((r) => r.data);