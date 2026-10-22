import type { CompanyUser } from '@/company/types/company-user'
import type { PermissionCatalogueGroup } from '@/company/types/permission'
import type { MemberUserCreateOutput } from '@/member-users/schemas/member-user-create-schema'
import type { MemberUserPermissionsOutput } from '@/member-users/schemas/member-user-permissions-schema'
import type { MemberUserUpdateOutput } from '@/member-users/schemas/member-user-update-schema'
import { apiJsonRequest } from '@/shared/api/api-client'

function memberUserPath(id: string, action = ''): string {
  return `/user/${encodeURIComponent(id)}${action}`
}

export function searchMemberUsers(): Promise<CompanyUser[]> {
  return apiJsonRequest<CompanyUser[]>('/user/search', { method: 'GET' })
}

export function findMemberUser(id: string): Promise<CompanyUser> {
  return apiJsonRequest<CompanyUser>(memberUserPath(id), { method: 'GET' })
}

export function createMemberUser(member: MemberUserCreateOutput): Promise<CompanyUser> {
  return apiJsonRequest<CompanyUser>('/user', {
    method: 'POST',
    body: JSON.stringify(member),
  })
}

export function updateMemberUser(id: string, update: MemberUserUpdateOutput): Promise<CompanyUser> {
  return apiJsonRequest<CompanyUser>(memberUserPath(id), {
    method: 'PUT',
    body: JSON.stringify(update),
  })
}

export function updateMemberUserPermissions(
  id: string,
  update: MemberUserPermissionsOutput,
): Promise<CompanyUser> {
  return apiJsonRequest<CompanyUser>(memberUserPath(id, '/permissions'), {
    method: 'PUT',
    body: JSON.stringify(update),
  })
}

export function deactivateMemberUser(id: string): Promise<CompanyUser> {
  return apiJsonRequest<CompanyUser>(memberUserPath(id, '/deactivate'), { method: 'PUT' })
}

export function activateMemberUser(id: string): Promise<CompanyUser> {
  return apiJsonRequest<CompanyUser>(memberUserPath(id, '/activate'), { method: 'PUT' })
}

export function fetchPermissionCatalogue(): Promise<PermissionCatalogueGroup[]> {
  return apiJsonRequest<PermissionCatalogueGroup[]>('/user/permission-catalogue', { method: 'GET' })
}
