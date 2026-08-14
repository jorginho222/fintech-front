import type { CreditRequestApplication } from '@/credit-request-applications/types/credit-request-application'
import { apiJsonRequest } from '@/shared/api/api-client'

export function searchCreditRequestApplications(): Promise<CreditRequestApplication[]> {
  return apiJsonRequest<CreditRequestApplication[]>('/credit-request-application/search', {
    method: 'GET',
  })
}
