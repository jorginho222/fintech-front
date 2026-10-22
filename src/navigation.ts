import { hasPermissions, isAdmin, type CompanyUser } from '@/company/types/company-user'
import type { Permission } from '@/company/types/permission'

export interface RouteAccess {
  permissions?: readonly Permission[]
  adminOnly?: boolean
}

// Single source for what each route needs, used by both the navigation and the route guards.
export const ROUTE_ACCESS = {
  dashboard: {},
  creditRequestApplications: { permissions: ['credit_request_application.list'] },
  creditRequestApplicationCreate: { permissions: ['credit_request_application.create'] },
  // The confirm and pay screens load the credit request first, which needs `credit_request.view`.
  creditRequestConfirm: { permissions: ['credit_request.confirm', 'credit_request.view'] },
  creditRequests: { permissions: ['credit_request.list'] },
  creditRequestShow: { permissions: ['credit_request.view'] },
  creditRequestPay: { permissions: ['installment.pay', 'credit_request.view'] },
  paymentsCalendar: { permissions: ['payment_calendar.view'] },
  totalDebt: { permissions: ['total_debt.view'] },
  memberUsers: { adminOnly: true },
} as const satisfies Record<string, RouteAccess>

export interface NavigationItem {
  label: string
  to: string
  access: RouteAccess
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', access: ROUTE_ACCESS.dashboard },
  { label: 'Solicitud de creditos', to: '/credit_request_applications', access: ROUTE_ACCESS.creditRequestApplications },
  { label: 'Créditos en curso', to: '/credit_requests', access: ROUTE_ACCESS.creditRequests },
  { label: 'Calendario de pagos', to: '/payments_calendar', access: ROUTE_ACCESS.paymentsCalendar },
  { label: 'Deuda total', to: '/total_debt', access: ROUTE_ACCESS.totalDebt },
  { label: 'Gestion de Usuarios', to: '/users', access: ROUTE_ACCESS.memberUsers },
]

export function canAccess(user: CompanyUser | null, access: RouteAccess): boolean {
  if (!user) return false
  if (access.adminOnly && !isAdmin(user)) return false

  return hasPermissions(user, access.permissions ?? [])
}

export function getVisibleNavigationItems(user: CompanyUser | null): NavigationItem[] {
  return NAVIGATION_ITEMS.filter((item) => canAccess(user, item.access))
}
