import { z } from 'zod'

import { permissionsSchema } from '@/member-users/schemas/member-user-schema-fields'

// Mirrors the backend `MemberUserPermissionsUpdateDto`: the list is required, even when empty.
export const memberUserPermissionsSchema = z.object({
  permissions: permissionsSchema,
})

export type MemberUserPermissionsInput = z.input<typeof memberUserPermissionsSchema>
export type MemberUserPermissionsOutput = z.output<typeof memberUserPermissionsSchema>
