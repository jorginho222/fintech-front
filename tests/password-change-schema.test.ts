import { describe, expect, it } from 'vitest'

import { passwordChangeSchema } from '@/company/schemas/password-change-schema'

describe('passwordChangeSchema', () => {
  it('outputs the backend payload without the confirmation', () => {
    const result = passwordChangeSchema.parse({
      currentPassword: 'Initial123!',
      newPassword: 'Changed123!',
      newPasswordConfirmation: 'Changed123!',
    })

    expect(result).toEqual({ currentPassword: 'Initial123!', newPassword: 'Changed123!' })
  })

  it('rejects a confirmation that does not match', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'Initial123!',
      newPassword: 'Changed123!',
      newPasswordConfirmation: 'Changed123?',
    })

    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['newPasswordConfirmation']])
  })

  it('rejects a new password equal to the current one', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'Initial123!',
      newPassword: 'Initial123!',
      newPasswordConfirmation: 'Initial123!',
    })

    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['newPassword']])
  })
})
