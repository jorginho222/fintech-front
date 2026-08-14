import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Company } from '@/company/types/company'

interface AuthState {
  token: string | null
  company: Company | null
  login: (token: string, company: Company) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      company: null,
      login: (token, company) => set({ token, company }),
      logout: () => set({ token: null, company: null }),
    }),
    { name: 'auth' },
  ),
)
