// Local: dùng Vite proxy.
// Production: VITE_API_URL trỏ đến Backend Render.

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

export const apiBaseUrl = configuredApiUrl
  ? configuredApiUrl.replace(/\/+$/, '')
  : '/api'

export const hubUrl = apiBaseUrl.endsWith('/api')
  ? `${apiBaseUrl.slice(0, -4)}/hubs/chat`
  : '/hubs/chat'