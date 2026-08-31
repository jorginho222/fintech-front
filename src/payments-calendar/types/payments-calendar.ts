import type { InstallmentStatus } from '@/credit-requests/types/credit-request'

export interface PendingInstallment {
  id: string
  periodNumber: number
  capitalAmount: string | number
  interestAmount: string | number
  taxOnInterestAmount: string | number
  totalAmount: string | number
  penaltyInterestAmount: string | number
  penaltyIva21Tax: string | number
  dueDate: string | null
  status: InstallmentStatus
  creditRequestId: string
}

export interface PendingInstallmentsToPay {
  totalAmount: string | number
  installments: PendingInstallment[]
}
