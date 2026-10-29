import {
  dashboardPaymentsSchema,
  type DashboardPayments,
} from '@/payments-calendar/schemas/dashboard-payments-schema'
import type { PendingInstallmentsToPay } from '@/payments-calendar/types/payments-calendar'
import { apiJsonRequest } from '@/shared/api/api-client'

export function searchPendingInstallmentsToPay(
  month: number,
  year: number,
): Promise<PendingInstallmentsToPay> {
  const params = new URLSearchParams({ month: String(month), year: String(year) })

  return apiJsonRequest<PendingInstallmentsToPay>(`/installment/pending-to-pay/search?${params.toString()}`, {
    method: 'GET',
  })
}

export async function fetchDashboardPayments(): Promise<DashboardPayments> {
  const body = await apiJsonRequest<unknown>('/installment/dashboard-payments', {
    method: 'GET',
  })
  const result = dashboardPaymentsSchema.safeParse(body)

  // Not an ApiError: the request itself succeeded, only its body is unusable.
  if (!result.success) {
    throw new Error('La respuesta del servidor no es válida.')
  }

  return result.data
}
