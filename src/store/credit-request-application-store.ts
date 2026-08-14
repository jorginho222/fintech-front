import { create } from 'zustand'

import { searchCreditRequestApplications } from '@/credit-request-applications/api/credit-request-application-api'
import type { CreditRequestApplication } from '@/credit-request-applications/types/credit-request-application'

interface CreditRequestApplicationState {
  applications: CreditRequestApplication[]
  isLoading: boolean
  error: string | null
  fetchApplications: () => Promise<void>
}

export const useCreditRequestApplicationStore = create<CreditRequestApplicationState>((set) => ({
  applications: [],
  isLoading: false,
  error: null,
  fetchApplications: async () => {
    set({ isLoading: true, error: null })

    try {
      const applications = await searchCreditRequestApplications()
      set({ applications, isLoading: false })
    } catch (error) {
      set({
        applications: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'No se pudo conectar con el servidor.',
      })
    }
  },
}))
