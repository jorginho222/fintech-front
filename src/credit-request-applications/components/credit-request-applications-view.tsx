import { useEffect } from 'react'

import type { CreditRequestApplicationStatus } from '@/credit-request-applications/types/credit-request-application'
import { useCreditRequestApplicationStore } from '@/store/credit-request-application-store'

const STATUS_LABELS: Record<CreditRequestApplicationStatus, string> = {
  evaluation_pending: 'Pendiente de evaluación',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

const STATUS_CLASS_NAMES: Record<CreditRequestApplicationStatus, string> = {
  evaluation_pending: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-300',
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export function CreditRequestApplicationsView() {
  const applications = useCreditRequestApplicationStore((state) => state.applications)
  const isLoading = useCreditRequestApplicationStore((state) => state.isLoading)
  const error = useCreditRequestApplicationStore((state) => state.error)
  const fetchApplications = useCreditRequestApplicationStore((state) => state.fetchApplications)

  useEffect(() => {
    void fetchApplications()
  }, [fetchApplications])

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Solicitud de creditos
        </h1>
      </div>

      {isLoading && (
        <p className="p-6 text-sm text-slate-400">Cargando solicitudes…</p>
      )}

      {!isLoading && error && (
        <div className="flex items-center justify-between gap-4 p-6">
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void fetchApplications()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && applications.length === 0 && (
        <p className="p-6 text-sm text-slate-400">No hay solicitudes de crédito.</p>
      )}

      {!isLoading && !error && applications.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">Empresa</th>
                <th scope="col" className="px-6 py-4">CUIT</th>
                <th scope="col" className="px-6 py-4">Monto</th>
                <th scope="col" className="px-6 py-4">Cuotas</th>
                <th scope="col" className="px-6 py-4">Estado</th>
                <th scope="col" className="px-6 py-4">Motivo de rechazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {applications.map((application) => (
                <tr key={application.id} className="transition hover:bg-slate-800/40">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-100">
                    {application.company.socialReason}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                    {application.company.cuit}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                    {currencyFormatter.format(Number(application.amount))}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {application.installmentQuantity}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS_NAMES[application.status]}`}>
                      {STATUS_LABELS[application.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {application.rejectionReason ?? '—'}
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
