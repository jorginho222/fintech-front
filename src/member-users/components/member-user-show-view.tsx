import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'

import type { CompanyUser } from '@/company/types/company-user'
import { isPermission } from '@/company/types/permission'
import {
  findMemberUser,
  searchMemberUsers,
  updateMemberUser,
  updateMemberUserPermissions,
} from '@/member-users/api/member-user-api'
import { MemberUserActiveToggle } from '@/member-users/components/member-user-active-toggle'
import { MemberUserStatusBadge } from '@/member-users/components/member-user-status-badge'
import { PermissionPicker } from '@/member-users/components/permission-picker'
import {
  memberUserPermissionsSchema,
  type MemberUserPermissionsInput,
  type MemberUserPermissionsOutput,
} from '@/member-users/schemas/member-user-permissions-schema'
import {
  memberUserUpdateSchema,
  type MemberUserUpdateInput,
  type MemberUserUpdateOutput,
} from '@/member-users/schemas/member-user-update-schema'
import { MAX_ACTIVE_MEMBER_USERS } from '@/member-users/types/member-user'
import { ApiError } from '@/shared/api/api-error'
import { applyApiFieldErrors } from '@/shared/forms/apply-api-field-errors'

const inputClassName =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60'

const saveButtonClassName =
  'self-start rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100'

type SaveStatus = { type: 'success' | 'error'; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor.'
}

function SaveStatusMessage({ status }: { status: SaveStatus | null }) {
  if (!status) return null

  return (
    <p
      role={status.type === 'error' ? 'alert' : 'status'}
      className={status.type === 'success' ? 'text-sm text-emerald-400' : 'text-sm text-rose-400'}
    >
      {status.message}
    </p>
  )
}

interface MemberFormProps {
  member: CompanyUser
  onSaved: (member: CompanyUser) => void
}

function DisplayNameForm({ member, onSaved }: MemberFormProps) {
  const [status, setStatus] = useState<SaveStatus | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MemberUserUpdateInput, unknown, MemberUserUpdateOutput>({
    resolver: zodResolver(memberUserUpdateSchema),
    values: { displayName: member.displayName ?? '' },
  })

  const onSubmit = async (update: MemberUserUpdateOutput) => {
    setStatus(null)

    try {
      onSaved(await updateMemberUser(member.id, update))
      setStatus({ type: 'success', message: 'Nombre actualizado.' })
    } catch (error) {
      if (error instanceof ApiError && applyApiFieldErrors(error, setError, ['displayName'])) return

      setStatus({ type: 'error', message: getErrorMessage(error) })
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 border-t border-slate-800 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Datos</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-slate-300">
          Nombre
        </label>
        <input id="displayName" type="text" autoComplete="off" className={inputClassName} {...register('displayName')} />
        {errors.displayName?.message && (
          <p role="alert" className="text-xs text-rose-400">{errors.displayName.message}</p>
        )}
      </div>
      <button type="submit" disabled={isSubmitting} className={saveButtonClassName}>
        {isSubmitting ? 'Guardando…' : 'Guardar nombre'}
      </button>
      <SaveStatusMessage status={status} />
    </form>
  )
}

function PermissionsForm({ member, onSaved }: MemberFormProps) {
  const [status, setStatus] = useState<SaveStatus | null>(null)
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MemberUserPermissionsInput, unknown, MemberUserPermissionsOutput>({
    resolver: zodResolver(memberUserPermissionsSchema),
    values: { permissions: member.permissions.filter(isPermission) },
  })

  const onSubmit = async (update: MemberUserPermissionsOutput) => {
    setStatus(null)

    try {
      onSaved(await updateMemberUserPermissions(member.id, update))
      setStatus({ type: 'success', message: 'Permisos actualizados.' })
    } catch (error) {
      if (error instanceof ApiError && applyApiFieldErrors(error, setError, ['permissions'])) return

      setStatus({ type: 'error', message: getErrorMessage(error) })
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 border-t border-slate-800 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Permisos</h2>
      <Controller
        control={control}
        name="permissions"
        render={({ field }) => (
          <PermissionPicker value={field.value} onChange={field.onChange} disabled={isSubmitting} />
        )}
      />
      {errors.permissions?.message && (
        <p role="alert" className="text-xs text-rose-400">{errors.permissions.message}</p>
      )}
      <button type="submit" disabled={isSubmitting} className={saveButtonClassName}>
        {isSubmitting ? 'Guardando…' : 'Guardar permisos'}
      </button>
      <SaveStatusMessage status={status} />
    </form>
  )
}

export function MemberUserShowView() {
  const [searchParams] = useSearchParams()
  const memberId = searchParams.get('id')
  const [member, setMember] = useState<CompanyUser | null>(null)
  const [activeCount, setActiveCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  // The active count only decides whether "Activar" is offered; the backend enforces the limit.
  const fetchActiveCount = useCallback(() => {
    void searchMemberUsers()
      .then((members) => setActiveCount(members.filter((current) => current.active).length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!memberId) {
      setError('No se indicó el usuario que se desea ver.')
      setIsLoading(false)
      return
    }

    let isCurrent = true
    setIsLoading(true)
    setError(null)

    void findMemberUser(memberId)
      .then((result) => {
        if (isCurrent) setMember(result)
      })
      .catch((requestError: unknown) => {
        if (!isCurrent) return
        setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    fetchActiveCount()

    return () => {
      isCurrent = false
    }
  }, [memberId, fetchActiveCount])

  const handleToggled = (updated: CompanyUser) => {
    setToggleError(null)
    setMember(updated)
    fetchActiveCount()
  }

  if (isLoading) return <p className="text-sm text-slate-400">Cargando usuario…</p>

  if (!member) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p role="alert" className="text-sm text-rose-400">{error}</p>
        <Link to="/users" className="mt-5 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
          Volver a usuarios
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="flex items-start justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{member.displayName}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-400">
            <span>CUIL {member.taxIdentifier}</span>
            <MemberUserStatusBadge active={member.active} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MemberUserActiveToggle
            member={member}
            limitReached={activeCount >= MAX_ACTIVE_MEMBER_USERS}
            onChanged={handleToggled}
            onError={setToggleError}
          />
          <Link to="/users" className="text-sm font-medium text-slate-300 hover:text-white">
            Volver
          </Link>
        </div>
      </div>

      {toggleError && (
        <p role="alert" className="px-6 pb-4 text-sm text-rose-400">{toggleError}</p>
      )}

      <DisplayNameForm member={member} onSaved={setMember} />
      <PermissionsForm member={member} onSaved={setMember} />
    </div>
  )
}
