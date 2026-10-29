import { authApi } from '../api/authApi'

let accessToken = null
let refreshPromise = null

export function setAccessToken(token) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export function csrfToken() {
  const value = document.cookie
    .split('; ')
    .find(entry => entry.startsWith('webchat_csrf='))
    ?.split('=')
    .slice(1)
    .join('=')

  return value ? decodeURIComponent(value) : null
}

export async function restoreAccessToken() {
  if (accessToken) {
    return accessToken
  }

  // Nhiều component cùng gọi thì dùng chung một request.
  if (refreshPromise) {
    return refreshPromise
  }

  const csrf = csrfToken()

  if (!csrf) {
    return null
  }

  refreshPromise = (async () => {
    const { data } = await authApi.postAuthRefresh(null, {
      headers: {
        'X-CSRF-Token': csrf,
      },
    })

    if (!data?.accessToken) {
      return null
    }

    setAccessToken(data.accessToken)
    return accessToken
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}