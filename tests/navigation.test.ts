import { describe, expect, it } from 'vitest'

import type { CompanyUser } from '@/company/types/company-user'
import { canAccess, getVisibleNavigationItems, ROUTE_ACCESS } from '@/navigation'

function user(type: CompanyUser['type'], permissions: CompanyUser['permissions']): CompanyUser {
  return {
    id: type,
    type,
    taxIdentifier: '20301234567',
    displayName: type === 'member' ? 'Ana' : null,
    active: true,
    mustChangePassword: false,
    permissions,
  }
}

function visibleLabels(current: CompanyUser | null): string[] {
  return getVisibleNavigationItems(current).map((item) => item.label)
}

describe('getVisibleNavigationItems', () => {
  it('shows every entry plus user management to the admin', () => {
    expect(visibleLabels(user('admin', []))).toEqual([
      'Dashboard',
      'Solicitud de creditos',
      'Créditos en curso',
      'Calendario de pagos',
      'Deuda total',
      'Gestion de Usuarios',
    ])
  })

  it('shows a member only the entries they have permission for', () => {
    expect(visibleLabels(user('member', ['total_debt.view', 'credit_request.list']))).toEqual([
      'Dashboard',
      'Créditos en curso',
      'Deuda total',
    ])
  })

  it('never shows user management to a member', () => {
    expect(visibleLabels(user('member', [
      'credit_request_application.list',
      'credit_request_application.create',
      'credit_request.confirm',
      'credit_request.view',
      'credit_request.list',
      'installment.pay',
      'payment_calendar.view',
      'total_debt.view',
    ]))).not.toContain('Gestion de Usuarios')
  })

  it('shows only the dashboard to a member without permissions', () => {
    expect(visibleLabels(user('member', []))).toEqual(['Dashboard'])
  })

  it('shows nothing without a user', () => {
    expect(visibleLabels(null)).toEqual([])
  })
})

describe('credit request application stats visibility', () => {
  const access = ROUTE_ACCESS.creditRequestApplications

  it('is allowed for the admin and for members with the list permission', () => {
    expect(canAccess(user('admin', []), access)).toBe(true)
    expect(canAccess(user('member', ['credit_request_application.list']), access)).toBe(true)
  })

  it('is denied to members without the list permission and without a user', () => {
    expect(canAccess(user('member', ['credit_request_application.create']), access)).toBe(false)
    expect(canAccess(null, access)).toBe(false)
  })
})

describe('credit request stats visibility', () => {
  const access = ROUTE_ACCESS.creditRequests

  it('is allowed for the admin and for members with the list permission', () => {
    expect(canAccess(user('admin', []), access)).toBe(true)
    expect(canAccess(user('member', ['credit_request.list']), access)).toBe(true)
  })

  it('is denied to members without the list permission and without a user', () => {
    expect(canAccess(user('member', ['credit_request_application.list']), access)).toBe(false)
    expect(canAccess(null, access)).toBe(false)
  })
})

describe('payments visibility', () => {
  const access = ROUTE_ACCESS.paymentsCalendar

  it('is allowed for the admin and for members with the payment calendar permission', () => {
    expect(canAccess(user('admin', []), access)).toBe(true)
    expect(canAccess(user('member', ['payment_calendar.view']), access)).toBe(true)
  })

  it('is denied to members without the payment calendar permission and without a user', () => {
    expect(canAccess(user('member', ['installment.pay']), access)).toBe(false)
    expect(canAccess(null, access)).toBe(false)
  })
})
