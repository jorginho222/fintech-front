# Plan: User Permissions Management (frontend)

Spec: `_specs/user-permissions-management.md`
Branch: `claude/feature/user-permissions-management` (already created)
Backend: `fintech/_plans/user-permissions-management-plan.md` (implemented; see its "API contract changes for the frontend" and "Implementation notes")

## Context

Today the only identity is the company: `auth-store.ts` holds `token`, `refreshToken` and `company`, `ProtectedRoute` only checks for a token, and `App.tsx` shows every navigation entry to everyone. The backend now has admins and members, per-endpoint permissions, a forced first-login password change and admin-only member management.

What I found in the current code that shapes the design:

- **422 field errors are dropped.** `ApiError` only keeps `status` and a message, and `getApiErrorMessage()` reads `error`/`message`. A `{"errors": {...}}` body becomes the generic "La solicitud no pudo completarse.", so neither registration nor any new form can show backend field errors. `ApiError` needs to carry the field map.
- **Every view already shows `ApiError.message`.** If the API client turns a permission 403 into a Spanish "no access" message, every existing view shows it for free, with no per-view changes.
- **The refresh flow rebuilds the session.** `requestTokenRefresh()` calls `login(token, refreshToken, company)`. It must also pass the new `user` block, or a refresh would wipe the stored user.
- **401 always means "refresh, then log out".** That's why the backend returns 422 (not 401) for a wrong current password. Deactivated members flow through this path unchanged: their access token gets 401, the refresh gets 401, `logout()` runs, and `ProtectedRoute` sends them to `/login`.
- **Pay and confirm screens depend on `credit_request.view`.** `credit-request-pay-view.tsx` and `credit-request-confirm-view.tsx` both start with `findCreditRequest()` (`GET /credit-request/{id}`). So in the UI, pay needs `installment.pay` + `credit_request.view`, and confirm needs `credit_request.confirm` + `credit_request.view` (spec edge case).
- **Logout lives inside `DashboardView`.** The change-password screen also needs it, so the handler moves to a reusable hook.
- **Gated actions are `<Link>`s.** Create application, confirm, show detail and pay are all links in list/detail views (`credit-request-applications-view.tsx:40,110,118`, `credit-requests-view.tsx:74`, `credit-request-show-view.tsx:187`, `payments-calendar-view.tsx:178`). A small "gated link" component that renders a disabled element when the permission is missing covers all of them.
- **No test setup exists.** There is no test runner and no `tests/` folder (the total-debt plan deferred it too).

## Decisions taken in this plan (flag if you disagree)

