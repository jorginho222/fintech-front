import type {
  Company,
  CompanyUserCredentials,
  CompanyUserAuthResult,
  CompanyRegistration,
} from '@/company/types/company'
import type { CompanyUser } from '@/company/types/company-user'
import type { PasswordChangeOutput } from '@/company/schemas/password-change-schema'
import { apiJsonRequest } from '@/shared/api/api-client'
import { useAuthStore } from '@/store/auth-store'

export function loginCompanyUser(credentials: CompanyUserCredentials): Promise<CompanyUserAuthResult> {
  return apiJsonRequest<CompanyUserAuthResult>('/login', {
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

export function logoutCompanyUser(): Promise<void> {
  return apiJsonRequest<void>('/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: useAuthStore.getState().refreshToken }),
  })
}

export function fetchCurrentUser(): Promise<CompanyUser> {
  return apiJsonRequest<CompanyUser>('/me', { method: 'GET' })
}

export function changePassword(payload: PasswordChangeOutput): Promise<CompanyUser> {
  return apiJsonRequest<CompanyUser>('/me/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
