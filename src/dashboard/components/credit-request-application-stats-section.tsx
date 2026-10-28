import { fetchCreditRequestApplicationStats } from '@/credit-request-applications/api/credit-request-application-api'
import type { CreditRequestApplicationStats } from '@/credit-request-applications/schemas/credit-request-application-stats-schema'
import { CREDIT_REQUEST_APPLICATION_STATUS_CLASS_NAMES } from '@/credit-request-applications/types/credit-request-application-status'
import { DashboardStatsCard } from '@/dashboard/components/dashboard-stats-card'
import { useDashboardStats } from '@/dashboard/hooks/use-dashboard-stats'

interface StatTile {
  key: keyof CreditRequestApplicationStats
  label: string
  className: string
}

const STAT_TILES: readonly StatTile[] = [
  { key: 'total', label: 'Total de solicitudes', className: 'bg-slate-800/60 text-slate-100' },
  { key: 'approved', label: 'Aprobadas', className: CREDIT_REQUEST_APPLICATION_STATUS_CLASS_NAMES.approved },
  { key: 'rejected', label: 'Rechazadas', className: CREDIT_REQUEST_APPLICATION_STATUS_CLASS_NAMES.rejected },
  {
    key: 'evaluationPending',
    label: 'Pendientes de evaluación',
    className: CREDIT_REQUEST_APPLICATION_STATUS_CLASS_NAMES.evaluation_pending,
  },
]

export function CreditRequestApplicationStatsSection() {
  const { stats, isLoading, error, retry } = useDashboardStats(fetchCreditRequestApplicationStats)

  return (
    <DashboardStatsCard
      titleId="credit-request-application-stats-title"
      title="Solicitudes de crédito"
      linkTo="/credit_request_applications"
      linkLabel="Ver solicitudes"
      isLoading={isLoading}
      error={error}
      onRetry={retry}
    >
      {stats && (
        <dl className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
          {STAT_TILES.map((tile) => (
            <div key={tile.key} className={`flex flex-col-reverse gap-1 rounded-xl p-4 ${tile.className}`}>
              <dt className="text-xs font-medium">{tile.label}</dt>
              <dd className="text-2xl font-semibold">{stats[tile.key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </DashboardStatsCard>
  )
}
