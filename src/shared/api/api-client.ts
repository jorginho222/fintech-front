import { useAuthStore } from '@/store/auth-store'
import { ApiError, getApiErrorMessage } from '@/shared/api/api-error'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const API_VERSION = import.meta.env.VITE_API_VERSION ?? 'v1'

function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${API_BASE_URL}/${API_VERSION}${normalizedPath}`
}

export async function apiJsonRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
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
    throw new ApiError(response.status, getApiErrorMessage(body))
  }

  return body as T
}
