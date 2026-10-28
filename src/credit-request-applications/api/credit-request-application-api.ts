import {
  creditRequestApplicationStatsSchema,
  type CreditRequestApplicationStats,
} from '@/credit-request-applications/schemas/credit-request-application-stats-schema'
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

export async function fetchCreditRequestApplicationStats(): Promise<CreditRequestApplicationStats> {
  const body = await apiJsonRequest<unknown>('/credit-request-application/stats', {
    method: 'GET',
  })
  const result = creditRequestApplicationStatsSchema.safeParse(body)

  // Not an ApiError: the request itself succeeded, only its body is unusable.
  if (!result.success) {
    throw new Error('La respuesta del servidor no es válida.')
  }

  return result.data
}

export function createCreditRequestApplication(
  application: CreditRequestApplicationCreate,
): Promise<CreditRequestApplication> {
  return apiJsonRequest<CreditRequestApplication>('/credit-request/apply', {
    method: 'POST',
    body: JSON.stringify(application),
  })
}
