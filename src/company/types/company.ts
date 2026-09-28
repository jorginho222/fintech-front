import { v4 as uuidv4 } from 'uuid'

export const TAX_STATUSES = [
  'monotributo',
  'responsable_inscripto',
  'exento',
  'consumidor_final',
] as const

export type TaxStatus = (typeof TAX_STATUSES)[number]

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  monotributo: 'Monotributo',
  responsable_inscripto: 'Responsable Inscripto',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
}

export interface Company {
  id: string
  socialReason: string
  cuit: string
  email: string
  taxStatus: TaxStatus
}

export interface CompanyRegistration extends Company {
  password: string
}

export type CompanyRegistrationDraft = Omit<CompanyRegistration, 'taxStatus'> & {
  taxStatus: TaxStatus | ''
}

export function createDefaultCompanyRegistration(): CompanyRegistrationDraft {
  return {
    id: uuidv4(),
    socialReason: '',
    cuit: '',
    email: '',
    taxStatus: '',
    password: '',
  }
}

export interface CompanyCredentials {
  cuit: string
  password: string
}

export interface AuthToken {
  token: string
  expiresAt: string
}

export interface CompanyAuthResult {
  accessToken: AuthToken
  refreshToken: AuthToken
  company: Company
}
