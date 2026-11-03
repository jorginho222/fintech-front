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

import { requestInstallmentPayment } from '@/credit-requests/api/credit-request-api'
import { buildInstallmentPayUrl, selectInstallmentToPay } from '@/credit-requests/installment-to-pay'
import type { CreditRequest, CreditRequestInstallment } from '@/credit-requests/types/credit-request'
import {
  canPayFromInstallmentList,
  formatPaymentAttemptDate,
  getCalendarPaymentTone,
  getPaymentAttemptLabel,
  getPaymentAttemptTextClassName,
  isPaymentProcessing,
} from '@/credit-requests/types/installment-payment-attempt'
import { ApiError } from '@/shared/api/api-error'
import { useAuthStore } from '@/store/auth-store'

const FAILED_ATTEMPTS = ['rejected', 'processing_failed', 'processing_timeout'] as const

describe('getPaymentAttemptLabel', () => {
  it.each([
    ['processing', 'Pago en proceso de confirmación'],
    ['rejected', 'Pago rechazado'],
    ['processing_failed', 'No se pudo procesar el pago'],
    ['processing_timeout', 'No se pudo confirmar el pago'],
    ['approved', null],
    [null, null],
  ] as const)('%s → %s', (status, label) => {
    expect(getPaymentAttemptLabel(status)).toBe(label)
  })
})

describe('isPaymentProcessing', () => {
  it('is true only for a processing attempt', () => {
    expect(isPaymentProcessing('processing')).toBe(true)
    expect(isPaymentProcessing(null)).toBe(false)
    expect(isPaymentProcessing('approved')).toBe(false)
    expect(FAILED_ATTEMPTS.some(isPaymentProcessing)).toBe(false)
  })
})

describe('getPaymentAttemptTextClassName', () => {
  it('is orange for failed attempts and yellow for processing', () => {
    for (const attempt of FAILED_ATTEMPTS) {
      expect(getPaymentAttemptTextClassName(attempt)).toContain('orange')
    }
    expect(getPaymentAttemptTextClassName('processing')).toContain('amber')
  })
})

describe('getCalendarPaymentTone', () => {
  it('is ok for a pending installment with no attempt', () => {
    expect(getCalendarPaymentTone('pending', null)).toBe('ok')
  })

  it.each(FAILED_ATTEMPTS)('needs attention for a pending installment with a %s attempt', (attempt) => {
    expect(getCalendarPaymentTone('pending', attempt)).toBe('attention')
  })

  it('is overdue for an overdue installment, even with a failed attempt', () => {
    expect(getCalendarPaymentTone('overdue', null)).toBe('overdue')
    expect(getCalendarPaymentTone('overdue', 'rejected')).toBe('overdue')
  })
})

describe('canPayFromInstallmentList', () => {
  it('allows overdue installments and pending ones with a failed attempt', () => {
    expect(canPayFromInstallmentList('overdue', null)).toBe(true)
    expect(canPayFromInstallmentList('overdue', 'rejected')).toBe(true)
    for (const attempt of FAILED_ATTEMPTS) {
      expect(canPayFromInstallmentList('pending', attempt)).toBe(true)
    }
  })

  it('blocks processing, paid and pending installments with no attempt', () => {
    expect(canPayFromInstallmentList('pending', 'processing')).toBe(false)
    expect(canPayFromInstallmentList('overdue', 'processing')).toBe(false)
    expect(canPayFromInstallmentList('paid', 'approved')).toBe(false)
    expect(canPayFromInstallmentList('pending', null)).toBe(false)
  })
})

describe('formatPaymentAttemptDate', () => {
  it('shows a dash without a date', () => {
    expect(formatPaymentAttemptDate(null)).toBe('-')
  })

  it('shows a valid date in the short format', () => {
    expect(formatPaymentAttemptDate('2026-10-15T12:00:00-03:00')).toBe('15/10/26')
  })

  it('returns an unparsable value as it came', () => {
    expect(formatPaymentAttemptDate('not-a-date')).toBe('not-a-date')
  })
})

function buildInstallment(id: string, status: CreditRequestInstallment['status']): CreditRequestInstallment {
  return {
    id,
    periodNumber: 1,
    capitalAmount: '100.00',
    interestAmount: '10.00',
    taxOnInterestAmount: '2.10',
    totalAmount: '112.10',
    dueDate: '2026-10-15T00:00:00-03:00',
    status,
    lastPaymentAttemptStatus: null,
    lastPaymentAttemptAt: null,
  }
}

describe('selectInstallmentToPay', () => {
  const overdue = buildInstallment('overdue-id', 'overdue')
  const pending = buildInstallment('pending-id', 'pending')
  const creditRequest = { upcomingInstallment: pending, installments: [overdue, pending] } as CreditRequest

  it('picks the given installment, even when it is not the upcoming one', () => {
    expect(selectInstallmentToPay(creditRequest, 'overdue-id')).toBe(overdue)
  })

  it('finds nothing for an installment of another credit', () => {
    expect(selectInstallmentToPay(creditRequest, 'unknown-id')).toBeNull()
  })

  it('uses the upcoming installment without an id', () => {
    expect(selectInstallmentToPay(creditRequest, null)).toBe(pending)
  })
})

describe('buildInstallmentPayUrl', () => {
  it('includes both encoded identifiers', () => {
    expect(buildInstallmentPayUrl('credit/1', 'installment 2')).toBe(
      '/credit_requests/pay?id=credit%2F1&installmentId=installment+2',
    )
  })
})

describe('requestInstallmentPayment', () => {
  const fetchMock = vi.fn<typeof fetch>()

  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ token: 'test-token' })
  })

  afterEach(() => {
    fetchMock.mockReset()
    useAuthStore.setState({ token: null })
  })

  it('sends the pay request and resolves with the credit request on 202', async () => {
    const creditRequest = { id: 'credit-1', installments: [] }
    fetchMock.mockResolvedValueOnce(jsonResponse(202, creditRequest))

    await expect(requestInstallmentPayment('installment-1')).resolves.toEqual(creditRequest)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/installment/installment-1/pay-request')
    expect(init?.method).toBe('PUT')
  })

  it('rejects with the backend error on 409', async () => {
    const message = 'El pago de esta cuota está siendo procesado. Espere la confirmación antes de volver a intentarlo.'
    fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: message }))

    const error = await requestInstallmentPayment('installment-1').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message })
  })
})
