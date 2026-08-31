import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { findCreditRequest } from '@/credit-requests/api/credit-request-api'
import type { CreditRequest, CreditRequestStatus, InstallmentStatus } from '@/credit-requests/types/credit-request'
import { ApiError } from '@/shared/api/api-error'

const CREDIT_STATUS_LABELS: Record<CreditRequestStatus, string> = {
  proposal: 'Propuesta',
  proposal_expired: 'Propuesta vencida',
  active: 'Activo',
  paid: 'Pagado',
}

const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  overdue: 'Vencida',
}

const CREDIT_STATUS_STYLES: Record<CreditRequestStatus, string> = {
  proposal: 'border-sky-800/80 bg-sky-950/60 text-sky-300',
  proposal_expired: 'border-rose-800/80 bg-rose-950/60 text-rose-300',
  active: 'border-amber-800/80 bg-amber-950/60 text-amber-300',
  paid: 'border-emerald-800/80 bg-emerald-950/60 text-emerald-300',
}

const INSTALLMENT_STATUS_STYLES: Record<InstallmentStatus, string> = {
  pending: 'border-amber-800/80 bg-amber-950/60 text-amber-300',
  paid: 'border-emerald-800/80 bg-emerald-950/60 text-emerald-300',
  overdue: 'border-rose-800/80 bg-rose-950/60 text-rose-300',
}

function StatusIcon({ status }: { status: CreditRequestStatus | InstallmentStatus }) {
  if (status === 'paid') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
        <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (status === 'proposal_expired' || status === 'overdue') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
        <path d="M10 7v4m0 3h.01M8.3 3.8 2.4 14a2 2 0 0 0 1.7 3h11.8a2 2 0 0 0 1.7-3L11.7 3.8a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (status === 'active') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
        <path d="M10 2v3m0 10v3M2 10h3m10 0h3M5 5l2 2m6 6 2 2m0-10-2 2m-6 6-2 2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatusBadge({
  label,
  status,
  className,
}: {
  label: string
  status: CreditRequestStatus | InstallmentStatus
  className: string
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${className}`}>
      <StatusIcon status={status} />
      {label}
    </span>
  )
}

const currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
const numberFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-AR')
}

function SummaryCard({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {children ?? <p className="mt-2 text-lg font-semibold text-slate-100">{value}</p>}
    </div>
  )
}

export function CreditRequestShowView() {
  const [searchParams] = useSearchParams()
  const creditRequestId = searchParams.get('id')
  const [creditRequest, setCreditRequest] = useState<CreditRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!creditRequestId) {
      setError('No se indicó el crédito que se desea ver.')
      setIsLoading(false)
      return
    }

    let isCurrent = true
    setIsLoading(true)
    setError(null)

    void findCreditRequest(creditRequestId)
      .then((result) => {
        if (isCurrent) setCreditRequest(result)
      })
      .catch((requestError: unknown) => {
        if (!isCurrent) return
        setError(requestError instanceof ApiError ? requestError.message : 'No se pudo conectar con el servidor.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [creditRequestId])

  if (isLoading) return <p className="text-sm text-slate-400">Cargando crédito…</p>

  if (!creditRequest) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p role="alert" className="text-sm text-rose-400">{error}</p>
        <Link to="/credit_requests" className="mt-5 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
          Volver a créditos
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Detalle del crédito</h1>
          <p className="mt-1 text-sm text-slate-400">Información y cronograma de cuotas.</p>
        </div>
        <Link to="/credit_requests" className="text-sm font-medium text-slate-300 hover:text-white">Volver</Link>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Estado">
          <div className="mt-2">
            <StatusBadge
              label={CREDIT_STATUS_LABELS[creditRequest.status]}
              status={creditRequest.status}
              className={CREDIT_STATUS_STYLES[creditRequest.status]}
            />
          </div>
        </SummaryCard>
        <SummaryCard label="Monto total" value={currencyFormatter.format(Number(creditRequest.totalAmount))} />
        <SummaryCard label="Tasa nominal" value={`${numberFormatter.format(Number(creditRequest.nominalInterestRate))}%`} />
        <SummaryCard label="Fecha de confirmación" value={formatDate(creditRequest.activationDate)} />
        <SummaryCard label="Cantidad de cuotas" value={String(creditRequest.installmentQuantity)} />
        <SummaryCard label="Cuotas pagas" value={String(creditRequest.paidInstallments)} />
      </div>

      {creditRequest.upcomingInstallment && (
        <div className="border-t border-slate-800 p-6">
          <div className="rounded-xl border border-emerald-800/70 bg-emerald-950/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Próxima cuota</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Cuota N.º {creditRequest.upcomingInstallment.periodNumber}
                </p>
              </div>
              <Link
                to={`/credit_requests/pay?id=${encodeURIComponent(creditRequest.id)}`}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98]"
              >
                Pagar cuota
              </Link>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Total</dt>
                <dd className="mt-1 font-semibold text-slate-100">
                  {currencyFormatter.format(Number(creditRequest.upcomingInstallment.totalAmount))}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Vencimiento</dt>
                <dd className="mt-1 text-slate-300">{formatDate(creditRequest.upcomingInstallment.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Estado</dt>
                <dd className="mt-1">
                  <StatusBadge
                    label={INSTALLMENT_STATUS_LABELS[creditRequest.upcomingInstallment.status]}
                    status={creditRequest.upcomingInstallment.status}
                    className={INSTALLMENT_STATUS_STYLES[creditRequest.upcomingInstallment.status]}
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <div className="border-t border-slate-800">
        <h2 className="px-6 pt-6 text-lg font-semibold text-slate-100">Cuotas</h2>
        <div className="overflow-x-auto p-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">N.º</th>
                <th scope="col" className="px-4 py-3">Capital</th>
                <th scope="col" className="px-4 py-3">Interés</th>
                <th scope="col" className="px-4 py-3">IVA interés</th>
                <th scope="col" className="px-4 py-3">Total</th>
                <th scope="col" className="px-4 py-3">Vencimiento</th>
                <th scope="col" className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {creditRequest.installments.map((installment) => (
                <tr key={installment.id}>
                  <td className="px-4 py-3 text-slate-300">{installment.periodNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{currencyFormatter.format(Number(installment.capitalAmount))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{currencyFormatter.format(Number(installment.interestAmount))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{currencyFormatter.format(Number(installment.taxOnInterestAmount))}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-100">{currencyFormatter.format(Number(installment.totalAmount))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{formatDate(installment.dueDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge
                      label={INSTALLMENT_STATUS_LABELS[installment.status]}
                      status={installment.status}
                      className={INSTALLMENT_STATUS_STYLES[installment.status]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
