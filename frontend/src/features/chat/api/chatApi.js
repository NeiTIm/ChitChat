import { apiClient } from '../../../shared/api/apiClient'

/**
 * HTTP operations for this feature.
 * Keep endpoint paths and HTTP methods here, outside React components.
 * Functions return the Axios response to preserve existing callers.
 */
export const chatApi = {
  getConversationsByIdMessages: (p0, config) => apiClient.get(`/conversations/${p0}/messages`, config),
  postConversationsByIdDeliveryAcks: (p0, data, config) => apiClient.post(`/conversations/${p0}/delivery-acks`, data, config),
  putConversationsByIdReadCursor: (p0, data, config) => apiClient.put(`/conversations/${p0}/read-cursor`, data, config),
  getUsersMe: (config) => apiClient.get("/users/me", config),
  getConversations: (config) => apiClient.get("/conversations", config),
  getConversationsById: (p0, config) => apiClient.get(`/conversations/${p0}`, config),
  getUsersById: (p0, config) => apiClient.get(`/users/${p0}`, config),
  getUsersByIdPresence: (p0, config) => apiClient.get(`/users/${p0}/presence`, config),
  postFiles: (data, config) => apiClient.post("/files", data, config),
  postConversationsByIdMessages: (p0, data, config) => apiClient.post(`/conversations/${p0}/messages`, data, config),
  patchMessagesById: (p0, data, config) => apiClient.patch(`/messages/${p0}`, data, config),
  postMessagesByIdRecall: (p0, data, config) => apiClient.post(`/messages/${p0}/recall`, data, config),
  putMessagesByIdReaction: (p0, data, config) => apiClient.put(`/messages/${p0}/reaction`, data, config),
  deleteMessagesByIdForMe: (p0, config) => apiClient.delete(`/messages/${p0}/for-me`, config),
  getGroups: (config) => apiClient.get("/groups", config),
  postMessagesByIdForward: (p0, data, config) => apiClient.post(`/messages/${p0}/forward`, data, config),
  getFilesByIdPreview: (p0, config) => apiClient.get(`/files/${p0}/preview`, config),
  getFilesByIdDownload: (p0, config) => apiClient.get(`/files/${p0}/download`, config),
  getMessageRequests: (config) => apiClient.get("/message-requests", config),
  putMessageRequestsByIdReadCursor: (p0, data, config) => apiClient.put(`/message-requests/${p0}/read-cursor`, data, config),
  postMessageRequestsByIdById: (p0, p1, data, config) => apiClient.post(`/message-requests/${p0}/${p1}`, data, config),
  getConversationsByIdMessagesSearch: (p0, config) => apiClient.get(`/conversations/${p0}/messages/search`, config),
}
