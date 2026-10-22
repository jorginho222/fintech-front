import { describe, expect, it } from 'vitest'

import { memberUserCreateSchema } from '@/member-users/schemas/member-user-create-schema'
import { memberUserPermissionsSchema } from '@/member-users/schemas/member-user-permissions-schema'
import { memberUserUpdateSchema } from '@/member-users/schemas/member-user-update-schema'

const validMember = {
  id: '3f1c0d2e-8b4a-4c6d-9e7f-1a2b3c4d5e6f',
  taxIdentifier: '20301234567',
  displayName: 'Juan Pérez',
  password: 'Initial123!',
  permissions: ['total_debt.view'],
}

function failingPaths(input: unknown): PropertyKey[][] {
  const result = memberUserCreateSchema.safeParse(input)

  return result.success ? [] : result.error.issues.map((issue) => issue.path)
}

describe('memberUserCreateSchema', () => {
  it('accepts a valid member', () => {
    expect(memberUserCreateSchema.safeParse(validMember).success).toBe(true)
  })

  it('accepts an empty permission list', () => {
    expect(memberUserCreateSchema.safeParse({ ...validMember, permissions: [] }).success).toBe(true)
  })

  it('rejects a CUIL that is not 11 digits', () => {
    expect(failingPaths({ ...validMember, taxIdentifier: '20-30123456-7' })).toEqual([['taxIdentifier']])
  })

  it('rejects a blank or too long display name', () => {
    expect(failingPaths({ ...validMember, displayName: '   ' })).toEqual([['displayName']])
    expect(failingPaths({ ...validMember, displayName: 'a'.repeat(256) })).toEqual([['displayName']])
  })

  it('applies the password policy', () => {
    expect(failingPaths({ ...validMember, password: 'initial123' })).toEqual([['password']])
  })

  it('rejects an unknown permission', () => {
    expect(failingPaths({ ...validMember, permissions: ['user.delete'] })).toEqual([['permissions', 0]])
  })
})

describe('member update schemas', () => {
  it('trims the display name', () => {
    expect(memberUserUpdateSchema.parse({ displayName: '  Ana  ' })).toEqual({ displayName: 'Ana' })
  })

  it('requires the permission list, even if empty', () => {
    expect(memberUserPermissionsSchema.safeParse({ permissions: [] }).success).toBe(true)
    expect(memberUserPermissionsSchema.safeParse({}).success).toBe(false)
  })
})
