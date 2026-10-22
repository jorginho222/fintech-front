import { useLogout } from '@/company/hooks/use-logout'
import { isAdmin } from '@/company/types/company-user'
import { useAuthStore } from '@/store/auth-store'

export function DashboardView() {
  const company = useAuthStore((state) => state.company)
  const user = useAuthStore((state) => state.user)
  const handleLogout = useLogout()
  const hasNoPermissions = user?.type === 'member' && user.permissions.length === 0
  const greetingName = isAdmin(user) ? 'administrador' : user?.displayName

  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Dashboard{company?.socialReason ? ` - ${company.socialReason}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Bienvenido{greetingName ? `, ${greetingName}` : ''}.
        </p>
      </div>

      {hasNoPermissions && (
        <p role="status" className="rounded-lg border border-amber-800/70 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
          Todavía no tenés secciones asignadas. Pedile acceso al administrador de tu empresa.
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700 active:scale-[0.98]"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
