import { useCallback, useEffect, useMemo, useState } from 'react'

import { searchTotalDebt } from '@/total-debt/api/total-debt-api'
import type { TotalDebt } from '@/total-debt/types/total-debt'
import { ApiError } from '@/shared/api/api-error'

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MONTH_BUTTON_STYLES =
  'rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800'

const currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

export function TotalDebtView() {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [data, setData] = useState<TotalDebt | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTotalDebt = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setData(await searchTotalDebt(month, year))
    } catch (requestError: unknown) {
      setData(null)
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo conectar con el servidor.')
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    void fetchTotalDebt()
  }, [fetchTotalDebt])

  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth() + 1

  const handlePrevMonth = () => {
    if (isPrevDisabled) return

    if (month === 1) {
      setMonth(12)
      setYear((currentYear) => currentYear - 1)
    } else {
      setMonth((currentMonth) => currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((currentYear) => currentYear + 1)
    } else {
      setMonth((currentMonth) => currentMonth + 1)
    }
  }

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Deuda total</h1>
          <p className="mt-1 text-sm text-slate-400">Monto a pagar desde hoy hasta el mes seleccionado.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled || isLoading}
            aria-label="Mes anterior"
            className={MONTH_BUTTON_STYLES}
          >
            ‹
          </button>
          <span className="min-w-36 text-center text-sm font-medium text-slate-100">
            {MONTH_LABELS[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isLoading}
            aria-label="Mes siguiente"
            className={MONTH_BUTTON_STYLES}
          >
            ›
          </button>
        </div>
      </div>

      {isLoading && <p className="p-6 text-sm text-slate-400">Calculando deuda total…</p>}

      {!isLoading && error && (
        <div className="flex items-center justify-between gap-4 p-6">
          <p role="alert" className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void fetchTotalDebt()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="p-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-slate-300">
              Total hasta {MONTH_LABELS[month - 1]} {year}
            </p>
            <p className="text-lg font-semibold text-slate-100">
              {currencyFormatter.format(Number(data?.totalAmount ?? 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
