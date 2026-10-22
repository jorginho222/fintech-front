import { describe, expect, it } from 'vitest'

import {
  describeMissingPermissions,
  getMissingPermissions,
  hasPermissions,
  type CompanyUser,
} from '@/company/types/company-user'
import {
  getPermissionLabel,
  getPermissionResourceLabel,
  PERMISSION_RESOURCES,
  PERMISSIONS,
} from '@/company/types/permission'

const admin: CompanyUser = {
  id: 'admin',
  type: 'admin',
  taxIdentifier: '30712345678',
  displayName: null,
  active: true,
  mustChangePassword: false,
  permissions: [...PERMISSIONS],
}

function member(permissions: CompanyUser['permissions']): CompanyUser {
  return { ...admin, id: 'member', type: 'member', displayName: 'Ana', permissions }
}

describe('hasPermissions', () => {
  it('always passes for the admin', () => {
    expect(hasPermissions({ ...admin, permissions: [] }, ['installment.pay'])).toBe(true)
  })

  it('needs every required permission for a member', () => {
    const payer = member(['installment.pay'])

    expect(hasPermissions(payer, ['installment.pay'])).toBe(true)
    expect(hasPermissions(payer, ['installment.pay', 'credit_request.view'])).toBe(false)
    expect(hasPermissions(member([]), ['total_debt.view'])).toBe(false)
    expect(hasPermissions(member([]), [])).toBe(true)
  })

  it('fails without a user', () => {
    expect(hasPermissions(null, [])).toBe(false)
  })
})

describe('missing permissions', () => {
  it('lists only the permissions the member lacks, with Spanish labels', () => {
    const missing = getMissingPermissions(member(['installment.pay']), ['installment.pay', 'credit_request.view'])

    expect(missing).toEqual(['credit_request.view'])
    expect(describeMissingPermissions(missing)).toBe('Necesitás el permiso «Ver detalle de un crédito»')
  })

  it('joins several missing permissions', () => {
    expect(describeMissingPermissions(['installment.pay', 'credit_request.view'])).toBe(
      'Necesitás los permisos «Pagar cuotas» y «Ver detalle de un crédito»',
    )
  })
})

describe('permission labels', () => {
  it('has a Spanish label for every known group and permission', () => {
    for (const permission of PERMISSIONS) {
      expect(getPermissionLabel(permission)).not.toBe(permission)
    }

    for (const resource of PERMISSION_RESOURCES) {
      expect(getPermissionResourceLabel(resource)).not.toBe(resource)
    }

    expect(getPermissionResourceLabel('total_debt')).toBe('Deuda total')
    expect(getPermissionLabel('installment.pay')).toBe('Pagar cuotas')
  })

  it('falls back to the raw value for unknown ones', () => {
    expect(getPermissionLabel('report.export')).toBe('report.export')
    expect(getPermissionResourceLabel('reports')).toBe('reports')
  })
})
