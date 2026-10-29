import { fetchCreditRequestStats } from '@/credit-requests/api/credit-request-api'
import { DashboardStatsCard } from '@/dashboard/components/dashboard-stats-card'
import { formatPaidPercentage } from '@/dashboard/format-paid-percentage'
import { useDashboardStats } from '@/dashboard/hooks/use-dashboard-stats'

export function CreditRequestStatsSection() {
  const { stats, isLoading, error, retry } = useDashboardStats(fetchCreditRequestStats)

  return (
    <DashboardStatsCard
      titleId="credit-request-stats-title"
      title="Créditos en curso"
      linkTo="/credit_requests"
      linkLabel="Ver créditos"
      isLoading={isLoading}
      error={error}
      onRetry={retry}
    >
      {stats && (
        <dl className="grid grid-cols-2 gap-3 p-6">
          <div className="flex flex-col-reverse gap-1 rounded-xl bg-slate-800/60 p-4 text-slate-100">
            <dt className="text-xs font-medium">Total créditos</dt>
            <dd className="text-2xl font-semibold">{stats.total}</dd>
          </div>
          <div className="flex flex-col-reverse gap-1 rounded-xl bg-slate-800/60 p-4 text-slate-100">
            <dt className="text-xs font-medium">Porcentaje pagado</dt>
            <dd className="text-2xl font-semibold">{formatPaidPercentage(stats.paidPercentage)}</dd>
          </div>
        </dl>
      )}
    </DashboardStatsCard>
  )
}