1. **Permission values are a `const` tuple in the frontend** (`PERMISSIONS`), mirroring the backend enum, with Spanish labels next to them. The catalogue endpoint still drives the picker (grouping and order), and unknown values from it fall back to the raw value as their label.
2. **The UI requirement for a route or action is a list of permissions, all required.** One map in `App.tsx` drives both the navigation filtering and the route guards, so they can't drift apart.
3. **The API client handles the two 403s globally:**
   - `Debe cambiar su contraseña para continuar.` (matched exactly) → sets `user.mustChangePassword = true` in the store, so `ProtectedRoute` redirects to `/change_password`.
   - Any other 403 (the backend's `No tiene permiso para acceder a este recurso.`) → the message is shown as is, and the client re-syncs the user from `GET /me` in the background, so the navigation and route guards update.
4. **The persisted auth store gets a `version` bump with a migration that drops old sessions.** A session from before this release has no `user`, and its refresh token would be rejected by the backend anyway, so the user simply logs in once.
5. **A session that ends because the refresh failed shows a message on the login screen** ("Tu sesión terminó. Ingresá nuevamente."), through a `sessionExpired` flag in the auth store, cleared on the next login.
6. **Member management is a new module, `src/member-users/`**, named after the backend's `MemberUser…` classes. Auth-related user code (the `CompanyUser` type, permissions, `/me`, password change) stays in `src/company/`, next to login.
7. **Light test setup:** add Vitest as a dev dependency and test only pure logic (schemas, permission helpers, API error parsing, navigation filtering), as the spec asks. Component/route tests are deferred until there's a DOM test setup. If you'd rather keep the repo test-free for now, the step can be skipped.

## Approach

### 1. Shared — errors and API client

- **`src/shared/api/api-error.ts`:**
  - `ApiError` gets a `fieldErrors: Record<string, string[]>` property (empty by default).
  - New `getApiFieldErrors(body)` parses the `{"errors": {...}}` shape, ignoring anything that isn't a string list.
  - `getApiErrorMessage()` falls back to the first field message when the body only has `errors`, so existing views no longer show the generic text for a 422.
- **`src/shared/forms/apply-api-field-errors.ts`** (new): given an `ApiError` and react-hook-form's `setError`, sets the first message of each backend field that exists in the form, and returns whether any field was set (callers fall back to a form-level error otherwise). An optional field-name mapping covers renamed fields (e.g. none today, but keeps the helper reusable).
- **`src/shared/api/api-client.ts`:**
  - `sendJsonRequest()` builds `ApiError` with the field errors.
  - Status 403 handling (Decision 3): detect the two backend messages by exact text, constants next to the client.
  - `requestTokenRefresh()`: pass `result.user` to `login(...)`; on an `ApiError` call `logout({ expired: true })`.
  - Type import renamed to `CompanyUserAuthResult`.
  - `/me` and `/me/password` are **not** added to `NO_REFRESH_PATHS`: a 401 there means an expired access token and should refresh like any other call.
- **`src/shared/components/no-access.tsx`** (new): a "no access" panel (title, short explanation, link back to the dashboard), styled like the existing error panels.
- **`src/shared/components/gated-link.tsx`** (new): takes the `Link` props plus `allowed` and `reason`. When allowed it renders the `Link` unchanged; otherwise it renders a non-interactive element with the same classes plus disabled styling, `aria-disabled`, and the reason as `title` and screen-reader text.

### 2. Company module — users, permissions, auth

- **`src/company/types/permission.ts`** (new):
  - `PERMISSIONS` tuple with the 8 backend values, and `type Permission`.
  - `PERMISSION_RESOURCES` tuple with the 4 group keys, and `type PermissionResource`.
  - `PERMISSION_LABELS: Record<Permission, string>` and `PERMISSION_RESOURCE_LABELS: Record<PermissionResource, string>`, with the Spanish labels from the spec's table. Typing them as `Record` makes a missing label a build error.
  - `getPermissionLabel(value: string)` and `getPermissionResourceLabel(value: string)`: return the Spanish label, or the raw value for an unknown one (spec edge case). Every place that displays a group or permission goes through these two helpers: the picker, the member list summary, the member detail and the `GatedLink` reasons.
  - `PermissionCatalogueGroup` interface: `resource: string`, `permissions: string[]`.
  - `isPermission(value)` type guard.
- **`src/company/types/company-user.ts`** (new):
  - `CompanyUserType = 'admin' | 'member'`.
  - `CompanyUser` interface matching the backend `CompanyUserSerializer` shape (`displayName: string | null`, `permissions: Permission[]`).
  - `hasPermissions(user, required)`: admins always pass; members need every required value.
- **`src/company/types/company.ts`:**
  - Rename `CompanyCredentials` → `CompanyUserCredentials` with `taxIdentifier` instead of `cuit`.
  - Rename `CompanyAuthResult` → `CompanyUserAuthResult` and add `user: CompanyUser`.
  - `Company`, `CompanyRegistration*` and `createDefaultCompanyRegistration()` stay.
- **`src/company/schemas/strong-password-schema.ts`** (new): reusable zod string mirroring `StrongPassword` (8–4096 characters, `[A-Z]`, `\d`, `[^A-Za-z\d]`), with one Spanish message per rule, reported together so the form lists every unmet rule.
- **`src/company/schemas/company-registration-schema.ts`:** use the strong-password schema for `password` (adds the number rule).
- **`src/company/schemas/company-login-schema.ts` → `company-user-login-schema.ts`:** `companyUserLoginSchema` with `taxIdentifier` (11 digits, message mentioning CUIT/CUIL) and `password`; types `CompanyUserLoginInput`/`CompanyUserLoginOutput`.
- **`src/company/schemas/password-change-schema.ts`** (new): `currentPassword` (required), `newPassword` (strong password), `newPasswordConfirmation` (frontend only). Refines: confirmation matches, new differs from current. A `toPasswordChangePayload()` step (or a `.transform`) drops the confirmation so `onSubmit` receives the backend payload.
- **`src/company/api/company-auth-api.ts`:**
  - `loginCompany()` → `loginCompanyUser(credentials: CompanyUserCredentials): Promise<CompanyUserAuthResult>`.
  - `logoutCompany()` → `logoutCompanyUser()`.
  - New `fetchCurrentUser(): Promise<CompanyUser>` (`GET /me`) and `changePassword(payload): Promise<CompanyUser>` (`PUT /me/password`).
- **`src/company/hooks/use-logout.ts`** (new): the logout handler currently in `DashboardView` (call the API, always clear the store, navigate to `/login`).
- **`src/company/hooks/use-permissions.ts`** (new): `useHasPermissions(required)` and `useIsAdmin()`, reading the user from the auth store.
- **`src/company/components/company-login-form.tsx` → `company-user-login-form.tsx`:**
  - Component `CompanyUserLoginForm`.
  - Field "CUIT/CUIL" registered as `taxIdentifier`; subtitle mentions both.
  - On success store `result.user` too, then navigate to `/change_password` when `mustChangePassword`, otherwise `/dashboard`.
  - Shows the `sessionExpired` message from the store when set.
- **`src/company/components/company-registration-form.tsx`:** map 422 field errors with `applyApiFieldErrors` (the new password rule makes this visible).
- **`src/company/components/password-change-view.tsx`** (new):
  - Card layout like the login form, rendered without the navigation.
  - Fields: current password, new password, confirmation. The new-password field lists every unmet policy rule.
  - Errors:
    - 422 with field errors → mapped onto the fields.
    - Any other `{"error": ...}` (wrong current password, new password equal to the current one) → the backend's Spanish message as a form-level error.
    - 409 → `fetchCurrentUser()`, store it, navigate to `/dashboard`.
  - On success store the returned user and navigate to `/dashboard`.
  - A "Cerrar sesión" button using `useLogout`.

### 3. Auth store and route guards

- **`src/store/auth-store.ts`:**
  - Add `user: CompanyUser | null` and `sessionExpired: boolean`.
  - `login(token, refreshToken, company, user)` clears `sessionExpired`.
  - `logout(options?: { expired?: boolean })`.
  - `setUser(user)` for `/me` and password-change results, and `markPasswordChangeRequired()` for the 403.
  - `persist` with `version: 1` and a `migrate` that returns a logged-out state for older versions (Decision 4). The cross-tab `storage` listener stays as is.
- **`src/protected-route.tsx`:**
  - Requires a token **and** a user; otherwise redirect to `/login`.
  - New prop to tell the change-password route apart: on normal routes, `mustChangePassword` redirects to `/change_password`; on the change-password route, a user without the flag is redirected to `/dashboard`.
- **`src/permission-route.tsx`** (new): `PermissionRoute` takes `permissions` (all required) and/or `adminOnly`, and renders `NoAccess` instead of its children when the user doesn't qualify.
- **Current-user sync on load:** `AuthenticatedLayout` runs `fetchCurrentUser()` once per mount and stores the result. Failures are ignored here: a 401 is already handled by the client, and a network error keeps the stored user.

### 4. App routing and navigation — `src/App.tsx`

- One `routeAccess` map keyed by path:

  | Path | Requires |
  |---|---|
  | `/dashboard` | nothing |
  | `/credit_request_applications` | `credit_request_application.list` |
  | `/credit_request_applications/create` | `credit_request_application.create` |
  | `/credit_requests/confirm` | `credit_request.confirm`, `credit_request.view` |
  | `/credit_requests` | `credit_request.list` |
  | `/credit_requests/show` | `credit_request.view` |
  | `/credit_requests/pay` | `installment.pay`, `credit_request.view` |
  | `/payments_calendar` | `payment_calendar.view` |
  | `/total_debt` | `total_debt.view` |
  | `/users`, `/users/create`, `/users/show` | admin only |

- `navigationItems` gain the access requirement from the map; `Navigation` filters them with `hasPermissions`/admin. New entry `{ label: 'Gestion de Usuarios', to: '/users' }`, admin only, last.
- Each authenticated route element is wrapped in `PermissionRoute` with its requirement.
- New `/change_password` route: a `ProtectedRoute` (change-password mode) around `PasswordChangeView`, in the same centred, navigation-less layout as `/login`.
- Login route uses `CompanyUserLoginForm`.
- A filtering helper (`getVisibleNavigationItems(user)`) is exported from a small module (e.g. `src/navigation.ts`) so it can be unit tested without rendering `App`.

### 5. Gating actions in existing views

Replace each gated `Link` with `GatedLink`, using `useHasPermissions` and a Spanish reason naming the missing permission:

| View | Action | Requires |
|---|---|---|
| `credit-request-applications-view.tsx` | "create application" | `credit_request_application.create` |
| `credit-request-applications-view.tsx` | confirm proposal | `credit_request.confirm`, `credit_request.view` |
| `credit-request-applications-view.tsx` | open detail | `credit_request.view` |
| `credit-requests-view.tsx` | open detail | `credit_request.view` |
| `credit-request-show-view.tsx` | pay | `installment.pay` |
| `payments-calendar-view.tsx` | pay | `installment.pay`, `credit_request.view` |

- `credit-request-application-create-view.tsx`: after creating, navigate to the list only if the user has `credit_request_application.list`, otherwise to `/dashboard`.
- `src/dashboard/components/dashboard-view.tsx`:
  - Use `useLogout`.
  - The title reads "Dashboard - {socialReason}", and the greeting shows only `user.displayName` ("Bienvenido, administrador." for the admin, whose `displayName` is null).
  - A member with no permissions sees a note saying no sections are assigned and to contact the admin.

### 6. Member management module — `src/member-users/`

- **`types/member-user.ts`:**
  - `MemberUserDraft` (`id`, `taxIdentifier`, `displayName`, `password`, `permissions: Permission[]`) and `createDefaultMemberUserDraft()` (fresh UUID v4, empty fields, no permissions).
  - `MAX_ACTIVE_MEMBER_USERS = 10`, mirroring `MemberUser::MAX_ACTIVE_PER_COMPANY`.
  - Members themselves use the `CompanyUser` type (same backend shape).
- **`schemas/`:**
  - `member-user-create-schema.ts`: mirrors `MemberUserCreateDto` (UUID v4 id; 11-digit `taxIdentifier` with a CUIL message; `displayName` trimmed, required, max 255; strong password; `permissions` an array of `PERMISSIONS` values, empty allowed).
  - `member-user-update-schema.ts`: `displayName` as above.
  - `member-user-permissions-schema.ts`: `permissions` as above.
- **`api/member-user-api.ts`:** `searchMemberUsers()`, `findMemberUser(id)`, `createMemberUser(draft)`, `updateMemberUser(id, { displayName })`, `updateMemberUserPermissions(id, { permissions })`, `deactivateMemberUser(id)`, `activateMemberUser(id)`, `fetchPermissionCatalogue()`. Paths: `/user/search`, `/user/{id}`, `/user`, `/user/{id}/permissions`, `/user/{id}/deactivate`, `/user/{id}/activate`, `/user/permission-catalogue`, with ids passed through `encodeURIComponent`.
- **`components/permission-picker.tsx`:**
  - Loads the catalogue itself, with loading, error and "Reintentar" states.
  - Renders one fieldset per resource, with `getPermissionResourceLabel()` as its legend, and a checkbox per permission labelled with `getPermissionLabel()`.
  - Controlled `value`/`onChange` so it plugs into react-hook-form via `Controller`.
- **`components/member-users-view.tsx`** (`/users`):
  - Header with "N de 10 usuarios activos" and a "Crear usuario" link, disabled at 10 with an explanation.
  - Table/list: CUIL, display name, status badge (inactive rows dimmed), permission count/summary, a link to the detail, and an activate/deactivate button. Activate is disabled at 10 active; deactivate asks for confirmation (`window.confirm`, consistent with the app's simplicity) explaining the loss of access.
  - After any toggle (success or 409/404), refetch the list. Errors show in an alert like the other list views.
  - Loading, error with retry, and an empty state ("Todavía no creaste usuarios").
- **`components/member-user-create-view.tsx`** (`/users/create`):
  - Form with CUIL, display name, initial password (rules listed) and `PermissionPicker`.
  - 422 → field errors. 409 (tax identifier taken, active limit) → the backend message as a form-level error.
  - On success navigate to the list with a notice that the user has to change the password on first login (router state read by the list). The draft is recreated on reset so a new UUID is used.
- **`components/member-user-show-view.tsx`** (`/users/show?id=`):
  - Loads with `findMemberUser`; 404 → the backend's `Usuario no encontrado.` with a link back.
  - Read-only CUIL and status. Two independent forms: display name (`PUT /user/{id}`) and permissions (`PermissionPicker` + `PUT /user/{id}/permissions`), each with its own save button, saving state and errors.
  - Activate/deactivate button with the same rules as the list.
  - Every successful response replaces the shown member with the returned one.

### 7. Tests (Decision 7)

- Add `vitest` as a dev dependency (via the Docker `npm install` command in `CLAUDE.md`) and an `npm test` script (`vitest run`). Vitest reads `vite.config.ts`, so the `@/` alias works as is.
- `tests/` files:
  - `company-user-login-schema.test.ts`: 11 digits accepted; wrong length and non-digits rejected; output has `taxIdentifier`.
  - `strong-password-schema.test.ts`: valid password accepted; too short, no uppercase, no number and no symbol each rejected with their own message, all listed at once; registration schema applies it.
  - `password-change-schema.test.ts`: mismatch and same-as-current rejected; output has no confirmation.
  - `member-user-schemas.test.ts`: CUIL format, required/trimmed/max-255 display name, unknown permission rejected, empty permission list accepted.
  - `permissions.test.ts`: `hasPermissions` for admin (always), member with all/some/none of the required values; the label helpers return the Spanish label for every known group and permission, and the raw value for an unknown one.
  - `navigation.test.ts`: admin sees everything plus "Gestion de Usuarios"; a member sees only permitted entries and never "Gestion de Usuarios"; a member with no permissions sees only the dashboard.
  - `api-error.test.ts`: field errors parsed from a 422 body; `applyApiFieldErrors` sets known fields and reports unknown ones.
- Route guarding, the 403 redirects and the screens are verified manually (below) until a DOM test setup exists.

## Implementation notes (differences from the plan above)

- **Route access map:** `ROUTE_ACCESS` is keyed by route name (e.g. `creditRequestPay`), not by path, and lives in `src/navigation.ts` with `NAVIGATION_ITEMS`, `canAccess()` and `getVisibleNavigationItems()`, so it can be tested without rendering `App`. `PermissionRoute` takes a single `access` prop (`{ permissions?, adminOnly? }`), and the views read their gate requirements from the same map.
- **Gated actions:** `usePermissionGate(required)` returns `{ allowed, reason }` for `GatedLink`. The reason names only the missing permissions, in Spanish, through `getMissingPermissions()` and `describeMissingPermissions()` in `company/types/company-user.ts`.
- **Password policy messages:** `strongPasswordSchema` reports all unmet rules in **one** message ("La contraseña debe tener un número y un carácter especial."), not one issue per rule, because react-hook-form only shows one message per field. `getUnmetPasswordRules()` and `PASSWORD_POLICY_HINT` are exported for reuse.
- **`applyApiFieldErrors`:** it takes the list of form fields to fill instead of an optional name mapping. Checking against the running backend showed two things the plan missed, and the helper handles both:
  - A field can return several messages (one per unmet password rule). They are all joined into the field's message.
  - List items come keyed by index (`permissions[0]`). They are matched to their field (`permissions`).
- **Unknown catalogue permissions:** they are shown with the raw value as their label, but their checkbox is **disabled**. The form schemas mirror the backend enum (per `CLAUDE.md`), so a value the frontend doesn't know can't be granted from here. The spec's edge case was updated to match.
- **Shared pieces added for member management:**
  - `member-users/schemas/member-user-schema-fields.ts` holds the `displayName` and `permissions` rules shared by the create, update and permissions schemas.
  - `MemberUserActiveToggle` is the activate/deactivate button (with the deactivation confirmation and the limit check), used by both the list and the detail.
  - `MemberUserStatusBadge` shows "Activo" or "Inactivo".
- **Member detail active count:** the detail view also calls `GET /user/search` to count active members, so it can disable "Activar" at the limit. The backend still enforces it.
- **Current-user sync:** `AuthenticatedLayout` only calls `/me` when there is a token.
- **Layout:** `App.tsx` gained a small `CenteredLayout` for `/login`, `/register` and `/change_password`, and a `guarded()` helper for the permission-wrapped routes.
- **Tests:** Vitest 5 is installed, with `npm test` (`vitest run`). There are 7 files and 41 tests in `tests/`, the folder the spec asks for. `AGENTS.md`, which said to place tests next to the code, and `CLAUDE.md`, which said there was no test suite, were updated.
- **Contract check:** the contract was verified against the running backend through the dev proxy (`curl`). This covered login with the `user` block, the catalogue shape, member create with 409/422, the password-change 403/422/409, the permission 403, the 404 for another company's user, and the 401 after deactivation.
- **Spanish backend messages:** after the implementation, the backend translated this feature's `{"error": ...}` messages (and the permission 403) to Spanish. The frontend now shows them as they come and decides by status code only:
  - The API client no longer rewrites the permission 403. Every 403 except the password-change one re-syncs `/me`.
  - The password-change 403 is still matched by its exact text (`Debe cambiar su contraseña para continuar.`), since it shares the status with the permission 403 and has no error code.
  - The password-change view and the create-member form no longer map English messages to fields. Their 422/409 `{"error": ...}` messages are form-level errors, so the CUIL-taken 409 is no longer on the CUIL field.
  - The member detail shows the backend's 404 message.
  - Pre-existing messages (`Invalid credentials.`, validation messages such as the password rules) are still English and are handled as before.

## Verification

1. Type check, build and lint through Docker (`npm run build && npm run lint`), then `npm test`.
2. Start the backend and `docker compose up -d --build --renew-anon-volumes dev` (new dependency), then check at http://localhost:5173:
   1. A session stored before this change is dropped, and the login screen shows up.
   2. An existing company logs in with its CUIT: every section shows, plus "Gestion de Usuarios".
   3. As admin, create a member with only `total_debt.view`; check the 10-user counter. Creating a member with the company's own CUIT shows the 409 message on the form, and a weak password lists the unmet rules.
   4. Log in as the member: the app goes straight to the change-password screen and any other URL redirects back. A wrong current password shows a field error and doesn't log out. After a valid change, the dashboard opens.
   5. The member only sees "Deuda total". `/credit_requests` by URL shows the "no access" panel; `/users` too.
   6. As admin, in another browser, grant `credit_request.list`; the member's navigation updates after reload. Revoke `total_debt.view` while the member is on that view: the next request shows the no-access message and the entry disappears.
   7. Give the member `installment.pay` without `credit_request.view`: the pay actions appear disabled with an explanation.
   8. Deactivate the member: their next request ends on the login screen with the "session ended" message, and logging in fails. Activate again: login works.
   9. Register a new company with a password that has no number: the form rejects it.
