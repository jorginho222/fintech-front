import type { CompanyUserAuthResult } from '@/company/types/company'
import type { CompanyUser } from '@/company/types/company-user'
import { useAuthStore } from '@/store/auth-store'
import { ApiError, getApiErrorMessage, getApiFieldErrors } from '@/shared/api/api-error'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const API_VERSION = import.meta.env.VITE_API_VERSION ?? 'v1'
const pendingGetRequests = new Map<string, Promise<unknown>>()
// /login: a 401 means bad credentials. /logout: its body carries the refresh token, which a
// mid-request refresh would rotate (revoke) before the retry.
const NO_REFRESH_PATHS = new Set(['/login', '/logout'])
// Public endpoints never carry the bearer token: a stale one would be rejected by the backend's
// JWT firewall before reaching the endpoint.
const PUBLIC_PATHS = new Set(['/login', '/company_registration'])
// The backend's 403 bodies carry no code, so the password-change one is told apart by its exact
// message; any other 403 is a missing permission.
const PASSWORD_CHANGE_REQUIRED_MESSAGE = 'Debe cambiar su contraseña para continuar.'
let pendingRefresh: Promise<string> | null = null

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function getApiUrl(path: string): string {
  return `${API_BASE_URL}/${API_VERSION}${normalizePath(path)}`
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

async function sendJsonRequest<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  const headers = new Headers(init.headers)

  headers.set('Accept', 'application/json')
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(getApiUrl(path), {
    ...init,
    headers,
  })

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message = getApiErrorMessage(body)

    if (response.status === 403) {
      handleForbidden(message, token)
    }

    throw new ApiError(response.status, message, getApiFieldErrors(body))
  }

  return body as T
}

function handleForbidden(message: string, token: string | null): void {
  if (message === PASSWORD_CHANGE_REQUIRED_MESSAGE) {
    // ProtectedRoute sends the user to the change-password screen.
    useAuthStore.getState().markPasswordChangeRequired()
    return
  }

  if (token) {
    // A permission was likely revoked mid-session: re-sync so navigation and route guards update.
    void sendJsonRequest<CompanyUser>('/me', { method: 'GET' }, token)
      .then((user) => useAuthStore.getState().setUser(user))
      .catch(() => {})
  }
}

// Refresh tokens are single-use, so concurrent 401s must share one /refresh call.
async function requestTokenRefresh(): Promise<string> {
  const { refreshToken, login, logout } = useAuthStore.getState()

  try {
    if (!refreshToken) {
      throw new ApiError(401, 'La sesión expiró.')
    }

    const result = await sendJsonRequest<CompanyUserAuthResult>(
      '/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      null,
    )

    login(result.accessToken.token, result.refreshToken.token, result.company, result.user)

    return result.accessToken.token
  } catch (error) {
    // Only a server rejection ends the session; a network failure may succeed on a later attempt.
    if (error instanceof ApiError) {
      logout({ expired: true })
    }

    throw error
  }
}

function refreshAccessToken(): Promise<string> {
  pendingRefresh ??= requestTokenRefresh().finally(() => {
    pendingRefresh = null
  })

  return pendingRefresh
}

async function getTokenAfterUnauthorized(rejectedToken: string): Promise<string | null> {
  const currentToken = useAuthStore.getState().token

  // Another request already refreshed (or the user logged out) since this one was sent.
  if (currentToken !== rejectedToken) {
    return currentToken
  }

  try {
    return await refreshAccessToken()
  } catch {
    return null
  }
}

async function handleJsonRequest<T>(path: string, init: RequestInit): Promise<T> {
  const token = PUBLIC_PATHS.has(normalizePath(path)) ? null : useAuthStore.getState().token

  try {
    return await sendJsonRequest<T>(path, init, token)
  } catch (error) {
    if (!token || !isUnauthorized(error) || NO_REFRESH_PATHS.has(normalizePath(path))) {
      throw error
    }

    const freshToken = await getTokenAfterUnauthorized(token)

    if (!freshToken) {
      throw error
    }

    return sendJsonRequest<T>(path, init, freshToken)
  }
}

export function apiJsonRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() ?? 'GET'

  if (method !== 'GET') {
    return handleJsonRequest<T>(path, init)
  }

  const token = useAuthStore.getState().token ?? ''
  const requestKey = `${token}:${getApiUrl(path)}`
  const pendingRequest = pendingGetRequests.get(requestKey)

  if (pendingRequest) {
    return pendingRequest as Promise<T>
  }

  const request = handleJsonRequest<T>(path, init).finally(() => {
    pendingGetRequests.delete(requestKey)
  })

  pendingGetRequests.set(requestKey, request)

  return request
}
