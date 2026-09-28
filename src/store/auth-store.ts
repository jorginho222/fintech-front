import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Company } from '@/company/types/company'

interface AuthState {
  token: string | null
  refreshToken: string | null
  company: Company | null
  login: (token: string, refreshToken: string, company: Company) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      company: null,
      login: (token, refreshToken, company) => set({ token, refreshToken, company }),
      logout: () => set({ token: null, refreshToken: null, company: null }),
    }),
    { name: 'auth' },
  ),
)
