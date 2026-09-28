import { useNavigate } from 'react-router-dom'

import { logoutCompany } from '@/company/api/company-auth-api'
import { useAuthStore } from '@/store/auth-store'

export function DashboardView() {
  const navigate = useNavigate()
  const company = useAuthStore((state) => state.company)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    try {
      await logoutCompany()
    } catch {
      // Local session is cleared below regardless of backend failure.
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Bienvenido{company ? `, ${company.socialReason}` : ''}.
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700 active:scale-[0.98]"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
