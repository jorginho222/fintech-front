import { describe, expect, it } from 'vitest'

import { companyUserLoginSchema } from '@/company/schemas/company-user-login-schema'

describe('companyUserLoginSchema', () => {
  it('accepts an 11-digit tax identifier and outputs it as taxIdentifier', () => {
    const result = companyUserLoginSchema.parse({ taxIdentifier: ' 20301234567 ', password: 'secret' })

    expect(result).toEqual({ taxIdentifier: '20301234567', password: 'secret' })
  })

  it.each(['2030123456', '203012345678', '20-30123456-7', 'abcdefghijk'])(
    'rejects %s',
    (taxIdentifier) => {
      expect(companyUserLoginSchema.safeParse({ taxIdentifier, password: 'secret' }).success).toBe(false)
    },
  )

  it('requires a password', () => {
    expect(companyUserLoginSchema.safeParse({ taxIdentifier: '20301234567', password: '' }).success).toBe(false)
  })
})
