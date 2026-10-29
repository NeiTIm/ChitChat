import { apiClient } from '../../../shared/api/apiClient'

/**
 * HTTP operations for this feature.
 * Keep endpoint paths and HTTP methods here, outside React components.
 * Functions return the Axios response to preserve existing callers.
 */
export const usersApi = {
  getUsersMe: (config) => apiClient.get("/users/me", config),
  getUsersMePrivacy: (config) => apiClient.get("/users/me/privacy", config),
  request: (options) => apiClient(options),
}
