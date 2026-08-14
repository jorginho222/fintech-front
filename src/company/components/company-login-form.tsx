import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'

import { loginCompany } from '@/company/api/company-auth-api'
import { companyLoginSchema, type CompanyLoginInput } from '@/company/schemas/company-login-schema'
import { ApiError } from '@/shared/api/api-error'
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

export function CompanyLoginForm() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyLoginInput>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: { cuit: '', password: '' },
  })

  const onSubmit = async (credentials: CompanyLoginInput) => {
    setFormError(null)

    try {
      const result = await loginCompany(credentials)
      login(result.token, result.company)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
        return
      }

      setFormError('No se pudo conectar con el servidor.')
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-400">Ingresá con el CUIT y la contraseña de tu empresa.</p>
      </div>

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

      <Field id="password" label="Contraseña" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClassName}
          {...register('password')}
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {isSubmitting ? 'Ingresando…' : 'Ingresar'}
      </button>

      {formError && (
        <p role="alert" className="text-sm text-rose-400">
          {formError}
        </p>
      )}

      <p className="text-center text-sm text-slate-400">
        ¿No tenés cuenta?{' '}
        <Link to="/register" className="font-medium text-emerald-400 hover:text-emerald-300">
          Registrá tu empresa
        </Link>
      </p>
    </form>
  )
}
