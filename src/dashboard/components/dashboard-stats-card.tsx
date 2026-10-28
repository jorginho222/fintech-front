import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface DashboardStatsCardProps {
  titleId: string
  title: string
  linkTo: string
  linkLabel: string
  isLoading: boolean
  error: string | null
  onRetry: () => void
  // The figures, rendered once loaded without errors.
  children: ReactNode
}

export function DashboardStatsCard({
  titleId,
  title,
  linkTo,
  linkLabel,
  isLoading,
  error,
  onRetry,
  children,
}: DashboardStatsCardProps) {
  return (
    <section
      aria-labelledby={titleId}
      className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left shadow-xl shadow-black/40"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 p-6">
        <h2 id={titleId} className="text-lg font-semibold text-slate-100">
          {title}
        </h2>
        <Link to={linkTo} className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300">
          {linkLabel}
        </Link>
      </div>

      {isLoading && <p className="p-6 text-sm text-slate-400">Cargando estadísticas…</p>}

      {!isLoading && error && (
        <div className="flex items-center justify-between gap-4 p-6">
          <p role="alert" className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && children}
    </section>
  )
}
