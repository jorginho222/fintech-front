import { z } from 'zod'

export const companyUserLoginSchema = z.object({
  taxIdentifier: z
    .string()
    .trim()
    .regex(/^\d{11}$/, 'El CUIT/CUIL debe tener exactamente 11 dígitos, sin guiones'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export type CompanyUserLoginInput = z.input<typeof companyUserLoginSchema>
export type CompanyUserLoginOutput = z.output<typeof companyUserLoginSchema>
