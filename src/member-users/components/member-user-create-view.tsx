import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'

import { PASSWORD_POLICY_HINT } from '@/company/schemas/strong-password-schema'
import { createMemberUser } from '@/member-users/api/member-user-api'
import { PermissionPicker } from '@/member-users/components/permission-picker'
import {
  memberUserCreateSchema,
  type MemberUserCreateInput,
  type MemberUserCreateOutput,
} from '@/member-users/schemas/member-user-create-schema'
import { createDefaultMemberUserDraft } from '@/member-users/types/member-user'
import { ApiError } from '@/shared/api/api-error'
import { applyApiFieldErrors } from '@/shared/forms/apply-api-field-errors'

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
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

export function MemberUserCreateView() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MemberUserCreateInput, unknown, MemberUserCreateOutput>({
    resolver: zodResolver(memberUserCreateSchema),
    defaultValues: createDefaultMemberUserDraft(),
  })

  const onSubmit = async (member: MemberUserCreateOutput) => {
    setFormError(null)

    try {
      const created = await createMemberUser(member)
      // Leaving the form discards this draft, so the next create starts with a fresh UUID.
      navigate('/users', {
        state: {
          notice: `Usuario "${created.displayName ?? created.taxIdentifier}" creado. Va a tener que cambiar la contraseña en su primer ingreso.`,
        },
      })
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError('No se pudo conectar con el servidor.')
        return
      }

      if (applyApiFieldErrors(error, setError, ['taxIdentifier', 'displayName', 'password', 'permissions'])) return

      setFormError(error.message)
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-xl flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Crear usuario</h1>
          <p className="mt-1 text-sm text-slate-400">
            El usuario ingresa con su CUIL y debe cambiar la contraseña en su primer ingreso.
          </p>
        </div>
        <Link to="/users" className="text-sm font-medium text-slate-300 hover:text-white">
          Volver
        </Link>
      </div>

      <input type="hidden" {...register('id')} />

      <Field id="taxIdentifier" label="CUIL" error={errors.taxIdentifier?.message}>
        <input
          id="taxIdentifier"
          type="text"
          inputMode="numeric"
          maxLength={11}
          placeholder="20301234567"
          className={inputClassName}
          {...register('taxIdentifier')}
        />
      </Field>

      <Field id="displayName" label="Nombre" error={errors.displayName?.message}>
        <input
          id="displayName"
          type="text"
          autoComplete="off"
          placeholder="Juan Pérez"
          className={inputClassName}
          {...register('displayName')}
        />
      </Field>

      <Field id="password" label="Contraseña inicial" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClassName}
          {...register('password')}
        />
        <p className="text-xs text-slate-500">{PASSWORD_POLICY_HINT}</p>
      </Field>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-slate-300">Permisos</p>
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
      </div>

      {errors.id?.message && (
        <p role="alert" className="text-xs text-rose-400">{errors.id.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {isSubmitting ? 'Creando…' : 'Crear usuario'}
      </button>

      {formError && (
        <p role="alert" className="text-sm text-rose-400">{formError}</p>
      )}
    </form>
  )
}
