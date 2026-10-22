// Mirrors the backend `Permission` enum. Values are stable identifiers: never rename one.
export const PERMISSIONS = [
  'credit_request_application.list',
  'credit_request_application.create',
  'credit_request.confirm',
  'credit_request.view',
  'credit_request.list',
  'installment.pay',
  'payment_calendar.view',
  'total_debt.view',
] as const

export type Permission = (typeof PERMISSIONS)[number]

// Group keys returned by `Permission::resource()` in the backend.
export const PERMISSION_RESOURCES = [
  'credit_request_application',
  'credit_requests',
  'payment_calendar',
  'total_debt',
] as const

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number]

export const PERMISSION_LABELS: Record<Permission, string> = {
  'credit_request_application.list': 'Ver solicitudes de crédito',
  'credit_request_application.create': 'Crear solicitudes de crédito',
  'credit_request.confirm': 'Confirmar propuestas de crédito',
  'credit_request.view': 'Ver detalle de un crédito',
  'credit_request.list': 'Ver créditos en curso',
  'installment.pay': 'Pagar cuotas',
  'payment_calendar.view': 'Ver cuotas pendientes de pago',
  'total_debt.view': 'Ver deuda total',
}

export const PERMISSION_RESOURCE_LABELS: Record<PermissionResource, string> = {
  credit_request_application: 'Solicitudes de crédito',
  credit_requests: 'Créditos',
  payment_calendar: 'Calendario de pagos',
  total_debt: 'Deuda total',
}

export interface PermissionCatalogueGroup {
  resource: string
  permissions: string[]
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}

function isPermissionResource(value: string): value is PermissionResource {
  return (PERMISSION_RESOURCES as readonly string[]).includes(value)
}

// Unknown values (the backend added one the frontend doesn't know yet) fall back to the raw
// value, so they can still be shown and granted.
export function getPermissionLabel(value: string): string {
  return isPermission(value) ? PERMISSION_LABELS[value] : value
}

export function getPermissionResourceLabel(value: string): string {
  return isPermissionResource(value) ? PERMISSION_RESOURCE_LABELS[value] : value
}
