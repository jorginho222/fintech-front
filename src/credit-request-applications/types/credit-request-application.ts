import type { Company } from '@/company/types/company'

export type CreditRequestApplicationStatus =
  | 'evaluation_pending'
  | 'approved'
  | 'rejected'

export interface CreditRequestApplicationCompany extends Company {
  score: number
}

export interface CreditRequestApplication {
  id: string
  amount: string
  installmentQuantity: number
  status: CreditRequestApplicationStatus
  rejectionReason: string | null
  creditRequestId: string | null
  company: CreditRequestApplicationCompany
}

export interface CreditRequestApplicationCreate {
  amount: number
  installmentQuantity: number
}
