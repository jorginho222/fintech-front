import type { CreditRequestApplicationStatus } from '@/credit-request-applications/types/credit-request-application'

export const CREDIT_REQUEST_APPLICATION_STATUS_LABELS: Record<CreditRequestApplicationStatus, string> = {
  evaluation_pending: 'Pendiente de evaluación',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

export const CREDIT_REQUEST_APPLICATION_STATUS_CLASS_NAMES: Record<CreditRequestApplicationStatus, string> = {
  evaluation_pending: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-300',
}
