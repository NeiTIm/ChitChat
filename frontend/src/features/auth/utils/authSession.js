import { authApi } from '../api/authApi'

let accessToken = null
let csrfValue = null

let refreshPromise = null
let csrfPromise = null

export function setAccessToken(token) {
  accessToken = token || null

  if (!accessToken) {
    csrfValue = null
    csrfPromise = null
  }
}

export function getAccessToken() {
  return accessToken
}

// Giữ lại API này để tương thích với các nơi
// có thể đang gọi csrfToken().
export function csrfToken() {
  return csrfValue
}

// Lấy CSRF token từ Backend, không đọc document.cookie.
export async function getCsrfToken() {
  if (csrfValue) {
    return csrfValue
  }

  if (csrfPromise) {
    return csrfPromise
  }

  const request = authApi
    .getAuthCsrf()
    .then(({ data }) => {
      if (!data?.csrfToken) {
        throw new Error('Missing CSRF token')
      }

      csrfValue = data.csrfToken
      return csrfValue
    })

  csrfPromise = request

  try {
    return await request
  } finally {
    if (csrfPromise === request) {
      csrfPromise = null
    }
  }
}

export async function restoreAccessToken() {
  if (accessToken) {
    return accessToken
  }

  // Chỉ một refresh request tại một thời điểm.
  if (refreshPromise) {
    return refreshPromise
  }

  const request = (async () => {
    try {
      const csrf = await getCsrfToken()

      const { data } = await authApi.postAuthRefresh(
        null,
        {
          headers: {
            'X-CSRF-Token': csrf,
          },
        },
      )

      if (!data?.accessToken) {
        return null
      }

      setAccessToken(data.accessToken)

      // Refresh token đã được rotate.
      // CSRF token cũ không còn hợp lệ.
      csrfValue = null

      return accessToken
    } catch {
      csrfValue = null
      return null
    }
  })()

  refreshPromise = request

  try {
    return await request
  } finally {
    if (refreshPromise === request) {
      refreshPromise = null
    }
  }
}