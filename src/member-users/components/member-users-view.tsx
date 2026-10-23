import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import type { CompanyUser } from '@/company/types/company-user'
import { getPermissionLabel } from '@/company/types/permission'
import { searchMemberUsers } from '@/member-users/api/member-user-api'
import { MemberUserActiveToggle } from '@/member-users/components/member-user-active-toggle'
import { MemberUserStatusBadge } from '@/member-users/components/member-user-status-badge'
import { MAX_ACTIVE_MEMBER_USERS } from '@/member-users/types/member-user'
import { ApiError } from '@/shared/api/api-error'
import { GatedLink } from '@/shared/components/gated-link'

interface MemberUsersLocationState {
  notice?: string
}

function summarizePermissions(member: CompanyUser): string {
  if (member.permissions.length === 0) return 'Sin permisos'

  return member.permissions.map(getPermissionLabel).join(', ')
}

export function MemberUsersView() {
  const location = useLocation()
  const notice = (location.state as MemberUsersLocationState | null)?.notice ?? null
  const [members, setMembers] = useState<CompanyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setMembers(await searchMemberUsers())
    } catch (requestError: unknown) {
      setMembers([])
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo conectar con el servidor.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMembers()
  }, [fetchMembers])

  const activeCount = members.filter((member) => member.active).length
  const limitReached = activeCount >= MAX_ACTIVE_MEMBER_USERS

  const handleToggled = () => {
    setActionError(null)
    void fetchMembers()
  }

  // The list may be stale (e.g. changed in another tab), so refresh it after a failed toggle too.
  const handleToggleError = (message: string) => {
    setActionError(message)
    void fetchMembers()
  }

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Gestion de Usuarios</h1>
          <p className="mt-1 text-sm text-slate-400">
            {activeCount} de {MAX_ACTIVE_MEMBER_USERS} usuarios activos
          </p>
        </div>
        <GatedLink
          allowed={!limitReached}
          reason={`Ya hay ${MAX_ACTIVE_MEMBER_USERS} usuarios activos. Desactive uno para crear otro.`}
          to="/users/create"
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98]"
        >
          Crear usuario
        </GatedLink>
      </div>

      {notice && (
        <p role="status" className="border-b border-slate-800 px-6 py-4 text-sm text-emerald-400">
          {notice}
        </p>
      )}

      {actionError && (
        <p role="alert" className="border-b border-slate-800 px-6 py-4 text-sm text-rose-400">
          {actionError}
        </p>
      )}

      {isLoading && <p className="p-6 text-sm text-slate-400">Cargando usuarios…</p>}

      {!isLoading && error && (
        <div className="flex items-center justify-between gap-4 p-6">
          <p role="alert" className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void fetchMembers()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && members.length === 0 && (
        <p className="p-6 text-sm text-slate-400">Todavía no creaste usuarios.</p>
      )}

      {!isLoading && !error && members.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">Nombre</th>
                <th scope="col" className="px-6 py-4">CUIL</th>
                <th scope="col" className="px-6 py-4">Estado</th>
                <th scope="col" className="px-6 py-4">Permisos</th>
                <th scope="col" className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {members.map((member) => (
                <tr
                  key={member.id}
                  className={`transition hover:bg-slate-800/40 ${member.active ? '' : 'opacity-60'}`}
                >
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-100">
                    {member.displayName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-300">{member.taxIdentifier}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <MemberUserStatusBadge active={member.active} />
                  </td>
                  <td className="px-6 py-4 text-slate-400">{summarizePermissions(member)}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/users/show?id=${encodeURIComponent(member.id)}`}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-500"
                      >
                        Ver usuario
                      </Link>
                      <MemberUserActiveToggle
                        member={member}
                        limitReached={limitReached}
                        onChanged={handleToggled}
                        onError={handleToggleError}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
