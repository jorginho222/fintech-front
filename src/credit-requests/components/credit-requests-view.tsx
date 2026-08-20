import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { useCreditRequestStore } from '@/store/credit-request-store'

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const numberFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

export function CreditRequestsView() {
  const creditRequests = useCreditRequestStore((state) => state.creditRequests)
  const isLoading = useCreditRequestStore((state) => state.isLoading)
  const error = useCreditRequestStore((state) => state.error)
  const fetchCreditRequests = useCreditRequestStore((state) => state.fetchCreditRequests)

  useEffect(() => {
    void fetchCreditRequests()
  }, [fetchCreditRequests])

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/40">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Créditos en curso
        </h1>
      </div>

      {isLoading && <p className="p-6 text-sm text-slate-400">Cargando créditos…</p>}

      {!isLoading && error && (
        <div className="flex items-center justify-between gap-4 p-6">
          <p role="alert" className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void fetchCreditRequests()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && creditRequests.length === 0 && (
        <p className="p-6 text-sm text-slate-400">No hay créditos en curso.</p>
      )}

      {!isLoading && !error && creditRequests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">Total</th>
                <th scope="col" className="px-6 py-4">Tasa de interés nominal</th>
                <th scope="col" className="px-6 py-4">Cantidad de cuotas</th>
                <th scope="col" className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {creditRequests.map((creditRequest) => (
                <tr key={creditRequest.id} className="transition hover:bg-slate-800/40">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-100">
                    {currencyFormatter.format(Number(creditRequest.totalAmount))}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                    {numberFormatter.format(Number(creditRequest.nominalInterestRate))}%
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {creditRequest.installmentQuantity}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      to={`/credit_requests/show?id=${encodeURIComponent(creditRequest.id)}`}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-500"
                    >
                      Ver crédito
                    </Link>
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
