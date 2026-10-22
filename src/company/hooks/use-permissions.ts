import { useShallow } from 'zustand/react/shallow'

import {
  describeMissingPermissions,
  getMissingPermissions,
  hasPermissions,
  isAdmin,
} from '@/company/types/company-user'
import type { Permission } from '@/company/types/permission'
import { useAuthStore } from '@/store/auth-store'

export function useHasPermissions(required: readonly Permission[]): boolean {
  return useAuthStore((state) => hasPermissions(state.user, required))
}

export function useIsAdmin(): boolean {
  return useAuthStore((state) => isAdmin(state.user))
}

// For actions that stay visible but disabled: whether it's allowed, and why not.
export function usePermissionGate(required: readonly Permission[]): { allowed: boolean; reason: string } {
  const missing = useAuthStore(useShallow((state) => getMissingPermissions(state.user, required)))

  return { allowed: missing.length === 0, reason: describeMissingPermissions(missing) }
}
