import { z } from 'zod'

export const companyLoginSchema = z.object({
  cuit: z
    .string()
    .trim()
    .regex(/^\d{11}$/, 'El CUIT debe tener exactamente 11 dígitos, sin guiones'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export type CompanyLoginInput = z.input<typeof companyLoginSchema>
export type CompanyLoginOutput = z.output<typeof companyLoginSchema>
