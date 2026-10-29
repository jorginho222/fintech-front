import { z } from 'zod'

const count = z.number().int().nonnegative()

// Validates the stats response, so a malformed one is an error instead of rendering `NaN`.
export const creditRequestApplicationStatsSchema = z.object({
  total: count,
  approved: count,
  rejected: count,
  evaluationPending: count,
})

export type CreditRequestApplicationStats = z.output<typeof creditRequestApplicationStatsSchema>
