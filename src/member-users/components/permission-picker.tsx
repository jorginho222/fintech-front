import { useCallback, useEffect, useState } from 'react'

import {
  getPermissionLabel,
  getPermissionResourceLabel,
  isPermission,
  type Permission,
  type PermissionCatalogueGroup,
} from '@/company/types/permission'
import { fetchPermissionCatalogue } from '@/member-users/api/member-user-api'
import { ApiError } from '@/shared/api/api-error'

interface PermissionPickerProps {
  value: Permission[]
  onChange: (permissions: Permission[]) => void
  disabled?: boolean
}

export function PermissionPicker({ value, onChange, disabled = false }: PermissionPickerProps) {
  const [catalogue, setCatalogue] = useState<PermissionCatalogueGroup[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCatalogue = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setCatalogue(await fetchPermissionCatalogue())
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo conectar con el servidor.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalogue()
  }, [loadCatalogue])

  const togglePermission = (permission: Permission, checked: boolean) => {
    onChange(checked ? [...value, permission] : value.filter((current) => current !== permission))
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">Cargando permisos…</p>
  }

  if (error || !catalogue) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p role="alert" className="text-sm text-rose-400">
          {error ?? 'No se pudieron cargar los permisos.'}
        </p>
        <button
          type="button"
          onClick={() => void loadCatalogue()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {catalogue.map((group) => (
        <fieldset key={group.resource} className="rounded-lg border border-slate-800 p-4">
          <legend className="px-1 text-sm font-medium text-slate-200">
            {getPermissionResourceLabel(group.resource)}
          </legend>
          <div className="flex flex-col gap-2">
            {group.permissions.map((permission) => {
              // A value this frontend doesn't know yet is shown, but can't be granted from here.
              const known = isPermission(permission)

              return (
                <label
                  key={permission}
                  className={`flex items-center gap-2 text-sm ${known ? 'text-slate-300' : 'text-slate-500'}`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={known && value.includes(permission)}
                    disabled={disabled || !known}
                    onChange={(event) => {
                      if (known) togglePermission(permission, event.target.checked)
                    }}
                  />
                  {getPermissionLabel(permission)}
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
