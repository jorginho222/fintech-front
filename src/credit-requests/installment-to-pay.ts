import type { CreditRequest, CreditRequestInstallment } from '@/credit-requests/types/credit-request'

export function buildInstallmentPayUrl(creditRequestId: string, installmentId: string): string {
  const params = new URLSearchParams({ id: creditRequestId, installmentId })

  return `/credit_requests/pay?${params.toString()}`
}

// Without an id (e.g. an old bookmark) it's the credit's upcoming installment.
export function selectInstallmentToPay(
  creditRequest: CreditRequest,
  installmentId: string | null,
): CreditRequestInstallment | null {
  if (installmentId === null) return creditRequest.upcomingInstallment

  return creditRequest.installments.find((installment) => installment.id === installmentId) ?? null
}
