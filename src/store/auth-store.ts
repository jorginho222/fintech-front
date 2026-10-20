import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Company } from '@/company/types/company'

const AUTH_STORAGE_KEY = 'auth'

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
    { name: AUTH_STORAGE_KEY },
  ),
)

// Refresh tokens are single-use, so a tab still holding a rotated-out one would fail its next
// refresh and log every tab out. Pick up sessions written by other tabs as they happen.
window.addEventListener('storage', (event) => {
  if (event.key === AUTH_STORAGE_KEY) {
    void useAuthStore.persist.rehydrate()
  }
})
