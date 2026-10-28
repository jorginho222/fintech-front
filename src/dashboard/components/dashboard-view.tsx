import { isAdmin } from '@/company/types/company-user'
import { CreditRequestApplicationStatsSection } from '@/dashboard/components/credit-request-application-stats-section'
import { CreditRequestStatsSection } from '@/dashboard/components/credit-request-stats-section'
import { canAccess, ROUTE_ACCESS } from '@/navigation'
import { useAuthStore } from '@/store/auth-store'

export function DashboardView() {
  const company = useAuthStore((state) => state.company)
  const user = useAuthStore((state) => state.user)
  const hasNoPermissions = user?.type === 'member' && user.permissions.length === 0
  const greetingName = isAdmin(user) ? 'administrador' : user?.displayName
  // Each section is mounted only when allowed, so its endpoint is never called otherwise.
  const showCreditRequestApplicationStats = canAccess(user, ROUTE_ACCESS.creditRequestApplications)
  const showCreditRequestStats = canAccess(user, ROUTE_ACCESS.creditRequests)

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-5 self-start text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Dashboard{company?.socialReason ? ` - ${company.socialReason}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Bienvenido{greetingName ? `, ${greetingName}` : ''}.
        </p>
      </div>

      {hasNoPermissions && (
        <p role="status" className="max-w-md rounded-lg border border-amber-800/70 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
          Todavía no tiene secciones asignadas. Solicite acceso al administrador de su empresa.
        </p>
      )}

      {showCreditRequestApplicationStats && <CreditRequestApplicationStatsSection />}
      {showCreditRequestStats && <CreditRequestStatsSection />}
    </div>
  )
}
