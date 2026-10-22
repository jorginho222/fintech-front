import { z } from 'zod'

import { displayNameSchema } from '@/member-users/schemas/member-user-schema-fields'

// Mirrors the backend `MemberUserUpdateDto`.
export const memberUserUpdateSchema = z.object({
  displayName: displayNameSchema,
})

export type MemberUserUpdateInput = z.input<typeof memberUserUpdateSchema>
export type MemberUserUpdateOutput = z.output<typeof memberUserUpdateSchema>
