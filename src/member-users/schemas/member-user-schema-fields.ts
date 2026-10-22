import { z } from 'zod'

import { PERMISSIONS } from '@/company/types/permission'

// Field rules shared by the member create/update schemas, mirroring the backend DTOs.
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(255, 'El nombre no puede superar los 255 caracteres')

export const permissionsSchema = z.array(z.enum(PERMISSIONS, 'Permiso desconocido'))
