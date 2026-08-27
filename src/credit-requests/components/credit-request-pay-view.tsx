import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { findCreditRequest, payInstallment } from '@/credit-requests/api/credit-request-api'
import type { CreditRequest } from '@/credit-requests/types/credit-request'
import { ApiError } from '@/shared/api/api-error'

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export function CreditRequestPayView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const creditRequestId = searchParams.get('id')
  const [creditRequest, setCreditRequest] = useState<CreditRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!creditRequestId) {
      setError('No se indicó el crédito cuya cuota se desea pagar.')
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

  const handlePay = async () => {
    const installment = creditRequest?.upcomingInstallment
    if (!installment) return

    setIsPaying(true)
    setError(null)

    try {
      await payInstallment(installment.id)
      navigate(-1)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo conectar con el servidor.')
      setIsPaying(false)
    }
  }

  const backUrl = creditRequestId
    ? `/credit_requests/show?id=${encodeURIComponent(creditRequestId)}`
    : '/credit_requests'

  if (isLoading) return <p className="text-sm text-slate-400">Cargando cuota…</p>

  if (!creditRequest?.upcomingInstallment) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p role="alert" className="text-sm text-rose-400">
          {error ?? 'Este crédito no tiene una cuota pendiente para pagar.'}
        </p>
        <Link to={backUrl} className="mt-5 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
          Volver al crédito
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Pagar cuota</h1>
        <p className="mt-1 text-sm text-slate-400">
          Confirmá el pago de la cuota N.º {creditRequest.upcomingInstallment.periodNumber}.
        </p>
      </div>

      <div className="p-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">Total a pagar</p>
        <p className="mt-2 text-3xl font-semibold text-slate-100">
          {currencyFormatter.format(Number(creditRequest.upcomingInstallment.totalAmount))}
        </p>
        {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-800 p-6">
        <Link to={backUrl} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white">
          Cancelar
        </Link>
        <button
          type="button"
          disabled={isPaying}
          onClick={() => void handlePay()}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPaying ? 'Pagando…' : 'Confirmar pago'}
        </button>
      </div>
    </div>
  )
}
