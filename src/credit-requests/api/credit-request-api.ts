import type { CreditRequest } from '@/credit-requests/types/credit-request'
import { apiJsonRequest } from '@/shared/api/api-client'

export function searchCreditRequests(): Promise<CreditRequest[]> {
  return apiJsonRequest<CreditRequest[]>('/credit-request/search', {
    method: 'GET',
  })
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
