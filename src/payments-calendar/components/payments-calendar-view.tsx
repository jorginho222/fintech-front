import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { searchPendingInstallmentsToPay } from '@/payments-calendar/api/payments-calendar-api'
import type { PendingInstallment, PendingInstallmentsToPay } from '@/payments-calendar/types/payments-calendar'
import type { InstallmentStatus } from '@/credit-requests/types/credit-request'
import { ApiError } from '@/shared/api/api-error'

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const INSTALLMENT_STATUS_DOT_STYLES: Record<InstallmentStatus, string> = {
  pending: 'bg-amber-400',
  paid: 'bg-emerald-400',
  overdue: 'bg-rose-400',
}

const currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

function getDueDay(dueDate: string | null): number | null {
  if (!dueDate) return null
  const match = /^\d{4}-\d{2}-(\d{2})/.exec(dueDate)
  return match?.[1] ? Number(match[1]) : null
}

export function PaymentsCalendarView() {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [data, setData] = useState<PendingInstallmentsToPay | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInstallments = useCallback(() => {
    let isCurrent = true
    setIsLoading(true)
    setError(null)

    void searchPendingInstallmentsToPay(month, year)
      .then((result) => {
        if (isCurrent) setData(result)
      })
      .catch((requestError: unknown) => {
        if (!isCurrent) return
        setData(null)
        setError(requestError instanceof ApiError ? requestError.message : 'No se pudo conectar con el servidor.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [month, year])

  useEffect(() => fetchInstallments(), [fetchInstallments])

  const installmentsByDay = useMemo(() => {
    const map = new Map<number, PendingInstallment[]>()

    for (const installment of data?.installments ?? []) {
      const day = getDueDay(installment.dueDate)
      if (day === null) continue

      const dayInstallments = map.get(day) ?? []
      dayInstallments.push(installment)
      map.set(day, dayInstallments)
    }

    return map
  }, [data])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  const calendarCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  const handlePrevMonth = () => {
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
    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Calendario de pagos</h1>
          <p className="mt-1 text-sm text-slate-400">Cuotas pendientes de pago del mes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Mes anterior"
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            ‹
          </button>
          <span className="min-w-36 text-center text-sm font-medium text-slate-100">
            {MONTH_LABELS[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Mes siguiente"
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            ›
          </button>
        </div>
      </div>

      {isLoading && <p className="p-6 text-sm text-slate-400">Cargando cuotas…</p>}

      {!isLoading && error && (
        <div className="flex items-center justify-between gap-4 p-6">
          <p role="alert" className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => fetchInstallments()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarCells.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} />
              }

              const dayInstallments = installmentsByDay.get(day) ?? []
              const hasInstallments = dayInstallments.length > 0
              const isToday = isCurrentMonth && day === today.getDate()

              return (
                <div
                  key={day}
                  className={`flex min-h-20 flex-col gap-1 rounded-lg border p-2 text-left ${
                    isToday ? 'border-emerald-600' : 'border-slate-800'
                  } ${hasInstallments ? 'bg-slate-800/60' : 'bg-slate-950/40'}`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  {dayInstallments.map((installment) => (
                    <Link
                      key={installment.id}
                      to={`/credit_requests/pay?id=${encodeURIComponent(installment.creditRequestId)}`}
                      title={`Cuota N.º ${installment.periodNumber} — ${currencyFormatter.format(Number(installment.totalAmount))}`}
                      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] font-medium text-slate-100 transition hover:bg-slate-700"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${INSTALLMENT_STATUS_DOT_STYLES[installment.status]}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {currencyFormatter.format(Number(installment.totalAmount))}
                      </span>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-slate-300">Total del mes</p>
            <p className="text-lg font-semibold text-slate-100">
              {currencyFormatter.format(Number(data?.totalAmount ?? 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
