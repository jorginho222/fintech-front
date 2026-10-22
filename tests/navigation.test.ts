import { describe, expect, it } from 'vitest'

import type { CompanyUser } from '@/company/types/company-user'
import { getVisibleNavigationItems } from '@/navigation'

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
