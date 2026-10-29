# Plan: Dashboard Stats (frontend)

Part 1 covers the "Solicitudes de crédito" section and Part 2 the "Créditos en curso" section (both implemented); Part 3 adds the "Pagos" section.

Spec: `_specs/dashboard-stats-spec.md` | Branch: `claude/feature/dashboard-stats`

# Part 1 — Solicitudes de crédito (implemented)

## Context

The Dashboard currently shows only a greeting and, for members with no permissions, a "no sections assigned" notice. This adds the first stats section: for the authenticated company, the total number of credit request applications and how many are approved, rejected and pending evaluation (all time). Each dashboard section has its own backend endpoint guarded by its resource's permission, so each section is a self-contained component that fetches on its own and is only mounted when the user may see it.

**Backend contract** (backend spec `fintech/_specs/dashboard-stats-spec.md`, plan `fintech/_plans/dashboard-stats-plan.md`; implemented separately on the backend's `claude/feature/dashboard-stats` branch):
`GET /api/v1/credit-request-application/stats`, guarded by `credit_request_application.list` → `200 {"total": n, "approved": n, "rejected": n, "evaluationPending": n}` (integers, zeros included). Errors follow the usual shapes; `403` when the permission is missing.

Existing pieces this builds on:
- `apiJsonRequest` (`src/shared/api/api-client.ts`) — auth, token refresh and GET de-duplication. On a permission `403` it already re-fetches `/me` and updates the auth store, so a revoked permission makes the section disappear on its own (see step 4).
- `ROUTE_ACCESS.creditRequestApplications` + `canAccess` (`src/navigation.ts`) — already encodes "needs `credit_request_application.list`", and `hasPermissions` always passes for admins.
- `STATUS_LABELS` / `STATUS_CLASS_NAMES` in `src/credit-request-applications/components/credit-request-applications-view.tsx` — status labels and colors to stay consistent with.
- The fetch/loading/error/retry pattern of `src/total-debt/components/total-debt-view.tsx`.

## Approach

### 1. Shared status presentation — `src/credit-request-applications/types/credit-request-application-status.ts`

Move `STATUS_LABELS` and `STATUS_CLASS_NAMES` out of `credit-request-applications-view.tsx` into this new file (exported as `CREDIT_REQUEST_APPLICATION_STATUS_LABELS` / `CREDIT_REQUEST_APPLICATION_STATUS_CLASS_NAMES`) and import them back in the list view, so the dashboard reuses the same colors instead of duplicating them. The list view's labels are singular ("Aprobada"); the dashboard uses its own plural labels (step 4) but the shared colors.

### 2. Response schema and type — `src/credit-request-applications/schemas/credit-request-application-stats-schema.ts`

A zod object schema with four `z.number().int().nonnegative()` fields: `total`, `approved`, `rejected`, `evaluationPending`. Export the inferred type as `CreditRequestApplicationStats` (from the schema, so the type and the validation can't drift). Unknown extra fields are stripped (default zod behavior), so a future backend field doesn't break the section.

This is the first response-validating schema in the repo (other API wrappers cast); it's warranted here because the spec requires a malformed response to show the error state rather than `NaN`/`undefined`.

### 3. API wrapper — `src/credit-request-applications/api/credit-request-application-api.ts`

Add `fetchCreditRequestApplicationStats(): Promise<CreditRequestApplicationStats>` to the existing module API file:
- Calls `apiJsonRequest<unknown>('/credit-request-application/stats', { method: 'GET' })`.
- Parses the body with the schema (`safeParse`); on failure throws a plain `Error` (not an `ApiError`, since the request itself succeeded), which the section shows as its generic message. `ApiError`s from the client propagate unchanged.

### 4. Section component — `src/dashboard/components/credit-request-application-stats-section.tsx`

`export function CreditRequestApplicationStatsSection()`:
- Local `stats` / `isLoading` / `error` state and a `useCallback` fetch, triggered by `useEffect` on mount, same shape as `TotalDebtView`. Error text: `ApiError` → its message as-is; anything else (network failure or invalid response) → `No se pudieron cargar las estadísticas.`
- Card with header "Solicitudes de crédito" and a "Ver solicitudes" `Link` to `/credit_request_applications` (a plain `Link` — the section is only mounted when that route is allowed, so no `GatedLink` needed).
- Four figure tiles in a responsive grid (2 columns on phones, 4 on wider screens): "Total de solicitudes" (neutral), "Aprobadas", "Rechazadas", "Pendientes de evaluación" (accent colors from step 1). Values rendered straight from the response — no client-side sums.
- Loading: "Cargando estadísticas…" inside the card. Error: `role="alert"` message + "Reintentar" button inside the card, as in `TotalDebtView`.
- No refresh other than mount and retry (per spec's open questions). Navigating away unmounts the section and discards its state; coming back remounts and fetches fresh figures.

Revoked-permission flow: the endpoint returns `403` → the section shows its error; meanwhile `api-client` re-syncs `/me`, the user loses the permission in the store, `DashboardView` stops rendering the section, and it disappears. No extra handling needed.

### 5. Dashboard — `src/dashboard/components/dashboard-view.tsx`

- Read `canAccess(user, ROUTE_ACCESS.creditRequestApplications)` (inside the existing `useAuthStore` selector usage) and render `<CreditRequestApplicationStatsSection />` below the greeting only when true. When false the component isn't mounted, so its endpoint is never called.
- Keep the greeting and the no-permissions notice unchanged. Widen the container (currently `max-w-md`) so the four tiles fit, keeping the greeting centered.

No changes to `src/App.tsx`, `src/navigation.ts`, permissions or routes.

## Testing

`tests/credit-request-application-stats.test.ts` (pure logic, no DOM, per the current Vitest setup):

1. **Schema** — accepts a valid response and an all-zero one; strips an unknown extra field; rejects a missing field, a string number (`"3"`), a float and a negative value.
2. **API wrapper** — with `fetch` stubbed via `vi.stubGlobal` and a token set through `useAuthStore.setState`:
   - `200` valid body → resolves to the parsed stats and calls `/api/v1/credit-request-application/stats` with `GET` and the bearer token.
   - `200` malformed body → rejects with an error that is not an `ApiError`.
   - `403 {"error": "..."}` → rejects with an `ApiError` carrying status `403` and the backend message as-is (stub the follow-up `/me` call too).
   If importing the persisted auth store in the Node test environment proves noisy, scope that to this file rather than adding a global DOM setup.
3. **Visibility rule** — add a case to `tests/navigation.test.ts`: `canAccess(..., ROUTE_ACCESS.creditRequestApplications)` is true for an admin (even with an empty permission list) and for a member with `credit_request_application.list`, and false for a member without it and for `null`.

## Verification

1. Type-check, build, lint and tests via Docker (see `CLAUDE.md`): `npx tsc -b`, `npm run build && npm run lint`, `npm test`.
2. With the backend branch running and `docker compose up -d --build dev`:
   - Admin → section shows the four counts, matching `GET /api/v1/credit-request-application/stats`; "Ver solicitudes" opens the list.
   - Company with no applications → four zeros.
   - Member without `credit_request_application.list` → no section, and no `/stats` request in the network tab.
   - Revoke the permission from a logged-in member and, without reloading, retry the section → `403` error appears, then the section disappears after the `/me` re-sync.
   - Stop the backend → error with a working "Reintentar".

# Part 2 — Créditos en curso (implemented)

## Context

A second section shows, for the authenticated company's active credit requests, how many there are ("Total créditos") and the pooled paid percentage of their installments ("Porcentaje pagado"). It follows the same one-endpoint-per-section rule as Part 1, and is shown after "Solicitudes de crédito".

**Backend contract** (backend spec `fintech/_specs/dashboard-stats-spec.md`, Part 2 of `fintech/_plans/dashboard-stats-plan.md`; controller `CreditRequestInProgressStatsGetController`):
`GET /api/v1/credit-request/stats`, guarded by `credit_request.list` → `200 {"total": n, "paidPercentage": 37.5 | null}`. `total` is an integer; `paidPercentage` is rounded to two decimals, always encoded as a float (`100.0`, `0.0`), and `null` when there are no active credit requests.

With two sections, the fetch/loading/error/retry logic and the card chrome from Part 1 would be duplicated, so they're extracted first (step 1) and both sections are built on them.

## Approach

### 1. Shared section pieces — `src/dashboard/`

- **`src/dashboard/hooks/use-dashboard-stats.ts`**: `useDashboardStats<T>(fetchStats: () => Promise<T>)` returning `{ stats, isLoading, error, retry }`. It holds the state, `useCallback` fetch and mount `useEffect` that currently live in `CreditRequestApplicationStatsSection`, with the same error rule (`ApiError` → its message as-is; anything else → `No se pudieron cargar las estadísticas.`). The fetcher is a module-level function (e.g. `fetchCreditRequestApplicationStats`), so it's stable across renders and doesn't retrigger the effect.
- **`src/dashboard/components/dashboard-stats-card.tsx`**: `DashboardStatsCard` with props `titleId`, `title`, `linkTo`, `linkLabel`, `isLoading`, `error`, `onRetry` and `children` (the figures). It renders the `<section>` with its header, title and link, the loading text, and the `role="alert"` error with "Reintentar" exactly as in Part 1, and renders `children` only when not loading and with no error.
- Refactor `CreditRequestApplicationStatsSection` onto both, keeping its figures, labels, colors and markup unchanged. This is a behavior-preserving change; the Part 1 tests keep passing as they are.

### 2. Response schema and type — `src/credit-requests/schemas/credit-request-stats-schema.ts`

A zod object schema (new `schemas/` folder in the `credit-requests` module, mirroring `credit-request-applications`):
- `total`: `z.number().int().nonnegative()`.
- `paidPercentage`: `z.number().min(0).max(100).nullable()`. `100.0` parses as the number `100`, so whole values need no special handling.

Export the inferred type as `CreditRequestStats`.

### 3. API wrapper — `src/credit-requests/api/credit-request-api.ts`

Add `fetchCreditRequestStats(): Promise<CreditRequestStats>` next to `searchCreditRequests`, the same way as `fetchCreditRequestApplicationStats`: `apiJsonRequest<unknown>('/credit-request/stats', { method: 'GET' })`, `safeParse`, and a plain `Error` on an invalid body.

### 4. Percentage formatting — `src/dashboard/format-paid-percentage.ts`

`formatPaidPercentage(value: number | null): string`:
- `null` → `-`.
- Otherwise the value formatted with a module-level `Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })` followed by ` %` (e.g. `37,5 %`, `33,33 %`, `100 %`, `0 %`). The backend value is already a percentage, so it isn't divided by 100 for a `percent`-style formatter; that avoids floating point drift (e.g. `33.33 / 100`).

A separate pure function so it can be unit tested without a DOM.

### 5. Section component — `src/dashboard/components/credit-request-stats-section.tsx`

`export function CreditRequestStatsSection()`:
- `useDashboardStats(fetchCreditRequestStats)` and `DashboardStatsCard` with title "Créditos en curso" and a "Ver créditos" link to `/credit_requests`.
- Two figure tiles in a `dl` grid (2 columns), styled like the neutral "Total de solicitudes" tile: "Total créditos" (`stats.total`) and "Porcentaje pagado" (`formatPaidPercentage(stats.paidPercentage)`). Numbers only, no progress bar.

### 6. Dashboard — `src/dashboard/components/dashboard-view.tsx`

Add `showCreditRequestStats = canAccess(user, ROUTE_ACCESS.creditRequests)` (`credit_request.list`) and render `<CreditRequestStatsSection />` after the "Solicitudes de crédito" section when true. Each section is gated independently, so a member with only one of the permissions sees only that section, and only its endpoint is called. The revoked-permission flow works as in Part 1 (403 → section error → `/me` re-sync → section unmounts).

No changes to `src/App.tsx`, `src/navigation.ts`, permissions or routes.

## Testing

Rename `tests/credit-request-application-stats.test.ts` to `tests/dashboard-stats.test.ts` so both sections share the one `window`/`localStorage` stub the auth store needs, and add:

1. **Schema** — `creditRequestStatsSchema` accepts `{ total: 2, paidPercentage: 37.5 }`, `{ total: 0, paidPercentage: null }`, `0` and `100`; rejects a missing field, a non-integer or negative `total`, and a percentage below 0 or above 100.
2. **API wrapper** — `fetchCreditRequestStats` with `fetch` stubbed: a valid body resolves to the parsed stats and calls `/api/v1/credit-request/stats` with `GET`; a malformed body rejects with a non-`ApiError`; a `403 {"error": ...}` rejects with an `ApiError` carrying the status and message.
3. **Formatting** — `formatPaidPercentage`: `null` → `-`, `0` → `0 %`, `37.5` → `37,5 %`, `33.33` → `33,33 %`, `100` → `100 %`. Compare after normalizing whitespace, in case ICU adds a non-breaking space.
4. **Visibility rule** — in `tests/navigation.test.ts`, `canAccess(..., ROUTE_ACCESS.creditRequests)` is true for an admin (even with an empty permission list) and for a member with `credit_request.list`, and false for a member without it and for `null`.

## Verification

1. Type-check, build, lint and tests via Docker (see `CLAUDE.md`).
2. With the backend running (its in-progress stats endpoint is in place) and the dev server up:
   - Admin → both sections; "Créditos en curso" figures match `GET /api/v1/credit-request/stats`; "Ver créditos" opens the list.
   - Company with no active credits → "Total créditos" `0`, "Porcentaje pagado" `-`.
   - Member with only `credit_request.list` → only "Créditos en curso", and only the `/credit-request/stats` request in the network tab; member with only `credit_request_application.list` → only "Solicitudes de crédito".
   - Stop the backend → both sections show their own error with a working "Reintentar".

# Part 3 — Pagos

## Context

A third section, "Pagos", shows two lists of installments to pay for the authenticated company, in the payments calendar's format: "Pagos del mes" (pending installments due this month) and "Pagos vencidos" (overdue installments, any month), each with its total. Each payment shows the credit reference, "Cuota N/total", the due date and the amount, with a "Pagar" link. It's shown after "Créditos en curso", only to users with `payment_calendar.view`.

**Backend contract** (backend spec `fintech/_specs/dashboard-stats-spec.md`, Part 3 of `fintech/_plans/dashboard-stats-plan.md`; controller `InstallmentPaymentsDashboardGetController`):
`GET /api/v1/installment/dashboard-payments`, guarded by `payment_calendar.view` → `200 {"monthPayments": {"totalAmount": "…", "installments": [...]}, "overduePayments": {"totalAmount": "…", "installments": [...]}}`. Each list is the payments calendar's response shape; totals are decimal strings with two decimals (`"0.00"` when empty). Items come from `InstallmentSerializer` (`id`, `periodNumber`, `totalAmount`, `dueDate` as ATOM, e.g. `2026-10-15T00:00:00-03:00`, `status`, `creditRequestId`, `creditRequestReference`, …) plus the new `creditRequestInstallmentQuantity`. Lists are already ordered by due date and grouped by status; the frontend shows them as they come.

Existing pieces this builds on:
- `useDashboardStats` and `DashboardStatsCard` (Part 2) — fetch/loading/error/retry and card chrome; reused as they are.
- `src/payments-calendar/` — `PendingInstallmentsToPay` / `PendingInstallment` types, `payments-calendar-api.ts`, and in `payments-calendar-view.tsx` the `payGate = usePermissionGate(ROUTE_ACCESS.creditRequestPay.permissions)` + `GatedLink` to `/credit_requests/pay?id=<creditRequestId>`, the `es-AR` ARS currency formatter, and the overdue color (`rose`).
- `ROUTE_ACCESS.paymentsCalendar` (`payment_calendar.view`) for visibility.

## Approach

### 1. Response schema and type — `src/payments-calendar/schemas/dashboard-payments-schema.ts`

A new `schemas/` folder in the `payments-calendar` module (the frontend's installments-to-pay module, whose types the response mirrors). Zod schemas:
- `amount`: a decimal string (`/^\d+(\.\d+)?$/`) or a non-negative number, as the existing types allow `string | number`.
- `dashboardPaymentSchema`: `id`, `creditRequestId`, `creditRequestReference` (strings); `periodNumber`, `creditRequestInstallmentQuantity` (positive integers); `totalAmount` (`amount`); `dueDate` (`string | null`, as in `PendingInstallment`). Other serializer fields are stripped; only what the section shows is validated.
- `dashboardPaymentListSchema`: `{ totalAmount: amount, installments: z.array(dashboardPaymentSchema) }`.
- `dashboardPaymentsSchema`: `{ monthPayments: dashboardPaymentListSchema, overduePayments: dashboardPaymentListSchema }`.

Export the inferred types `DashboardPayment`, `DashboardPaymentList` and `DashboardPayments`. `PendingInstallment` (payments calendar) is left unchanged: it doesn't use the new field.

### 2. API wrapper — `src/payments-calendar/api/payments-calendar-api.ts`

Add `fetchDashboardPayments(): Promise<DashboardPayments>` next to `searchPendingInstallmentsToPay`, the same way as the other stats fetchers: `apiJsonRequest<unknown>('/installment/dashboard-payments', { method: 'GET' })`, `safeParse`, and a plain `Error` on an invalid body.

### 3. Due date formatting — `src/dashboard/format-due-date.ts`

`formatDueDate(value: string | null): string`:
- `null` → `-`.
- Reads year, month and day from the leading `YYYY-MM-DD` of the ATOM string (same regex approach as `getDueDay` in the payments calendar), builds a local `new Date(year, month - 1, day)` and formats it with `Intl.DateTimeFormat('es-AR', { dateStyle: 'short' })`, matching the applications list (e.g. `15/10/26`). Parsing the whole ATOM string with `new Date()` is avoided: it converts to the browser's time zone and can move the day.
- A value without a leading date → returned as-is (like `formatDate` in the applications list).

A separate pure function so it can be unit tested without a DOM.

### 4. Section component — `src/dashboard/components/payments-section.tsx`

`export function PaymentsSection()`:
- `useDashboardStats(fetchDashboardPayments)` and `DashboardStatsCard` with title "Pagos" and a "Ver calendario" link to `/payments_calendar`.
- `payGate = usePermissionGate(ROUTE_ACCESS.creditRequestPay.permissions)`, computed once in the section and passed down.
- Local `currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`, duplicated per the existing per-file convention.
- Two `PaymentList` blocks (a local component in the same file) in a grid, one column on phones and two from `sm` up: "Pagos del mes" and "Pagos vencidos". Props: `title`, `list`, `emptyMessage`, `overdue` (boolean, for the rose accent) and `payGate`.
  - Header: title + `currencyFormatter.format(Number(list.totalAmount))`.
  - Empty → the empty message ("No hay pagos del mes." / "No hay pagos vencidos.").
  - Otherwise a `ul` with a max height and `overflow-y-auto`, one `li` per payment (key `id`): reference, `Cuota {periodNumber}/{creditRequestInstallmentQuantity}`, `Vence {formatDueDate(dueDate)}`, the amount, and a "Pagar" `GatedLink` (`allowed`/`reason` from `payGate`) to `/credit_requests/pay?id=${encodeURIComponent(creditRequestId)}`, like the payments calendar.

### 5. Dashboard — `src/dashboard/components/dashboard-view.tsx`

Add `showPayments = canAccess(user, ROUTE_ACCESS.paymentsCalendar)` and render `<PaymentsSection />` after `<CreditRequestStatsSection />` when true. The revoked-permission flow works as in Part 1.

No changes to `src/App.tsx`, `src/navigation.ts`, permissions or routes.

## Testing

In `tests/dashboard-stats.test.ts` (it already has the `window`/`localStorage` stub the auth store needs):

1. **Schema** — `dashboardPaymentsSchema` accepts a valid response with payments in both lists, and two empty lists with `"0.00"` totals; strips unknown payment fields (e.g. `status`); rejects a missing list, a missing total, a payment without `creditRequestInstallmentQuantity`, and a non-numeric amount (`"abc"`).
2. **API wrapper** — `fetchDashboardPayments` with `fetch` stubbed: a valid body resolves to the parsed lists and calls `/api/v1/installment/dashboard-payments` with `GET`; a malformed body rejects with a non-`ApiError`; a `403 {"error": ...}` rejects with an `ApiError` carrying the status and message.
3. **Formatting** — `formatDueDate`: `2026-10-15T00:00:00-03:00` → `15/10/26`; `2026-10-01T00:00:00-03:00` → `01/10/26` and `2026-10-31T00:00:00-03:00` → `31/10/26` (the day doesn't move whatever the test machine's time zone); `null` → `-`.
4. **Visibility rule** — in `tests/navigation.test.ts`, `canAccess(..., ROUTE_ACCESS.paymentsCalendar)` is true for an admin (even with an empty permission list) and for a member with `payment_calendar.view`, and false for a member without it and for `null`.

## Verification

1. Type-check, build, lint and tests via Docker (see `CLAUDE.md`).
2. With the backend's Part 3 endpoint in place and the dev server up:
   - Admin → three sections in order; "Pagos" lists and totals match `GET /api/v1/installment/dashboard-payments`; "Ver calendario" opens the payments calendar; "Pagar" opens the pay screen of that credit.
   - Company with nothing to pay → both empty messages with `$ 0,00` totals.
   - Member with `payment_calendar.view` only → only "Pagos", with "Pagar" disabled and the missing permissions as the reason; member without it → no "Pagos" section and no `/dashboard-payments` request.
   - Pay an installment, return to the Dashboard → the lists reflect the payment.
   - Stop the backend → each section shows its own error with a working "Reintentar".
