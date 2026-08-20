import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  confirmCreditRequest,
  findCreditRequest,
} from '@/credit-requests/api/credit-request-api'
import type {
  CreditRequest,
  CreditRequestStatus,
  InstallmentStatus,
} from '@/credit-requests/types/credit-request'
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

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const numberFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

function formatDate(value: string | null): string {
  if (!value) return '—'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-AR')
}

interface SummaryCardProps {
  label: string
  value: string
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  )
}

export function CreditRequestConfirmView() {
  const [searchParams] = useSearchParams()
  const creditRequestId = searchParams.get('id')
  const [creditRequest, setCreditRequest] = useState<CreditRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!creditRequestId) {
      setError('No se indicó el crédito que se desea confirmar.')
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
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'No se pudo conectar con el servidor.',
        )
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [creditRequestId])

  const handleConfirm = async () => {
    if (!creditRequestId) return

    setIsConfirming(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const confirmed = await confirmCreditRequest(creditRequestId)
      setCreditRequest(confirmed)
      setSuccessMessage('El crédito fue confirmado correctamente.')
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">Cargando crédito…</p>
  }

  if (!creditRequest) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p role="alert" className="text-sm text-rose-400">{error}</p>
        <Link to="/credit_request_applications" className="mt-5 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
          Volver a solicitudes
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Confirmar crédito
          </h1>
          <p className="mt-1 text-sm text-slate-400">Revisá la propuesta antes de confirmarla.</p>
        </div>
        <Link to="/credit_request_applications" className="text-sm font-medium text-slate-300 hover:text-white">
          Volver
        </Link>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Estado" value={CREDIT_STATUS_LABELS[creditRequest.status]} />
        <SummaryCard label="Monto total" value={currencyFormatter.format(Number(creditRequest.totalAmount))} />
        <SummaryCard label="Tasa nominal" value={`${numberFormatter.format(Number(creditRequest.nominalInterestRate))}%`} />
        <SummaryCard label="Cantidad de cuotas" value={String(creditRequest.installmentQuantity)} />
        <SummaryCard label="Válida hasta" value={creditRequest.approvalLimitDate} />
        <SummaryCard label="Fecha de creación" value={formatDate(creditRequest.createdAt)} />
      </div>

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
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{INSTALLMENT_STATUS_LABELS[installment.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4 border-t border-slate-800 p-6">
        {error && <p role="alert" className="mr-auto text-sm text-rose-400">{error}</p>}
        {successMessage && <p role="status" className="mr-auto text-sm text-emerald-400">{successMessage}</p>}
        {creditRequest.status === 'proposal' && (
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => void handleConfirm()}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming ? 'Confirmando…' : 'Confirmar crédito'}
          </button>
        )}
      </div>
    </div>
  )
}
