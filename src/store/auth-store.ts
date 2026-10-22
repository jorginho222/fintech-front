import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Company } from '@/company/types/company'
import type { CompanyUser } from '@/company/types/company-user'

const AUTH_STORAGE_KEY = 'auth'
// v1 added `user`. Older sessions are dropped: the backend rejects their refresh tokens anyway.
const AUTH_STORAGE_VERSION = 1

interface AuthState {
  token: string | null
  refreshToken: string | null
  company: Company | null
  user: CompanyUser | null
  // Set when the session ended because the backend rejected it, so login can say why.
  sessionExpired: boolean
  login: (token: string, refreshToken: string, company: Company, user: CompanyUser) => void
  logout: (options?: { expired?: boolean }) => void
  setUser: (user: CompanyUser) => void
  markPasswordChangeRequired: () => void
}

const loggedOutState = {
  token: null,
  refreshToken: null,
  company: null,
  user: null,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...loggedOutState,
      sessionExpired: false,
      login: (token, refreshToken, company, user) =>
        set({ token, refreshToken, company, user, sessionExpired: false }),
      logout: (options) => set({ ...loggedOutState, sessionExpired: options?.expired ?? false }),
      setUser: (user) => set({ user }),
      markPasswordChangeRequired: () =>
        set((state) => (state.user ? { user: { ...state.user, mustChangePassword: true } } : {})),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: AUTH_STORAGE_VERSION,
      migrate: () => ({ ...loggedOutState, sessionExpired: false }),
    },
  ),
)

// Refresh tokens are single-use, so a tab still holding a rotated-out one would fail its next
// refresh and log every tab out. Pick up sessions written by other tabs as they happen.
window.addEventListener('storage', (event) => {
  if (event.key === AUTH_STORAGE_KEY) {
    void useAuthStore.persist.rehydrate()
  }
})
