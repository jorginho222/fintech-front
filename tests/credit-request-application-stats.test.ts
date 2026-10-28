import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The auth store listens on `window` at import time and persists to `localStorage`; there's no DOM here.
vi.hoisted(() => {
  const storage = new Map<string, string>()

  vi.stubGlobal('window', {
    addEventListener: () => {},
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  })
})

import { fetchCreditRequestApplicationStats } from '@/credit-request-applications/api/credit-request-application-api'
import { creditRequestApplicationStatsSchema } from '@/credit-request-applications/schemas/credit-request-application-stats-schema'
import { ApiError } from '@/shared/api/api-error'
import { useAuthStore } from '@/store/auth-store'

const stats = { total: 6, approved: 3, rejected: 1, evaluationPending: 2 }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('creditRequestApplicationStatsSchema', () => {
  it('accepts a valid response, including all zeros', () => {
    expect(creditRequestApplicationStatsSchema.safeParse(stats).success).toBe(true)
    expect(
      creditRequestApplicationStatsSchema.safeParse({ total: 0, approved: 0, rejected: 0, evaluationPending: 0 }).success,
    ).toBe(true)
  })

  it('strips unknown fields', () => {
    expect(creditRequestApplicationStatsSchema.parse({ ...stats, cancelled: 4 })).toEqual(stats)
  })

  it.each([
    ['a missing field', { total: 6, approved: 3, rejected: 1 }],
    ['a numeric string', { ...stats, approved: '3' }],
    ['a float', { ...stats, rejected: 1.5 }],
    ['a negative count', { ...stats, total: -1 }],
  ])('rejects %s', (_, body) => {
    expect(creditRequestApplicationStatsSchema.safeParse(body).success).toBe(false)
  })
})

describe('fetchCreditRequestApplicationStats', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ token: 'access-token', refreshToken: 'refresh-token' })
  })

  afterEach(() => {
    fetchMock.mockReset()
  })

  it('returns the parsed stats', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, stats))

    await expect(fetchCreditRequestApplicationStats()).resolves.toEqual(stats)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/credit-request-application/stats')
    expect(init?.method).toBe('GET')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-token')
  })

  it('rejects a malformed body with a non-API error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { total: '6' }))

    const error: unknown = await fetchCreditRequestApplicationStats().catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(ApiError)
  })

  it('surfaces the backend message and status on a 403', async () => {
    const message = 'No tiene permiso para acceder a este recurso.'
    // Second call: the `/me` re-sync the client triggers on a permission 403.
    fetchMock
      .mockResolvedValueOnce(jsonResponse(403, { error: message }))
      .mockResolvedValueOnce(jsonResponse(500, { error: 'ignored' }))

    const error: unknown = await fetchCreditRequestApplicationStats().catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 403, message })
  })
})
