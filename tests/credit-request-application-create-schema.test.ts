import { describe, expect, it } from 'vitest'

import { creditRequestApplicationCreateSchema } from '@/credit-request-applications/schemas/credit-request-application-create-schema'

const validApplication = {
  reference: 'Capital de trabajo',
  amount: '100000',
  installmentQuantity: '12',
}

function failingPaths(input: unknown): PropertyKey[][] {
  const result = creditRequestApplicationCreateSchema.safeParse(input)

  return result.success ? [] : result.error.issues.map((issue) => issue.path)
}

describe('creditRequestApplicationCreateSchema', () => {
  it('outputs a trimmed reference and numeric fields', () => {
    expect(
      creditRequestApplicationCreateSchema.parse({ ...validApplication, reference: '  Capital de trabajo  ' }),
    ).toEqual({ reference: 'Capital de trabajo', amount: 100000, installmentQuantity: 12 })
  })

  it('rejects a blank reference', () => {
    expect(failingPaths({ ...validApplication, reference: '   ' })).toEqual([['reference']])
  })

  it('accepts a 60-character reference and rejects a longer one', () => {
    expect(failingPaths({ ...validApplication, reference: 'a'.repeat(60) })).toEqual([])
    expect(failingPaths({ ...validApplication, reference: 'a'.repeat(61) })).toEqual([['reference']])
  })
})
