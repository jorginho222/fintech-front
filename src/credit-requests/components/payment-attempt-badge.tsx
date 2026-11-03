import {
  formatPaymentAttemptDate,
  getPaymentAttemptLabel,
  hasFailedPaymentAttempt,
  type InstallmentPaymentAttemptStatus,
} from '@/credit-requests/types/installment-payment-attempt'

interface PaymentAttemptBadgeProps {
  status: InstallmentPaymentAttemptStatus | null
  at: string | null
}

export function PaymentAttemptBadge({ status, at }: PaymentAttemptBadgeProps) {
  const label = getPaymentAttemptLabel(status)
  if (label === null) return null

  const isFailed = hasFailedPaymentAttempt(status)
  const detail = `Último intento: ${formatPaymentAttemptDate(at)}. Puede volver a pagar esta cuota.`

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${
        isFailed
          ? 'border-orange-800/80 bg-orange-950/60 text-orange-300'
          : 'border-amber-800/80 bg-amber-950/60 text-amber-300'
      }`}
    >
      {label}
      {isFailed && (
        <span title={detail}>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <circle cx="10" cy="10" r="7.5" />
            <path d="M10 9v4.5M10 6.5h.01" strokeLinecap="round" />
          </svg>
          <span className="sr-only">{detail}</span>
        </span>
      )}
    </span>
  )
}
