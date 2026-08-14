import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'

import { registerCompany } from '@/company/api/company-auth-api'
import { companyRegistrationSchema } from '@/company/schemas/company-registration-schema'
import { ApiError } from '@/shared/api/api-error'
import {
  TAX_STATUSES,
  TAX_STATUS_LABELS,
  createDefaultCompanyRegistration,
  type CompanyRegistration,
  type CompanyRegistrationDraft,
} from '@/company/types/company'

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

type SubmitStatus = { type: 'success' | 'error'; message: string }

export function CompanyRegistrationForm() {
  const [status, setStatus] = useState<SubmitStatus | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyRegistrationDraft, unknown, CompanyRegistration>({
    resolver: zodResolver(companyRegistrationSchema),
    defaultValues: createDefaultCompanyRegistration(),
  })

  const onSubmit = async (registration: CompanyRegistration) => {
    setStatus(null)

    try {
      const created = await registerCompany(registration)
      setStatus({ type: 'success', message: `Empresa "${created.socialReason}" registrada.` })
      // Fresh draft, so the next submit carries a new UUID instead of colliding
      // with the one just persisted.
      reset(createDefaultCompanyRegistration())
    } catch (error) {
      if (error instanceof ApiError) {
        setStatus({ type: 'error', message: error.message })
        return
      }

      setStatus({ type: 'error', message: 'No se pudo conectar con el servidor.' })
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Registrar empresa
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Completá los datos para crear tu cuenta de empresa.
        </p>
      </div>

      <input type="hidden" {...register('id')} />

      <Field id="socialReason" label="Razón social" error={errors.socialReason?.message}>
        <input
          id="socialReason"
          type="text"
          autoComplete="organization"
          placeholder="Acme S.A."
          className={inputClassName}
          {...register('socialReason')}
        />
      </Field>

      <Field id="cuit" label="CUIT" error={errors.cuit?.message}>
        <input
          id="cuit"
          type="text"
          inputMode="numeric"
          maxLength={11}
          placeholder="30712345678"
          className={inputClassName}
          {...register('cuit')}
        />
      </Field>

      <Field id="email" label="Email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="contacto@acme.com"
          className={inputClassName}
          {...register('email')}
        />
      </Field>

      <Field id="taxStatus" label="Condición fiscal" error={errors.taxStatus?.message}>
        <select id="taxStatus" className={inputClassName} {...register('taxStatus')}>
          <option value="">Seleccionar…</option>
          {TAX_STATUSES.map((taxStatus) => (
            <option key={taxStatus} value={taxStatus}>
              {TAX_STATUS_LABELS[taxStatus]}
            </option>
          ))}
        </select>
      </Field>

      <Field id="password" label="Contraseña" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClassName}
          {...register('password')}
        />
        <p className="text-xs text-slate-500">
          Mínimo 8 caracteres, con una mayúscula y un carácter especial.
        </p>
      </Field>

      {errors.id?.message && (
        <p role="alert" className="text-xs text-rose-400">
          {errors.id.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {isSubmitting ? 'Registrando…' : 'Registrar empresa'}
      </button>

      {status && (
        <p
          role="status"
          className={
            status.type === 'success' ? 'text-sm text-emerald-400' : 'text-sm text-rose-400'
          }
        >
          {status.message}
        </p>
      )}

      <p className="text-center text-sm text-slate-400">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
          Iniciá sesión
        </Link>
      </p>
    </form>
  )
}
