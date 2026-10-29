import {
  creditRequestStatsSchema,
  type CreditRequestStats,
} from '@/credit-requests/schemas/credit-request-stats-schema'
import type { CreditRequest } from '@/credit-requests/types/credit-request'
import { apiJsonRequest } from '@/shared/api/api-client'

export function searchCreditRequests(): Promise<CreditRequest[]> {
  return apiJsonRequest<CreditRequest[]>('/credit-request/search', {
    method: 'GET',
  })
}

export async function fetchCreditRequestStats(): Promise<CreditRequestStats> {
  const body = await apiJsonRequest<unknown>('/credit-request/stats', {
    method: 'GET',
  })
  const result = creditRequestStatsSchema.safeParse(body)

  // Not an ApiError: the request itself succeeded, only its body is unusable.
  if (!result.success) {
    throw new Error('La respuesta del servidor no es válida.')
  }

  return result.data
}

export function findCreditRequest(id: string): Promise<CreditRequest> {
  return apiJsonRequest<CreditRequest>(`/credit-request/${encodeURIComponent(id)}`, {
    method: 'GET',
  })
}

export function confirmCreditRequest(id: string): Promise<CreditRequest> {
  return apiJsonRequest<CreditRequest>(`/credit-request/${encodeURIComponent(id)}/confirm`, {
    method: 'PUT',
  })
}

export function payInstallment(id: string): Promise<CreditRequest> {
  return apiJsonRequest<CreditRequest>(`/installment/${encodeURIComponent(id)}/pay`, {
    method: 'PUT',
  })
}
