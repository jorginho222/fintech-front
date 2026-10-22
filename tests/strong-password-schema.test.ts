import { describe, expect, it } from 'vitest'

import { companyRegistrationSchema } from '@/company/schemas/company-registration-schema'
import { strongPasswordSchema } from '@/company/schemas/strong-password-schema'

function messagesFor(password: string): string[] {
  const result = strongPasswordSchema.safeParse(password)

  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('strongPasswordSchema', () => {
  it('accepts a password meeting every rule', () => {
    expect(strongPasswordSchema.safeParse('Secret123!').success).toBe(true)
  })

  it.each([
    ['Sec1!', 'al menos 8 caracteres'],
    ['secret123!', 'una letra mayúscula'],
    ['Secret!!x', 'un número'],
    ['Secret1234', 'un carácter especial'],
  ])('rejects %s for missing %s', (password, rule) => {
    const messages = messagesFor(password)

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain(rule)
  })

  it('lists every unmet rule at once', () => {
    expect(messagesFor('abc')).toEqual([
      'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un carácter especial.',
    ])
  })

  it('is applied by the company registration schema', () => {
    const result = companyRegistrationSchema.safeParse({
      id: '3f1c0d2e-8b4a-4c6d-9e7f-1a2b3c4d5e6f',
      socialReason: 'Acme S.A.',
      cuit: '30712345678',
      email: 'contacto@acme.com',
      taxStatus: 'monotributo',
      password: 'Secret!!x',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['password'])
  })
})
