import type { InstallmentStatus } from '@/credit-requests/types/credit-request'

export const INSTALLMENT_PAYMENT_ATTEMPT_STATUSES = [
  'processing',
  'approved',
  'rejected',
  'processing_failed',
  'processing_timeout',
] as const

export type InstallmentPaymentAttemptStatus = (typeof INSTALLMENT_PAYMENT_ATTEMPT_STATUSES)[number]

export type CalendarPaymentTone = 'ok' | 'attention' | 'overdue'

// No `approved` entry: the installment's paid status already says so.
const PAYMENT_ATTEMPT_LABELS: Partial<Record<InstallmentPaymentAttemptStatus, string>> = {
  processing: 'Pago en proceso de confirmación',
  rejected: 'Pago rechazado',
  processing_failed: 'No se pudo procesar el pago',
  processing_timeout: 'No se pudo confirmar el pago',
}

const attemptDateFormatter = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' })

export function getPaymentAttemptLabel(status: InstallmentPaymentAttemptStatus | null): string | null {
  return status === null ? null : (PAYMENT_ATTEMPT_LABELS[status] ?? null)
}

export function isPaymentProcessing(status: InstallmentPaymentAttemptStatus | null): boolean {
  return status === 'processing'
}

export function hasFailedPaymentAttempt(status: InstallmentPaymentAttemptStatus | null): boolean {
  return status === 'rejected' || status === 'processing_failed' || status === 'processing_timeout'
}

export function getPaymentAttemptTextClassName(status: InstallmentPaymentAttemptStatus | null): string {
  if (isPaymentProcessing(status)) return 'text-amber-300'
  return hasFailedPaymentAttempt(status) ? 'text-orange-400' : ''
}

// Being overdue is the more urgent fact, so it wins over a failed attempt.
export function getCalendarPaymentTone(
  status: InstallmentStatus,
  attempt: InstallmentPaymentAttemptStatus | null,
): CalendarPaymentTone {
  if (status === 'overdue') return 'overdue'
  return hasFailedPaymentAttempt(attempt) ? 'attention' : 'ok'
}

export function canPayFromInstallmentList(
  status: InstallmentStatus,
  attempt: InstallmentPaymentAttemptStatus | null,
): boolean {
  if (status === 'paid' || isPaymentProcessing(attempt)) return false
  return status === 'overdue' || hasFailedPaymentAttempt(attempt)
}

// An instant, unlike due dates, so it's read in the user's local time (see `formatDueDate`).
export function formatPaymentAttemptDate(value: string | null): string {
  if (value === null) return '-'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : attemptDateFormatter.format(date)
}
