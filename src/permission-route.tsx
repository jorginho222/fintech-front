import type { ReactNode } from 'react'

import { canAccess, type RouteAccess } from '@/navigation'
import { NoAccess } from '@/shared/components/no-access'
import { useAuthStore } from '@/store/auth-store'

export function PermissionRoute({ access, children }: { access: RouteAccess; children: ReactNode }) {
  const allowed = useAuthStore((state) => canAccess(state.user, access))

  return allowed ? children : <NoAccess />
}
