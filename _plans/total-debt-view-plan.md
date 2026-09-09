# Plan: Total Debt View (frontend)

Spec: `_specs/total-debt-view-spec.md` | Branch: `claude/feature/total-debt-view`

## Context

Users can currently see a day-by-day breakdown of pending installments for a single month (Payments Calendar), but have no quick way to answer "how much will I owe in total by some future date?" This adds a lightweight month/year-only picker that, on selection, asks the backend for the aggregate debt owed between today and the end of the chosen month, giving a forward-looking debt snapshot with no client-side summation. The backend endpoint itself is out of scope here (tracked separately) — this plan implements only the frontend, against the agreed contract below.

**Agreed backend contract** (confirmed by investigating the sibling backend repo, to be implemented separately):
`GET /installment/total-debt?month=<1-12>&year=<int>` → `{"totalAmount": "1234.56"}` on success; errors follow the existing documented shapes (`{"errors": {field: [...]}}` @ 422, `{"error": "..."}` otherwise).

## New files (module `src/total-debt/`, mirrors `src/payments-calendar/` exactly)

- **`src/total-debt/types/total-debt.ts`**
  `export interface TotalDebt { totalAmount: string | number }`

- **`src/total-debt/api/total-debt-api.ts`**
  `export function searchTotalDebt(month: number, year: number): Promise<TotalDebt>` — calls `apiJsonRequest<TotalDebt>('/installment/total-debt?...', { method: 'GET' })`, building the query string with `URLSearchParams`, exactly like `searchPendingInstallmentsToPay` in `src/payments-calendar/api/payments-calendar-api.ts`.

- **`src/total-debt/components/total-debt-view.tsx`**
  `export function TotalDebtView()`. Modeled on `src/payments-calendar/components/payments-calendar-view.tsx` but **without** the day grid, weekday labels, installment status dots, or `Link`/`InstallmentStatus` imports — those don't apply here.

  - State: `today` via `useMemo`, `year`/`month` via `useState` defaulting to today's values (same pattern as Payments Calendar).
  - Local `MONTH_LABELS` (Spanish array, duplicated per existing per-file convention — no shared constants module exists yet).
  - Header: prev/next month buttons (`‹`/`›`) + centered `MONTH_LABELS[month-1] year` label, same chrome as Payments Calendar.
  - **Past-month constraint** (new — no existing precedent):
    ```
    isPrevDisabled = year === today.getFullYear() && month === today.getMonth() + 1
    ```
    `handlePrevMonth` early-returns when `isPrevDisabled`; the `‹` button gets `disabled={isPrevDisabled || isLoading}` plus disabled styling and `aria-disabled`. `handleNextMonth`/`›` have no upper bound, per spec, but its button gets `disabled={isLoading}`.
  - **Rapid-switching guard**: instead of a request-cancellation/race-guard in the fetch itself, both month buttons are disabled while `isLoading` is true — the user simply cannot trigger another month change until the in-flight request settles, so `fetchTotalDebt` can stay a plain async/await call with no cleanup-flag complexity.
  - **Fetch**: `fetchTotalDebt` only calls `searchTotalDebt` (which itself only calls `apiJsonRequest`, exactly like `searchPendingInstallmentsToPay` in `payments-calendar-api.ts`) wrapped with `isLoading`/`error` state handling — no extra request-cancellation/race-guard logic:
    ```
    const [data, setData] = useState<TotalDebt | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTotalDebt = useCallback(async () => {
      setIsLoading(true)
      setError(null)
      try {
        setData(await searchTotalDebt(month, year))
      } catch (requestError: unknown) {
        setData(null)
        setError(requestError instanceof ApiError ? requestError.message : 'No se pudo conectar con el servidor.')
      } finally {
        setIsLoading(false)
      }
    }, [month, year])

    useEffect(() => {
      void fetchTotalDebt()
    }, [fetchTotalDebt])
    ```
    This stays race-safe without a cleanup flag because the month buttons are disabled while `isLoading` is true (see above) — a second fetch can never start before the first one settles.
  - Render: loading text while `isLoading`; error block with `role="alert"` + "Reintentar" retry button on error (same pattern as Payments Calendar); otherwise a result panel showing `currencyFormatter.format(Number(data?.totalAmount ?? 0))`, with a local `currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })` (duplicated per existing convention — `payments-calendar-view.tsx` does the same, no shared formatter module exists). `Number('0')` formats correctly as zero, so no special-casing is needed for the "no debt in range" case.

## Existing files to modify

- **`src/App.tsx`**
  - Add `import { TotalDebtView } from '@/total-debt/components/total-debt-view'` (after the `PaymentsCalendarView` import).
  - Add `{ label: 'Deuda total', to: '/total_debt' }` to `navigationItems`, after "Calendario de pagos".
  - Add `<Route path="/total_debt" element={<TotalDebtView />} />` inside `<Route element={<AuthenticatedLayout />}>`, after `/payments_calendar`.

`src/shared/api/api-error.ts` is **not** modified — errors are handled the same simple way `payments-calendar-view.tsx` already does (catch, check `instanceof ApiError`, fall back to a generic message), via the existing `apiJsonRequest`/`ApiError` as-is.

No test files are added in this pass (repo currently has no test framework/tests folder at all; introducing one is deferred to a separate change).
