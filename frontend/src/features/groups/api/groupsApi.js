import { apiClient } from '../../../shared/api/apiClient'

/**
 * HTTP operations for this feature.
 * Keep endpoint paths and HTTP methods here, outside React components.
 * Functions return the Axios response to preserve existing callers.
 */
export const groupsApi = {
  postGroupInviteLinksResolve: (data, config) => apiClient.post("/group-invite-links/resolve", data, config),
  postGroupInviteLinksJoin: (data, config) => apiClient.post("/group-invite-links/join", data, config),
  getGroupsByIdInviteLinks: (p0, config) => apiClient.get(`/groups/${p0}/invite-links`, config),
  getGroupsByIdPins: (p0, config) => apiClient.get(`/groups/${p0}/pins`, config),
  postFiles: (data, config) => apiClient.post("/files", data, config),
  patchGroupsById: (p0, data, config) => apiClient.patch(`/groups/${p0}`, data, config),
  postGroupsByIdInviteLinks: (p0, data, config) => apiClient.post(`/groups/${p0}/invite-links`, data, config),
  deleteGroupsByIdInviteLinksById: (p0, p1, config) => apiClient.delete(`/groups/${p0}/invite-links/${p1}`, config),
  patchGroupsByIdMembersByIdRole: (p0, p1, data, config) => apiClient.patch(`/groups/${p0}/members/${p1}/role`, data, config),
  deleteGroupsByIdMembersById: (p0, p1, config) => apiClient.delete(`/groups/${p0}/members/${p1}`, config),
  postGroupsByIdTransferOwner: (p0, data, config) => apiClient.post(`/groups/${p0}/transfer-owner`, data, config),
  postGroupsByIdLeave: (p0, data, config) => apiClient.post(`/groups/${p0}/leave`, data, config),
  postGroupsByIdDissolve: (p0, data, config) => apiClient.post(`/groups/${p0}/dissolve`, data, config),
  deleteGroupsByIdPinsById: (p0, p1, config) => apiClient.delete(`/groups/${p0}/pins/${p1}`, config),
  getGroups: (config) => apiClient.get("/groups", config),
  getGroupInvitations: (config) => apiClient.get("/group-invitations", config),
  getGroupsByIdMessages: (p0, config) => apiClient.get(`/groups/${p0}/messages`, config),
  getGroupsByIdMembers: (p0, config) => apiClient.get(`/groups/${p0}/members`, config),
  postConversationsByIdDeliveryAcks: (p0, data, config) => apiClient.post(`/conversations/${p0}/delivery-acks`, data, config),
  putConversationsByIdReadCursor: (p0, data, config) => apiClient.put(`/conversations/${p0}/read-cursor`, data, config),
  getUsersMe: (config) => apiClient.get("/users/me", config),
  request: (options) => apiClient(options),
  getUsersSearch: (config) => apiClient.get("/users/search", config),
  patchMessagesById: (p0, data, config) => apiClient.patch(`/messages/${p0}`, data, config),
  postMessagesByIdRecall: (p0, data, config) => apiClient.post(`/messages/${p0}/recall`, data, config),
  putMessagesByIdReaction: (p0, data, config) => apiClient.put(`/messages/${p0}/reaction`, data, config),
  postGroupsByIdPins: (p0, data, config) => apiClient.post(`/groups/${p0}/pins`, data, config),
  deleteMessagesByIdForMe: (p0, config) => apiClient.delete(`/messages/${p0}/for-me`, config),
  postGroupsByIdMessages: (p0, data, config) => apiClient.post(`/groups/${p0}/messages`, data, config),
}
