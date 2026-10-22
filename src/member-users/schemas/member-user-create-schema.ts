import { z } from 'zod'

import { strongPasswordSchema } from '@/company/schemas/strong-password-schema'
import { displayNameSchema, permissionsSchema } from '@/member-users/schemas/member-user-schema-fields'

// Mirrors the backend `MemberUserCreateDto`.
export const memberUserCreateSchema = z.object({
  id: z.uuidv4('El id debe ser un UUID v4'),
  taxIdentifier: z
    .string()
    .trim()
    .regex(/^\d{11}$/, 'El CUIL debe tener exactamente 11 dígitos, sin guiones'),
  displayName: displayNameSchema,
  password: strongPasswordSchema,
  permissions: permissionsSchema,
})

export type MemberUserCreateInput = z.input<typeof memberUserCreateSchema>
export type MemberUserCreateOutput = z.output<typeof memberUserCreateSchema>
