import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { findCreditRequest, requestInstallmentPayment } from '@/credit-requests/api/credit-request-api'
import { selectInstallmentToPay } from '@/credit-requests/installment-to-pay'
import type { CreditRequest } from '@/credit-requests/types/credit-request'
import {
  formatPaymentAttemptDate,
  getPaymentAttemptLabel,
  getPaymentAttemptTextClassName,
  isPaymentProcessing,
} from '@/credit-requests/types/installment-payment-attempt'
import { ApiError } from '@/shared/api/api-error'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export function CreditRequestPayView() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const creditRequestId = searchParams.get('id')
  const installmentIdParam = searchParams.get('installmentId')
  const [creditRequest, setCreditRequest] = useState<CreditRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  // Without the param, stays on the installment being paid even if the upcoming one changes on reload.
  const [submittedInstallmentId, setSubmittedInstallmentId] = useState<string | null>(null)
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

  // After a pay request. If it fails, the screen keeps showing what it already has.
  const reloadCreditRequest = async () => {
    if (!creditRequestId) return

    try {
      setCreditRequest(await findCreditRequest(creditRequestId))
    } catch {
      // Nothing to add: the outcome of the pay request is already on screen.
    }
  }

  const installment = creditRequest
    ? selectInstallmentToPay(creditRequest, installmentIdParam ?? submittedInstallmentId)
    : null

  const handlePay = async () => {
    if (!installment) return

    setIsPaying(true)
    setError(null)
    setSubmittedInstallmentId(installment.id)

    try {
      const result = await requestInstallmentPayment(installment.id)
      setIsSubmitted(true)

      if (result) {
        setCreditRequest(result)
      } else {
        await reloadCreditRequest()
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo conectar con el servidor.')

      if (requestError instanceof ApiError && requestError.status === 409) {
        await reloadCreditRequest()
      }
    } finally {
      setIsConfirmOpen(false)
      setIsPaying(false)
    }
  }

  const backUrl = creditRequestId
    ? `/credit_requests/show?id=${encodeURIComponent(creditRequestId)}`
    : '/credit_requests'

  // Back to whichever view opened this one (calendar, credit detail, dashboard). The "default" key
  // means it's the first page of the session (e.g. opened from a bookmark): go to the credit instead.
  function goBack() {
    if (location.key === 'default') {
      navigate(backUrl)
    } else {
      navigate(-1)
    }
  }

  if (isLoading) return <p className="text-sm text-slate-400">Cargando cuota…</p>

  if (!creditRequest || !installment || installment.status === 'paid') {
    let message = error
    if (creditRequest && !installment) {
      message = installmentIdParam
        ? 'No se encontró la cuota indicada.'
        : (error ?? 'Este crédito no tiene una cuota pendiente para pagar.')
    } else if (creditRequest) {
      message = 'Esta cuota ya fue pagada.'
    }

    return (
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p role="alert" className="text-sm text-rose-400">{message}</p>
        <Link to={backUrl} className="mt-5 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
          Volver al crédito
        </Link>
      </div>
    )
  }

  const attempt = installment.lastPaymentAttemptStatus
  const attemptLabel = getPaymentAttemptLabel(attempt)
  const isProcessing = isPaymentProcessing(attempt)
  const position = `${installment.periodNumber}/${creditRequest.installmentQuantity}`
  const amount = currencyFormatter.format(Number(installment.totalAmount))

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Pagar cuota crédito: {creditRequest.reference}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {isSubmitted || isProcessing ? `Cuota ${position}` : `Confirme el pago de la cuota ${position}`}
        </p>
      </div>

      <div className="p-6">
        {isSubmitted && (
          <p role="status" className="mb-5 rounded-lg border border-emerald-800/70 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
            Su solicitud de pago fue enviada correctamente. Le notificaremos el resultado por correo electrónico.
          </p>
        )}

        <p className="text-xs uppercase tracking-wide text-slate-500">Total a pagar</p>
        <p className="mt-2 text-3xl font-semibold text-slate-100">{amount}</p>

        {attemptLabel && (
          <p className={`mt-4 text-sm font-medium ${getPaymentAttemptTextClassName(attempt)}`}>
            {attemptLabel} · {formatPaymentAttemptDate(installment.lastPaymentAttemptAt)}
          </p>
        )}
        {attempt === 'processing_timeout' && (
          <p className="mt-1 text-sm text-slate-400">Puede volver a intentarlo: la cuota no se cobrará dos veces.</p>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-800 p-6">
        {isProcessing || isSubmitted ? (
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Volver
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98]"
            >
              Pagar
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Confirmar pago"
        confirmLabel={isPaying ? 'Enviando pago…' : 'Confirmar pago'}
        cancelLabel="Cancelar"
        isConfirming={isPaying}
        onConfirm={() => void handlePay()}
        onCancel={() => setIsConfirmOpen(false)}
      >
        <p>
          ¿Confirma el pago de la cuota {position} por <span className="font-semibold text-slate-100">{amount}</span>?
        </p>
      </ConfirmDialog>
    </div>
  )
}
