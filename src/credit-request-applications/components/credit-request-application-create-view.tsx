import { useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { createCreditRequestApplication } from '@/credit-request-applications/api/credit-request-application-api'
import {
  creditRequestApplicationCreateSchema,
  type CreditRequestApplicationCreateInput,
  type CreditRequestApplicationCreateOutput,
} from '@/credit-request-applications/schemas/credit-request-application-create-schema'
import { ApiError } from '@/shared/api/api-error'

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

export function CreditRequestApplicationCreateView() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    CreditRequestApplicationCreateInput,
    unknown,
    CreditRequestApplicationCreateOutput
  >({
    resolver: zodResolver(creditRequestApplicationCreateSchema),
    defaultValues: { amount: '', installmentQuantity: '' },
  })

  const onSubmit = async (application: CreditRequestApplicationCreateOutput) => {
    setFormError(null)

    try {
      await createCreditRequestApplication(application)
      navigate('/credit_request_applications', { replace: true })
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor.',
      )
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
          Nueva solicitud de crédito
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Indicá el monto solicitado y la cantidad de cuotas.
        </p>
      </div>

      <Field id="amount" label="Monto" error={errors.amount?.message}>
        <input
          id="amount"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          placeholder="100000"
          className={inputClassName}
          {...register('amount')}
        />
      </Field>

      <Field
        id="installmentQuantity"
        label="Cantidad de cuotas"
        error={errors.installmentQuantity?.message}
      >
        <input
          id="installmentQuantity"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          placeholder="12"
          className={inputClassName}
          {...register('installmentQuantity')}
        />
      </Field>

      {formError && <p role="alert" className="text-sm text-rose-400">{formError}</p>}

      <div className="flex gap-3">
        <Link
          to="/credit_request_applications"
          className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-center text-sm font-medium text-slate-100 transition hover:bg-slate-700"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {isSubmitting ? 'Creando…' : 'Crear solicitud'}
        </button>
      </div>
    </form>
  )
}
