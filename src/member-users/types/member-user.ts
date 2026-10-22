import { v4 as uuidv4 } from 'uuid'

import type { Permission } from '@/company/types/permission'

// Mirrors `MemberUser::MAX_ACTIVE_PER_COMPANY` in the backend.
export const MAX_ACTIVE_MEMBER_USERS = 10

export interface MemberUserDraft {
  id: string
  taxIdentifier: string
  displayName: string
  password: string
  permissions: Permission[]
}

export function createDefaultMemberUserDraft(): MemberUserDraft {
  return {
    id: uuidv4(),
    taxIdentifier: '',
    displayName: '',
    password: '',
    permissions: [],
  }
}
