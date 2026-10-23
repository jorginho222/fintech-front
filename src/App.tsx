import { useEffect, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'

import { fetchCurrentUser } from '@/company/api/company-auth-api'
import { CompanyUserLoginForm } from '@/company/components/company-user-login-form'
import { PasswordChangeView } from '@/company/components/password-change-view'
import { useLogout } from '@/company/hooks/use-logout'
import { CompanyRegistrationForm } from '@/company/components/company-registration-form'
import { CreditRequestApplicationsView } from '@/credit-request-applications/components/credit-request-applications-view'
import { CreditRequestApplicationCreateView } from '@/credit-request-applications/components/credit-request-application-create-view'
import { DashboardView } from '@/dashboard/components/dashboard-view'
import { CreditRequestConfirmView } from '@/credit-requests/components/credit-request-confirm-view'
import { CreditRequestPayView } from '@/credit-requests/components/credit-request-pay-view'
import { CreditRequestShowView } from '@/credit-requests/components/credit-request-show-view'
import { CreditRequestsView } from '@/credit-requests/components/credit-requests-view'
import { PaymentsCalendarView } from '@/payments-calendar/components/payments-calendar-view'
import { MemberUserCreateView } from '@/member-users/components/member-user-create-view'
import { MemberUserShowView } from '@/member-users/components/member-user-show-view'
import { MemberUsersView } from '@/member-users/components/member-users-view'
import { getVisibleNavigationItems, ROUTE_ACCESS, type RouteAccess } from '@/navigation'
import { PermissionRoute } from '@/permission-route'
import { TotalDebtView } from '@/total-debt/components/total-debt-view'
import { ProtectedRoute } from '@/protected-route'
import { useAuthStore } from '@/store/auth-store'

function Navigation() {
  const user = useAuthStore((state) => state.user)
  const navigationItems = getVisibleNavigationItems(user)
  const handleLogout = useLogout()

  return (
    <aside className="w-full border-b border-slate-800 bg-slate-900 p-6 md:min-h-screen md:w-64 md:border-r md:border-b-0">
      <nav aria-label="Navegación principal">
        <ul className="flex flex-wrap gap-2 md:flex-col">
          {navigationItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
          <li className="md:mt-2 md:border-t md:border-slate-800 md:pt-2">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

function AuthenticatedLayout() {
  const hasSession = useAuthStore((state) => state.token !== null)
  const setUser = useAuthStore((state) => state.setUser)

  // Permissions or the password-change flag may have changed since the session was stored.
  // A 401 is handled by the API client; on a network error the stored user is kept.
  useEffect(() => {
    if (!hasSession) return

    void fetchCurrentUser()
      .then(setUser)
      .catch(() => {})
  }, [hasSession, setUser])

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 md:flex-row">
        <Navigation />
        <main className="flex flex-1 items-center justify-center p-6">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  )
}

function CenteredLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      {children}
    </div>
  )
}

function guarded(access: RouteAccess, element: ReactNode) {
  return <PermissionRoute access={access}>{element}</PermissionRoute>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <CenteredLayout>
            <CompanyUserLoginForm />
          </CenteredLayout>
        }
      />
      <Route
        path="/register"
        element={
          <CenteredLayout>
            <CompanyRegistrationForm />
          </CenteredLayout>
        }
      />
      <Route
        path="/change_password"
        element={
          <ProtectedRoute passwordChange>
            <CenteredLayout>
              <PasswordChangeView />
            </CenteredLayout>
          </ProtectedRoute>
        }
      />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/dashboard" element={<DashboardView />} />
        <Route
          path="/credit_request_applications"
          element={guarded(ROUTE_ACCESS.creditRequestApplications, <CreditRequestApplicationsView />)}
        />
        <Route
          path="/credit_request_applications/create"
          element={guarded(ROUTE_ACCESS.creditRequestApplicationCreate, <CreditRequestApplicationCreateView />)}
        />
        <Route
          path="/credit_requests/confirm"
          element={guarded(ROUTE_ACCESS.creditRequestConfirm, <CreditRequestConfirmView />)}
        />
        <Route path="/credit_requests" element={guarded(ROUTE_ACCESS.creditRequests, <CreditRequestsView />)} />
        <Route
          path="/credit_requests/show"
          element={guarded(ROUTE_ACCESS.creditRequestShow, <CreditRequestShowView />)}
        />
        <Route
          path="/credit_requests/pay"
          element={guarded(ROUTE_ACCESS.creditRequestPay, <CreditRequestPayView />)}
        />
        <Route
          path="/payments_calendar"
          element={guarded(ROUTE_ACCESS.paymentsCalendar, <PaymentsCalendarView />)}
        />
        <Route path="/total_debt" element={guarded(ROUTE_ACCESS.totalDebt, <TotalDebtView />)} />
        <Route path="/users" element={guarded(ROUTE_ACCESS.memberUsers, <MemberUsersView />)} />
        <Route path="/users/create" element={guarded(ROUTE_ACCESS.memberUsers, <MemberUserCreateView />)} />
        <Route path="/users/show" element={guarded(ROUTE_ACCESS.memberUsers, <MemberUserShowView />)} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
