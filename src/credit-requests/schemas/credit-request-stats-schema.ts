import { z } from 'zod'

// Validates the stats response, so a malformed one is an error instead of rendering `NaN`.
export const creditRequestStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  // Null when the company has no active credit requests.
  paidPercentage: z.number().min(0).max(100).nullable(),
})

export type CreditRequestStats = z.output<typeof creditRequestStatsSchema>
