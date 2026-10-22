import { z } from 'zod'

import { strongPasswordSchema } from '@/company/schemas/strong-password-schema'

// Mirrors the backend `PasswordChangeDto`; the confirmation is frontend-only and dropped on output.
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: strongPasswordSchema,
    newPasswordConfirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.newPasswordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['newPasswordConfirmation'],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  })
  .transform(({ currentPassword, newPassword }) => ({ currentPassword, newPassword }))

export type PasswordChangeInput = z.input<typeof passwordChangeSchema>
export type PasswordChangeOutput = z.output<typeof passwordChangeSchema>
