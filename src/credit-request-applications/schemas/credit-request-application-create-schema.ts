import { z } from 'zod'

const positiveInteger = (requiredMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .regex(/^\d+$/, 'Ingresá un número entero positivo')
    .transform(Number)
    .refine((value) => value > 0, 'El valor debe ser mayor que cero')

export const creditRequestApplicationCreateSchema = z.object({
  amount: positiveInteger('El monto es obligatorio'),
  installmentQuantity: positiveInteger('La cantidad de cuotas es obligatoria'),
})

export type CreditRequestApplicationCreateInput = z.input<
  typeof creditRequestApplicationCreateSchema
>
export type CreditRequestApplicationCreateOutput = z.output<
  typeof creditRequestApplicationCreateSchema
>
