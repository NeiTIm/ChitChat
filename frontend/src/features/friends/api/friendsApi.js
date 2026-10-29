import { apiClient } from '../../../shared/api/apiClient'

/**
 * HTTP operations for this feature.
 * Keep endpoint paths and HTTP methods here, outside React components.
 * Functions return the Axios response to preserve existing callers.
 */
export const friendsApi = {
  getUsersMe: (config) => apiClient.get("/users/me", config),
  getFriends: (config) => apiClient.get("/friends", config),
  getFriendsRequests: (config) => apiClient.get("/friends/requests", config),
  getBlocks: (config) => apiClient.get("/blocks", config),
  getUsersById: (p0, config) => apiClient.get(`/users/${p0}`, config),
  request: (options) => apiClient(options),
  postConversationsPrivate: (data, config) => apiClient.post("/conversations/private", data, config),
  getUsersSearch: (config) => apiClient.get("/users/search", config),
}
