import { PERMISSION_LABELS, type Permission } from '@/company/types/permission'

export type CompanyUserType = 'admin' | 'member'

// Shape of the backend `CompanyUserSerializer`, shared by login/refresh, /me and member management.
export interface CompanyUser {
  id: string
  type: CompanyUserType
  taxIdentifier: string
  displayName: string | null
  active: boolean
  mustChangePassword: boolean
  permissions: Permission[]
}

// Admins hold every permission; members need every required one.
export function hasPermissions(user: CompanyUser | null, required: readonly Permission[]): boolean {
  if (!user) return false
  if (user.type === 'admin') return true

  return required.every((permission) => user.permissions.includes(permission))
}

export function isAdmin(user: CompanyUser | null): boolean {
  return user?.type === 'admin'
}

export function getMissingPermissions(user: CompanyUser | null, required: readonly Permission[]): Permission[] {
  if (isAdmin(user)) return []

  return required.filter((permission) => !user?.permissions.includes(permission))
}

export function describeMissingPermissions(missing: readonly Permission[]): string {
  const labels = missing.map((permission) => `«${PERMISSION_LABELS[permission]}»`)

  if (labels.length <= 1) return `Necesita el permiso ${labels.join('')}`

  return `Necesita los permisos ${labels.slice(0, -1).join(', ')} y ${labels.at(-1) ?? ''}`
}
