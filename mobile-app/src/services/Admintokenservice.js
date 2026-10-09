import api from './api';

export { getErrorMessage } from './adminNotificationService';

// queueDate = 'YYYY-MM-DD'
export const getTokenOverview = (queueDate) =>
  api.get('/admin/tokens/overview', { params: { queueDate } }).then((r) => r.data);

// params: { queueDate, opdId, status, search, page, limit }
export const getAdminTokens = (params = {}) =>
  api.get('/admin/tokens', { params }).then((r) => r.data);

export const getAdminToken = (tokenId) =>
  api.get(`/admin/tokens/${tokenId}`).then((r) => r.data);