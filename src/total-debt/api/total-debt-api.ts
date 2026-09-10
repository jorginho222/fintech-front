import type { TotalDebt } from '@/total-debt/types/total-debt'
import { apiJsonRequest } from '@/shared/api/api-client'

export function searchTotalDebt(month: number, year: number): Promise<TotalDebt> {
  const params = new URLSearchParams({ month: String(month), year: String(year) })

  return apiJsonRequest<TotalDebt>(`/company-total-debt?${params.toString()}`, {
    method: 'GET',
  })
}
