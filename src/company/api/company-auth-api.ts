import type {
  Company,
  CompanyCredentials,
  CompanyAuthResult,
  CompanyRegistration,
} from '@/company/types/company'
import { apiJsonRequest } from '@/shared/api/api-client'
import { useAuthStore } from '@/store/auth-store'

export function loginCompany(credentials: CompanyCredentials): Promise<CompanyAuthResult> {
  return apiJsonRequest<CompanyAuthResult>('/login', {
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
    body: JSON.stringify({ refreshToken: useAuthStore.getState().refreshToken }),
  })
}
