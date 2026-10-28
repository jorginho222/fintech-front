import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchCreditRequestApplicationStats } from '@/credit-request-applications/api/credit-request-application-api'
import type { CreditRequestApplicationStats } from '@/credit-request-applications/schemas/credit-request-application-stats-schema'
import { CREDIT_REQUEST_APPLICATION_STATUS_CLASS_NAMES } from '@/credit-request-applications/types/credit-request-application-status'
import { ApiError } from '@/shared/api/api-error'

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
  const [stats, setStats] = useState<CreditRequestApplicationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setStats(await fetchCreditRequestApplicationStats())
    } catch (requestError: unknown) {
      setStats(null)
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar las estadísticas.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  return (
    <section
      aria-labelledby="credit-request-application-stats-title"
      className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left shadow-xl shadow-black/40"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 p-6">
        <h2 id="credit-request-application-stats-title" className="text-lg font-semibold text-slate-100">
          Solicitudes de crédito
        </h2>
        <Link
          to="/credit_request_applications"
          className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
        >
          Ver solicitudes
        </Link>
      </div>

      {isLoading && <p className="p-6 text-sm text-slate-400">Cargando estadísticas…</p>}

      {!isLoading && error && (
        <div className="flex items-center justify-between gap-4 p-6">
          <p role="alert" className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void fetchStats()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && stats && (
        <dl className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
          {STAT_TILES.map((tile) => (
            <div key={tile.key} className={`flex flex-col-reverse gap-1 rounded-xl p-4 ${tile.className}`}>
              <dt className="text-xs font-medium">{tile.label}</dt>
              <dd className="text-2xl font-semibold">{stats[tile.key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
