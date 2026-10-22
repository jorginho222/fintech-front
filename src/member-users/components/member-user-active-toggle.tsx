import { useState } from 'react'

import type { CompanyUser } from '@/company/types/company-user'
import { activateMemberUser, deactivateMemberUser } from '@/member-users/api/member-user-api'
import { MAX_ACTIVE_MEMBER_USERS } from '@/member-users/types/member-user'
import { ApiError } from '@/shared/api/api-error'

interface MemberUserActiveToggleProps {
  member: CompanyUser
  limitReached: boolean
  onChanged: (member: CompanyUser) => void
  onError: (message: string) => void
}

export function MemberUserActiveToggle({ member, limitReached, onChanged, onError }: MemberUserActiveToggleProps) {
  const [isSaving, setIsSaving] = useState(false)
  const activationBlocked = !member.active && limitReached

  const handleClick = async () => {
    if (
      member.active &&
      !window.confirm(`¿Desactivar a ${member.displayName ?? member.taxIdentifier}? Va a perder el acceso de inmediato.`)
    ) {
      return
    }

    setIsSaving(true)

    try {
      onChanged(await (member.active ? deactivateMemberUser(member.id) : activateMemberUser(member.id)))
    } catch (error) {
      onError(error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isSaving || activationBlocked}
      title={activationBlocked ? `Ya hay ${MAX_ACTIVE_MEMBER_USERS} usuarios activos` : undefined}
      className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        member.active
          ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
          : 'bg-emerald-600 text-white hover:bg-emerald-500'
      }`}
    >
      {isSaving ? 'Guardando…' : member.active ? 'Desactivar' : 'Activar'}
    </button>
  )
}
