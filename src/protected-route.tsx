import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/store/auth-store'

interface ProtectedRouteProps {
  children: ReactNode
  // The change-password screen is the only route a user with a pending change may reach.
  passwordChange?: boolean
}

export function ProtectedRoute({ children, passwordChange = false }: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.mustChangePassword && !passwordChange) {
    return <Navigate to="/change_password" replace />
  }

  if (!user.mustChangePassword && passwordChange) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
