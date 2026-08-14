import { z } from 'zod'
import { TAX_STATUSES, type TaxStatus } from '@/company/types/company'

const TAX_STATUS_REQUIRED = 'Seleccioná una condición fiscal'

export const companyRegistrationSchema = z.object({
  id: z.uuidv4('El id debe ser un UUID v4'),
  socialReason: z.string().trim().min(1, 'La razón social es obligatoria'),
  cuit: z
    .string()
    .trim()
    .regex(/^\d{11}$/, 'El CUIT debe tener exactamente 11 dígitos, sin guiones'),
  email: z.email('Ingresá un email válido'),
  taxStatus: z
    .union([z.enum(TAX_STATUSES), z.literal('')], TAX_STATUS_REQUIRED)
    .refine((value) => value !== '', TAX_STATUS_REQUIRED)
    // Safe: the refine above rules out the empty string.
    .transform((value) => value as TaxStatus),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(4096, 'La contraseña es demasiado larga')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/[^A-Za-z\d]/, 'La contraseña debe contener al menos un carácter especial'),
})

export type CompanyRegistrationInput = z.input<typeof companyRegistrationSchema>
export type CompanyRegistrationOutput = z.output<typeof companyRegistrationSchema>
