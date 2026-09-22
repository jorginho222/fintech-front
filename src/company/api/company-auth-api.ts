import type {
  Company,
  CompanyCredentials,
  CompanyLoginResult,
  CompanyRegistration,
} from '@/company/types/company'
import { apiJsonRequest } from '@/shared/api/api-client'

export function loginCompany(credentials: CompanyCredentials): Promise<CompanyLoginResult> {
  return apiJsonRequest<CompanyLoginResult>('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function registerCompany(registration: CompanyRegistration): Promise<Company> {
  return apiJsonRequest<Company>('/company_registration', {
    method: 'POST',
    body: JSON.stringify(registration),
  })
}

export function logoutCompany(): Promise<void> {
  return apiJsonRequest<void>('/logout', {
    method: 'POST',
  })
}
