import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'

import { changePassword, fetchCurrentUser } from '@/company/api/company-auth-api'
import { useLogout } from '@/company/hooks/use-logout'
import {
  passwordChangeSchema,
  type PasswordChangeInput,
  type PasswordChangeOutput,
} from '@/company/schemas/password-change-schema'
import { PASSWORD_POLICY_HINT } from '@/company/schemas/strong-password-schema'
import { ApiError } from '@/shared/api/api-error'
import { applyApiFieldErrors } from '@/shared/forms/apply-api-field-errors'
import { useAuthStore } from '@/store/auth-store'

const inputClassName =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60'

interface FieldProps {
  id: string
  label: string
  error: string | undefined
  children: ReactNode
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordChangeView() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const handleLogout = useLogout()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput, unknown, PasswordChangeOutput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirmation: '' },
  })

  const onSubmit = async (payload: PasswordChangeOutput) => {
    setFormError(null)

    try {
      setUser(await changePassword(payload))
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError('No se pudo conectar con el servidor.')
        return
      }

      if (error.status === 409) {
        // Already changed (e.g. in another tab): pick up the cleared flag and move on.
        try {
          setUser(await fetchCurrentUser())
          navigate('/dashboard', { replace: true })
        } catch {
          setFormError('No se pudo conectar con el servidor.')
        }
        return
      }

      if (applyApiFieldErrors(error, setError, ['currentPassword', 'newPassword'])) return

      setFormError(error.message)
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Cambiar contraseña</h1>
        <p className="mt-1 text-sm text-slate-400">
          Es su primer ingreso: elija una contraseña nueva para continuar.
        </p>
      </div>

      <Field id="currentPassword" label="Contraseña actual" error={errors.currentPassword?.message}>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClassName}
          {...register('currentPassword')}
        />
      </Field>

      <Field id="newPassword" label="Nueva contraseña" error={errors.newPassword?.message}>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClassName}
          {...register('newPassword')}
        />
        <p className="text-xs text-slate-500">{PASSWORD_POLICY_HINT}</p>
      </Field>

      <Field
        id="newPasswordConfirmation"
        label="Repetir nueva contraseña"
        error={errors.newPasswordConfirmation?.message}
      >
        <input
          id="newPasswordConfirmation"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClassName}
          {...register('newPasswordConfirmation')}
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
      </button>

      {formError && (
        <p role="alert" className="text-sm text-rose-400">
          {formError}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="text-sm font-medium text-slate-400 hover:text-white"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
