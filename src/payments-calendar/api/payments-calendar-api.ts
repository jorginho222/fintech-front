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
