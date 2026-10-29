import { z } from 'zod'

// Amounts arrive as decimal strings ("1234.56"); numbers are accepted too, as in the calendar types.
const amount = z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().nonnegative()])

// Only the fields the dashboard shows are validated; the rest of the installment is stripped.
export const dashboardPaymentSchema = z.object({
  id: z.string(),
  periodNumber: z.number().int().positive(),
  totalAmount: amount,
  dueDate: z.string().nullable(),
  creditRequestId: z.string(),
  creditRequestReference: z.string(),
  creditRequestInstallmentQuantity: z.number().int().positive(),
})

export const dashboardPaymentListSchema = z.object({
  totalAmount: amount,
  installments: z.array(dashboardPaymentSchema),
})

export const dashboardPaymentsSchema = z.object({
  monthPayments: dashboardPaymentListSchema,
  overduePayments: dashboardPaymentListSchema,
})

export type DashboardPayment = z.output<typeof dashboardPaymentSchema>
export type DashboardPaymentList = z.output<typeof dashboardPaymentListSchema>
export type DashboardPayments = z.output<typeof dashboardPaymentsSchema>
