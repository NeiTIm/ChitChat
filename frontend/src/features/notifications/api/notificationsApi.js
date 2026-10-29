import { apiClient } from '../../../shared/api/apiClient'

/**
 * HTTP operations for this feature.
 * Keep endpoint paths and HTTP methods here, outside React components.
 * Functions return the Axios response to preserve existing callers.
 */
export const notificationsApi = {
  getConversationsByIdSettings: (p0, config) => apiClient.get(`/conversations/${p0}/settings`, config),
  patchConversationsByIdSettings: (p0, data, config) => apiClient.patch(`/conversations/${p0}/settings`, data, config),
  getNotifications: (config) => apiClient.get("/notifications", config),
  getNotificationsUnreadCount: (config) => apiClient.get("/notifications/unread-count", config),
  postNotificationsReadAll: (data, config) => apiClient.post("/notifications/read-all", data, config),
  patchNotificationsByIdRead: (p0, data, config) => apiClient.patch(`/notifications/${p0}/read`, data, config),
}
