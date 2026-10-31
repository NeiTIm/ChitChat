import { apiClient } from '../../../shared/api/apiClient'

export const authApi = {
  getAuthSessions: config =>
    apiClient.get('/auth/sessions', config),

  getAuthCsrf: config =>
    apiClient.get('/auth/csrf', config),

  postAuthLogout: (data, config) =>
    apiClient.post('/auth/logout', data, config),

  postAuthLogoutOthers: (data, config) =>
    apiClient.post('/auth/logout-others', data, config),

  postAuthChangePassword: (data, config) =>
    apiClient.post('/auth/change-password', data, config),

  postAuthRegister: (data, config) =>
    apiClient.post('/auth/register', data, config),

  postAuthVerifyEmail: (data, config) =>
    apiClient.post('/auth/verify-email', data, config),

  postAuthForgotPassword: (data, config) =>
    apiClient.post('/auth/forgot-password', data, config),

  postAuthResetPassword: (data, config) =>
    apiClient.post('/auth/reset-password', data, config),

  postAuthReactivate: (data, config) =>
    apiClient.post('/auth/reactivate', data, config),

  postAuthLogin: (data, config) =>
    apiClient.post('/auth/login', data, config),

  postAuthRefresh: (data, config) =>
    apiClient.post('/auth/refresh', data, config),
}