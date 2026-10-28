import type { Company } from '@/company/types/company'

export type CreditRequestApplicationStatus =
  | 'evaluation_pending'
  | 'approved'
  | 'rejected'

export interface CreditRequestApplicationCompany extends Company {
  score: number
}

export interface CreditRequestApplicationCreditRequest {
  id: string
  reference: string
  status: string
}

export interface CreditRequestApplication {
  id: string
  reference: string
  amount: string
  installmentQuantity: number
  status: CreditRequestApplicationStatus
  rejectionReason: string | null
  createdAt: string
  creditRequest: CreditRequestApplicationCreditRequest | null
  company: CreditRequestApplicationCompany
}

export interface CreditRequestApplicationCreate {
  reference: string
  amount: number
  installmentQuantity: number
}
