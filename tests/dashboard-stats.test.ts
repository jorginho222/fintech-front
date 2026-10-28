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
import { fetchCreditRequestStats } from '@/credit-requests/api/credit-request-api'
import { creditRequestStatsSchema } from '@/credit-requests/schemas/credit-request-stats-schema'
import { formatPaidPercentage } from '@/dashboard/format-paid-percentage'
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

describe('creditRequestStatsSchema', () => {
  it.each([
    ['a decimal percentage', { total: 2, paidPercentage: 37.5 }],
    ['no active credits', { total: 0, paidPercentage: null }],
    ['nothing paid', { total: 1, paidPercentage: 0 }],
    ['everything paid', { total: 1, paidPercentage: 100 }],
  ])('accepts %s', (_, body) => {
    expect(creditRequestStatsSchema.safeParse(body).success).toBe(true)
  })

  it.each([
    ['a missing field', { total: 2 }],
    ['a non-integer total', { total: 1.5, paidPercentage: 10 }],
    ['a negative total', { total: -1, paidPercentage: 10 }],
    ['a negative percentage', { total: 1, paidPercentage: -0.01 }],
    ['a percentage above 100', { total: 1, paidPercentage: 100.01 }],
  ])('rejects %s', (_, body) => {
    expect(creditRequestStatsSchema.safeParse(body).success).toBe(false)
  })
})

describe('fetchCreditRequestStats', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ token: 'access-token', refreshToken: 'refresh-token' })
  })

  afterEach(() => {
    fetchMock.mockReset()
  })

  it('returns the parsed stats', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { total: 2, paidPercentage: 37.5 }))

    await expect(fetchCreditRequestStats()).resolves.toEqual({ total: 2, paidPercentage: 37.5 })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/credit-request/stats')
    expect(init?.method).toBe('GET')
  })

  it('rejects a malformed body with a non-API error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { total: 2, paidPercentage: '37.5' }))

    const error: unknown = await fetchCreditRequestStats().catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(ApiError)
  })

  it('surfaces the backend message and status on a 403', async () => {
    const message = 'No tiene permiso para acceder a este recurso.'
    fetchMock
      .mockResolvedValueOnce(jsonResponse(403, { error: message }))
      .mockResolvedValueOnce(jsonResponse(500, { error: 'ignored' }))

    const error: unknown = await fetchCreditRequestStats().catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 403, message })
  })
})

describe('formatPaidPercentage', () => {
  // The formatter output may use a non-breaking space; compare with plain spaces.
  const format = (value: number | null) => formatPaidPercentage(value).replace(/\s/g, ' ')

  it('shows a dash without active credits', () => {
    expect(format(null)).toBe('-')
  })

  it.each([
    [0, '0 %'],
    [37.5, '37,5 %'],
    [33.33, '33,33 %'],
    [100, '100 %'],
  ])('formats %d as %s', (value, expected) => {
    expect(format(value)).toBe(expected)
  })
})
