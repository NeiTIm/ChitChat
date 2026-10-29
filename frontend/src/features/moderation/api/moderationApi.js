import { apiClient } from '../../../shared/api/apiClient'

/**
 * HTTP operations for this feature.
 * Keep endpoint paths and HTTP methods here, outside React components.
 * Functions return the Axios response to preserve existing callers.
 */
export const moderationApi = {
  getUnknown: (options) => apiClient(options),
  postUnknown: (options) => apiClient(options),
  getAdminReportsById: (p0, config) => apiClient.get(`/admin/reports/${p0}`, config),
  getAdminReportsByIdEvidenceByIdFile: (p0, p1, config) => apiClient.get(`/admin/reports/${p0}/evidence/${p1}/file`, config),
  postAppealsAuthenticate: (data, config) => apiClient.post("/appeals/authenticate", data, config),
  getAppealsMe: (config) => apiClient.get("/appeals/me", config),
  postAppeals: (data, config) => apiClient.post("/appeals", data, config),
  postReports: (data, config) => apiClient.post("/reports", data, config),
}
