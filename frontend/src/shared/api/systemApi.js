import { apiClient } from './apiClient'

/**
 * HTTP operations for this feature.
 * Keep endpoint paths and HTTP methods here, outside React components.
 * Functions return the Axios response to preserve existing callers.
 */
export const systemApi = {
  getHealth: (config) => apiClient.get("/health", config),
}
