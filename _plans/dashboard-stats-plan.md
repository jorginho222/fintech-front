# Plan: Dashboard Stats — Credit Request Applications Section (frontend)

Spec: `_specs/dashboard-stats.md` | Branch: `claude/feature/dashboard-stats`

## Context

The Dashboard currently shows only a greeting and, for members with no permissions, a "no sections assigned" notice. This adds the first stats section: for the authenticated company, the total number of credit request applications and how many are approved, rejected and pending evaluation (all time). Each dashboard section has its own backend endpoint guarded by its resource's permission, so each section is a self-contained component that fetches on its own and is only mounted when the user may see it.

**Backend contract** (backend spec `fintech/_specs/dashboard-stats.md`, plan `fintech/_plans/dashboard-stats-plan.md`; implemented separately on the backend's `claude/feature/dashboard-stats` branch):
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
