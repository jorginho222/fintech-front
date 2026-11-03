import type { InstallmentPaymentAttemptStatus } from '@/credit-requests/types/installment-payment-attempt'

export type CreditRequestStatus = 'proposal' | 'proposal_expired' | 'active' | 'paid'
export type InstallmentStatus = 'pending' | 'paid' | 'overdue'

export interface CreditRequestInstallment {
  id: string
  periodNumber: number
  capitalAmount: string | number
  interestAmount: string | number
  taxOnInterestAmount: string | number
  totalAmount: string | number
  dueDate: string | null
  status: InstallmentStatus
  lastPaymentAttemptStatus: InstallmentPaymentAttemptStatus | null
  lastPaymentAttemptAt: string | null
}

export interface CreditRequest {
  id: string
  reference: string
  status: CreditRequestStatus
  approvalLimitDate: string
  totalAmount: string | number
  nominalInterestRate: string | number
  installmentQuantity: number
  paidInstallments: number
  proposalDate: string
  activationDate: string | null
  upcomingInstallment: CreditRequestInstallment | null
  installments: CreditRequestInstallment[]
}
