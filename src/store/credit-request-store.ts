import { create } from 'zustand'

import { searchCreditRequests } from '@/credit-requests/api/credit-request-api'
import type { CreditRequest } from '@/credit-requests/types/credit-request'

interface CreditRequestState {
  creditRequests: CreditRequest[]
  isLoading: boolean
  error: string | null
  fetchCreditRequests: () => Promise<void>
}

export const useCreditRequestStore = create<CreditRequestState>((set) => ({
  creditRequests: [],
  isLoading: false,
  error: null,
  fetchCreditRequests: async () => {
    set({ isLoading: true, error: null })

    try {
      const creditRequests = await searchCreditRequests()
      set({ creditRequests, isLoading: false })
    } catch (error) {
      set({
        creditRequests: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'No se pudo conectar con el servidor.',
      })
    }
  },
}))
