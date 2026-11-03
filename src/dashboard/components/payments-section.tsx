import { usePermissionGate } from '@/company/hooks/use-permissions'
import { buildInstallmentPayUrl } from '@/credit-requests/installment-to-pay'
import {
  formatPaymentAttemptDate,
  getPaymentAttemptLabel,
  getPaymentAttemptTextClassName,
  isPaymentProcessing,
} from '@/credit-requests/types/installment-payment-attempt'
import { DashboardStatsCard } from '@/dashboard/components/dashboard-stats-card'
import { formatDueDate } from '@/dashboard/format-due-date'
import { useDashboardStats } from '@/dashboard/hooks/use-dashboard-stats'
import { ROUTE_ACCESS } from '@/navigation'
import { fetchDashboardPayments } from '@/payments-calendar/api/payments-calendar-api'
import type { DashboardPaymentList } from '@/payments-calendar/schemas/dashboard-payments-schema'
import { GatedLink } from '@/shared/components/gated-link'

const currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

interface PaymentListProps {
  title: string
  list: DashboardPaymentList
  emptyMessage?: string
  overdue: boolean
  payGate: { allowed: boolean; reason: string }
}

function PaymentList({ title, list, emptyMessage, overdue, payGate }: PaymentListProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className={`text-sm font-medium ${overdue ? 'text-rose-300' : 'text-slate-300'}`}>{title}</h3>
        <p className={`text-base font-semibold ${overdue ? 'text-rose-300' : 'text-slate-100'}`}>
          {currencyFormatter.format(Number(list.totalAmount))}
        </p>
      </div>

      {list.installments.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <ul className="flex max-h-80 flex-col divide-y divide-slate-800 overflow-y-auto">
          {list.installments.map((installment) => {
            const attemptLabel = getPaymentAttemptLabel(installment.lastPaymentAttemptStatus)

            return (
              <li key={installment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 max-w-full">
                  <p className="truncate text-sm font-medium text-slate-100">{installment.creditRequestReference}</p>
                  <p className="text-xs text-slate-400">
                    Cuota {installment.periodNumber}/{installment.creditRequestInstallmentQuantity} · Vence{' '}
                    <span className={overdue || installment.status === 'overdue' ? 'text-rose-300' : undefined}>
                      {formatDueDate(installment.dueDate)}
                    </span>
                  </p>
                  {attemptLabel && (
                    <p className={`mt-0.5 text-xs ${getPaymentAttemptTextClassName(installment.lastPaymentAttemptStatus)}`}>
                      {attemptLabel} · {formatPaymentAttemptDate(installment.lastPaymentAttemptAt)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-slate-100">
                    {currencyFormatter.format(Number(installment.totalAmount))}
                  </span>
                  {!isPaymentProcessing(installment.lastPaymentAttemptStatus) && (
                    <GatedLink
                      allowed={payGate.allowed}
                      reason={payGate.reason}
                      to={buildInstallmentPayUrl(installment.creditRequestId, installment.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
                    >
                      Pagar
                    </GatedLink>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function PaymentsSection() {
  const { stats, isLoading, error, retry } = useDashboardStats(fetchDashboardPayments)
  const payGate = usePermissionGate(ROUTE_ACCESS.creditRequestPay.permissions)
  const hasProcessingPayments = (stats?.processingPayments.installments.length ?? 0) > 0

  return (
    <DashboardStatsCard
      titleId="payments-title"
      title="Pagos"
      linkTo="/payments_calendar"
      linkLabel="Ver calendario"
      isLoading={isLoading}
      error={error}
      onRetry={retry}
    >
      {stats && (
        // With three lists, two columns would break the middle position of "Pagos en proceso".
        <div className={`grid grid-cols-1 gap-3 p-6 ${hasProcessingPayments ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <PaymentList
            title="Pagos del mes"
            list={stats.monthPayments}
            emptyMessage="No hay pagos del mes."
            overdue={false}
            payGate={payGate}
          />
          {hasProcessingPayments && (
            <PaymentList
              title="Pagos en proceso"
              list={stats.processingPayments}
              overdue={false}
              payGate={payGate}
            />
          )}
          <PaymentList
            title="Pagos vencidos"
            list={stats.overduePayments}
            emptyMessage="No hay pagos vencidos."
            overdue
            payGate={payGate}
          />
        </div>
      )}
    </DashboardStatsCard>
  )
}
