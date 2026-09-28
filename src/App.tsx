import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'

import { CompanyLoginForm } from '@/company/components/company-login-form'
import { CompanyRegistrationForm } from '@/company/components/company-registration-form'
import { CreditRequestApplicationsView } from '@/credit-request-applications/components/credit-request-applications-view'
import { CreditRequestApplicationCreateView } from '@/credit-request-applications/components/credit-request-application-create-view'
import { DashboardView } from '@/dashboard/components/dashboard-view'
import { CreditRequestConfirmView } from '@/credit-requests/components/credit-request-confirm-view'
import { CreditRequestPayView } from '@/credit-requests/components/credit-request-pay-view'
import { CreditRequestShowView } from '@/credit-requests/components/credit-request-show-view'
import { CreditRequestsView } from '@/credit-requests/components/credit-requests-view'
import { PaymentsCalendarView } from '@/payments-calendar/components/payments-calendar-view'
import { TotalDebtView } from '@/total-debt/components/total-debt-view'
import { ProtectedRoute } from '@/protected-route'

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Solicitud de creditos', to: '/credit_request_applications' },
  { label: 'Créditos en curso', to: '/credit_requests' },
  { label: 'Calendario de pagos', to: '/payments_calendar' },
  { label: 'Deuda total', to: '/total_debt' },
]

function Navigation() {
  return (
    <aside className="w-full border-b border-slate-800 bg-slate-900 p-6 md:min-h-screen md:w-64 md:border-r md:border-b-0">
      <nav aria-label="Navegación principal">
        <ul className="flex gap-2 md:flex-col">
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
        </ul>
      </nav>
    </aside>
  )
}

function AuthenticatedLayout() {
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
            <CompanyLoginForm />
          </div>
        }
      />
      <Route
        path="/register"
        element={
          <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
            <CompanyRegistrationForm />
          </div>
        }
      />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/dashboard" element={<DashboardView />} />
        <Route
          path="/credit_request_applications"
          element={<CreditRequestApplicationsView />}
        />
        <Route
          path="/credit_request_applications/create"
          element={<CreditRequestApplicationCreateView />}
        />
        <Route
          path="/credit_requests/confirm"
          element={<CreditRequestConfirmView />}
        />
        <Route path="/credit_requests" element={<CreditRequestsView />} />
        <Route path="/credit_requests/show" element={<CreditRequestShowView />} />
        <Route path="/credit_requests/pay" element={<CreditRequestPayView />} />
        <Route path="/payments_calendar" element={<PaymentsCalendarView />} />
        <Route path="/total_debt" element={<TotalDebtView />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
