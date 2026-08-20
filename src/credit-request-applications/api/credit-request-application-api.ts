import type {
  CreditRequestApplication,
  CreditRequestApplicationCreate,
} from '@/credit-request-applications/types/credit-request-application'
import { apiJsonRequest } from '@/shared/api/api-client'

export function searchCreditRequestApplications(): Promise<CreditRequestApplication[]> {
  return apiJsonRequest<CreditRequestApplication[]>('/credit-request-application/search', {
    method: 'GET',
  })
}

export function createCreditRequestApplication(
  application: CreditRequestApplicationCreate,
): Promise<CreditRequestApplication> {
  return apiJsonRequest<CreditRequestApplication>('/credit-request/apply', {
    method: 'POST',
    body: JSON.stringify(application),
  })
}
