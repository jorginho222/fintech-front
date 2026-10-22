import { useNavigate } from 'react-router-dom'

import { logoutCompanyUser } from '@/company/api/company-auth-api'
import { useAuthStore } from '@/store/auth-store'

export function useLogout(): () => Promise<void> {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  return async () => {
    try {
      await logoutCompanyUser()
    } catch {
      // Local session is cleared below regardless of backend failure.
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }
}
