# Spec for user-permissions-management

branch: claude/feature/user-permissions-management

## Summary
Frontend counterpart of the backend feature described in `fintech/_specs/user-permissions-management.md` and its implementation plan `fintech/_plans/user-permissions-management-plan.md` (section "11. Frontend", "API contract changes for the frontend", and "Implementation notes"). The backend is implemented; this spec follows the contract as built.

Today the app has a single identity: the company logs in with its CUIT and password and sees every section. The backend introduces two kinds of company users, distinguished by `user.type`:

- **Admin** (`type: "admin"`): the company's own account. Logs in with the company **CUIT**, always holds every permission, never has to change its password, and is the only user who can manage other users.
- **Member** (`type: "member"`, called "normal user" in the backend spec): a person created by the admin. Logs in with their own **CUIL** (11 digits, same format as a CUIT), works inside the same company dashboard on the same company data, but can only reach the sections they've been granted. Members must change the admin-set password on first login, and can be deactivated/activated but never deleted. A company can have at most **10 active members**.

On the frontend this feature delivers:

1. A login that accepts a CUIT or CUIL and stores the logged-in user (type, permissions, password-change flag) alongside the company.
2. A permission-aware dashboard: navigation entries, routes and actions the user cannot use are hidden or blocked.
3. A forced first-login password change screen for members.
4. A "Gestion de Usuarios" management section, visible only to the admin, to create, list, view, edit, change permissions of, deactivate and activate members.
5. The login/auth naming realigned from `Company…` to `CompanyUser…`, matching the backend renames.

Permission catalogue (backend `Permission` enum values, stable and never renamed), grouped by the backend's resource keys, and the frontend sections/actions each one gates:

- **`credit_request_application`**
  - `credit_request_application.list` → "Solicitud de creditos" list view
  - `credit_request_application.create` → the "create application" action and view
  - `credit_request.confirm` → the confirm proposal view/action
- **`credit_requests`**
  - `credit_request.view` → the credit request detail view
  - `credit_request.list` → "Créditos en curso" list view
  - `installment.pay` → the pay installment view/action
- **`payment_calendar`**
  - `payment_calendar.view` → "Calendario de pagos" view
- **`total_debt`**
  - `total_debt.view` → "Deuda total" view

Out of scope (deferred by the backend too): member profile data, showing who performed each action, the admin changing their own password, password recovery, and company-profile screens.

## Functional Requirements

**API contract (paths relative to `/api/v1`)**
- Changed:
  - `POST /login`: the request body sends `taxIdentifier` (11 digits) instead of `cuit`. The old `cuit` key is no longer accepted (422 on `taxIdentifier`). The response keeps `accessToken`, `refreshToken` and `company`, and adds a `user` block: `id`, `type` (`admin` | `member`), `taxIdentifier`, `displayName` (null for the admin), `active`, `mustChangePassword`, `permissions` (list of permission values).
  - `POST /refresh`: the response gets the same new `user` block. Refresh tokens issued before the backend release are rejected, so every user has to log in again once.
  - `POST /logout`: unchanged.
  - `POST /company_registration`: still sends `cuit`; the password policy now also requires a number.
- New, any logged-in user:
  - `GET /me`: returns the current `user` block.
  - `PUT /me/password`: body with `currentPassword` and `newPassword`.
- New, admin only (a member gets 403 on all of them):
  - `GET /user/search`: list the company's members.
  - `GET /user/permission-catalogue`: the permission catalogue grouped by resource.
  - `GET /user/{id}`: view one member.
  - `POST /user`: create a member, body with `id` (client-generated UUID v4), `taxIdentifier` (the member's CUIL), `displayName`, `password` and `permissions`.
  - `PUT /user/{id}`: body with `displayName`.
  - `PUT /user/{id}/permissions`: body with `permissions` (replaces the whole set).
  - `PUT /user/{id}/deactivate` and `PUT /user/{id}/activate`.
- Every user-shaped response (login/refresh `user` block, `/me`, `/me/password`, and every `/user…` endpoint except the catalogue) uses the same shape: `id`, `type`, `taxIdentifier`, `displayName`, `active`, `mustChangePassword` and `permissions`. `GET /user/search` returns a list of them; create, update, permissions, deactivate and activate return the updated member.
- `permissions` is required on create and on permissions update, even when empty (an empty list is valid; a missing key is a 422). Each value must be one of the catalogue values.
- `GET /user/permission-catalogue` returns a list of groups, each with a `resource` key (`credit_request_application`, `credit_requests`, `payment_calendar`, `total_debt`) and its `permissions` values, in catalogue order. It has no labels: the frontend provides Spanish labels for resources and permissions.
- Error bodies the frontend relies on. The `{"error": ...}` messages added by this feature are user-facing Spanish, so the frontend shows them as they come, without matching their text; only the status code decides the handling:
  - 401 `Invalid credentials.` on login with a wrong password **or** a deactivated account; 401 `Invalid refresh token.` on a rejected refresh. These pre-existing messages are still in English.
  - 403 `Debe cambiar su contraseña para continuar.` while `mustChangePassword` is set. This is the one message the frontend still matches exactly, because both 403s share the status and have no error code.
  - 403 `No tiene permiso para acceder a este recurso.` for a missing permission, or a member calling any `/user…` route.
  - 404 `Usuario no encontrado.` for a member of another company or a non-existent id.
  - 409 `Ya existe un usuario con ese CUIT/CUIL.` and 409 `La empresa ya alcanzó el máximo de usuarios activos.`
  - 422 `{"errors": {"field": [...]}}` for validation failures, keyed by the request field (`taxIdentifier`, `displayName`, `password`, `newPassword`, `permissions`…), one message per unmet password rule.
- There is no delete endpoint, and none must be offered in the UI.

**Login and session**
- The login form field is labelled "CUIT/CUIL" and sent as `taxIdentifier`, with the same validation as today's CUIT rule (exactly 11 digits, no dashes).
- After a successful login or refresh, the session stores the `user` block alongside the tokens and the company. It is persisted and kept in sync across tabs the same way the current session is. The refresh flow in the shared API client must update the stored user as well as the tokens.
- When the app loads with an existing session, it fetches `GET /me` and updates the stored user, so stale type, permissions or password-change flag from storage are corrected. A session persisted before this feature (no `user` stored) is handled the same way, or by forcing a fresh login if `/me` fails.
- The dashboard title shows the company name ("Dashboard - ACME SA"), and the greeting shows only the user's display name ("Bienvenido, Juan Pérez."). The admin has no display name, so their greeting is "Bienvenido, administrador."
- A deactivated member gets 401 on their next request and their refresh fails. This goes through the existing 401 → refresh → logout path and must end on the login screen like a session expiry, with no loop. Login with a deactivated account fails with the same invalid-credentials error as a wrong password (the backend doesn't reveal that the account exists).
- Logout works the same for both user types and remains available while a password change is pending.

**Permission-aware dashboard**
- The admin sees every navigation entry and every action exactly as today, plus the new "Gestion de Usuarios" entry.
- A member only sees the navigation entries whose permission they hold. "Gestion de Usuarios" is never shown to a member.
- Actions inside a view that need a separate permission (create application, confirm proposal, pay installment, opening a credit request's detail) stay visible but are disabled, with a short explanation of the missing permission, when the user lacks it, even if they can see the list. Navigation entries are hidden instead of disabled.
- Opening a route by URL without the matching permission shows a "no access" message inside the authenticated layout, not a broken or empty view.
- A 403 from a catalogue endpoint (e.g. a permission removed mid-session) shows a "you no longer have access" state instead of a generic error, and the current user is re-fetched from `/me` so navigation updates.
- A member with no permissions lands on the dashboard with a message saying they have no sections assigned and should contact their admin.
- Hiding sections is a convenience only; the backend remains the source of truth for authorization.

**First-login password change**
- When `user.mustChangePassword` is true, the user is sent to a dedicated "change password" screen and cannot reach any other authenticated route until the change succeeds. While the flag is set the backend answers 403 with a specific password-change error on every endpoint except `/me`, `/me/password` and `/logout`; if the frontend gets that error from any other request, it also sends the user to this screen.
- The form asks for the current password, the new password and a confirmation of the new password (the confirmation is frontend-only and is not sent).
- Client-side validation mirrors the backend policy: at least 8 characters, at least one uppercase letter, one number and one symbol, with each unmet rule listed. The new password must differ from the current one and match its confirmation.
- Backend errors are shown on the matching field or as a form-level error, handling both error shapes:
  - Wrong current password: 422 `{"error": "La contraseña actual es incorrecta."}`, shown as is as a form-level error. It is deliberately not a 401, so it never triggers the refresh/logout path.
  - New password equal to the current one: 422 `{"error": "La nueva contraseña debe ser distinta de la actual."}`, shown as is as a form-level error.
  - Policy violations: 422 `errors.newPassword`, one message per unmet rule, mapped to the new-password field.
  - Change no longer allowed (flag already cleared, e.g. in another tab): 409 `Este usuario no tiene permitido cambiar la contraseña.` Re-fetch `/me` and continue to the dashboard.
- A successful `PUT /me/password` returns the updated user (with `mustChangePassword: false`), which replaces the stored user.
- On success the stored `mustChangePassword` flag is cleared and the user goes to the dashboard without logging in again.
- The admin never sees this screen (`mustChangePassword` is always false for admins), and there's no "change my password" entry for anyone in this feature.
- The company registration form's password rules are aligned with the same policy (it currently lacks the "at least one number" rule).

**Member management (admin only)**
- The "Gestion de Usuarios" section lists the company's members (`GET /user/search`) with CUIL, display name, active/inactive status and a summary of their permissions. Inactive members are visually distinct.
- The list shows how many members are active out of the 10 allowed. At 10 active, the "create member" action and activating another member are disabled with an explanation.
- **Spanish labels for groups and permissions:** wherever a resource group or a permission is shown to the user (the permission picker, the member list summary, the member detail, and the "missing permission" notes on disabled actions), it uses its Spanish label, never the raw backend value. The labels are:

  | Backend value | Spanish label |
  |---|---|
  | `credit_request_application` (group) | Solicitudes de crédito |
  | `credit_request_application.list` | Ver solicitudes de crédito |
  | `credit_request_application.create` | Crear solicitudes de crédito |
  | `credit_request.confirm` | Confirmar propuestas de crédito |
  | `credit_requests` (group) | Créditos |
  | `credit_request.view` | Ver detalle de un crédito |
  | `credit_request.list` | Ver créditos en curso |
  | `installment.pay` | Pagar cuotas |
  | `payment_calendar` (group) | Calendario de pagos |
  | `payment_calendar.view` | Ver cuotas pendientes de pago |
  | `total_debt` (group) | Deuda total |
  | `total_debt.view` | Ver deuda total |

- **Create member** form: CUIL (11 digits), display name (required), initial password (same policy as above) and a permission picker. The id is a client-generated UUID v4, regenerated when the form is reset after a successful create. The picker is built from `GET /user/permission-catalogue`, grouped by resource, with each group titled by its Spanish label and one checkbox per permission showing its Spanish label (see the table above); an empty selection is allowed. After creating a member, the admin is told the member will have to change the password on first login.
- **Member detail** (`GET /user/{id}`): shows the member's data and lets the admin edit the display name (`PUT /user/{id}`) and replace the permission set with the same grouped picker (`PUT /user/{id}/permissions`). The CUIL and the password cannot be edited.
- **Deactivate / activate**: available from the list and the detail view. Deactivating asks for confirmation, explaining the member loses access immediately.
- Backend errors are shown clearly: CUIL already in use by any company or user (409) and active member limit reached (409) as a form-level error with the backend message, validation errors (422, mapped to fields, including an unknown permission), and member not found (404, shown as a "member not found" state with the backend message).
- The zod schemas mirror the backend DTO constraints exactly:
  - `CompanyUserLoginDto`: `taxIdentifier` matches 11 digits; `password` not blank.
  - `MemberUserCreateDto`: `id` UUID v4; `taxIdentifier` matches 11 digits; `displayName` not blank after trimming, at most 255 characters; `password` follows `StrongPassword`; `permissions` a list (possibly empty) of catalogue values.
  - `MemberUserUpdateDto`: `displayName` with the same rules as on create.
  - `MemberUserPermissionsUpdateDto`: `permissions` as on create.
  - `PasswordChangeDto`: `currentPassword` not blank; `newPassword` follows `StrongPassword`.
  - `StrongPassword`: 8 to 4096 characters, at least one uppercase letter (A–Z), one digit and one character that isn't a letter or digit.
- 422 field errors returned by the backend are mapped onto the matching form fields, not only shown as a generic message. Today the shared API error only keeps the `error`/`message` text and drops the `errors` map, so it needs to carry the field errors too.

**Naming alignment with the backend**
- The backend renames its login/logout/refresh classes from `Company…` to `CompanyUser…`. The frontend renames its login/auth names to match, and updates every import and usage:
  - The `CompanyCredentials` type becomes `CompanyUserCredentials`, and `CompanyAuthResult` becomes `CompanyUserAuthResult` (also used by the refresh flow in the shared API client).
  - The login schema file becomes `company-user-login-schema.ts`, with `companyUserLoginSchema`, `CompanyUserLoginInput` and `CompanyUserLoginOutput`.
  - The login form file becomes `company-user-login-form.tsx`, and its component `CompanyUserLoginForm`.
  - `loginCompany()` and `logoutCompany()` become `loginCompanyUser()` and `logoutCompanyUser()`.
- Not renamed: `Company`, `CompanyRegistration*`, `registerCompany()` (registration is still a company action), the `company/` folder, `company-auth-api.ts`, and the API paths (`/login`, `/logout`, `/refresh`, including the API client's no-refresh and public path lists).
- New member-management code uses the backend's "member" naming (e.g. member user types, schemas and API functions), while UI copy says "usuario".

## Possible Edge Cases
- An existing company logs in with its CUIT: it is an admin and sees everything exactly as before, plus "Gestion de Usuarios".
- First load after the release: the stored refresh token predates the `userId` claim and is rejected, so the user is sent to login once instead of being stuck in a refresh loop.
- A session persisted before this feature has no `user`: the app doesn't crash or show an empty navigation; it fetches `/me` or forces a new login.
- The admin creates a member whose CUIL equals an existing CUIT or CUIL, including their own company's CUIT: the 409 message is shown on the form.
- The admin creates an 11th active member, or activates one while 10 are active (e.g. the count changed in another tab): the 409 is shown and the list is refreshed.
- Deactivating an already inactive member or activating an already active one (stale list): the backend treats it as success; the list refreshes.
- The admin opens the detail URL of a member that doesn't exist or belongs to another company: 404 → "member not found" state.
- A member types the "Gestion de Usuarios" URL directly: the "no access" state is shown, never the management screens, and no `/user…` request is made.
- A member loses a permission while on that section: the next request returns 403, the view shows "no longer have access" and the navigation updates after re-fetching `/me`.
- A member is deactivated mid-session: the next request gets 401, refresh fails, and they land on the login screen.
- A member who must change their password navigates by URL, reloads, or opens another tab: still forced onto the change-password screen.
- A 403 password-change error arrives from any other endpoint (e.g. a stale stored flag): the user is redirected to the change-password screen.
- New password breaks the policy (e.g. no number or no symbol), equals the current one, or doesn't match the confirmation: rejected before sending, listing the specific rules.
- Wrong current password: the backend error is shown, the flag stays set, and the user stays on the screen.
- Password change returns 409 because the flag was already cleared (e.g. changed in another tab): re-fetch `/me` and continue to the dashboard.
- The pay and confirm screens load the credit request through `GET /credit-request/{id}`, which needs `credit_request.view`. So in the UI, paying needs `installment.pay` **and** `credit_request.view`, and confirming needs `credit_request.confirm` **and** `credit_request.view`. A member with only one of them sees the action disabled, with a note naming the missing permission, even though the backend would accept the bare pay/confirm call.
- A member has `credit_request.list` but not `credit_request.view`: list rows don't link into the detail view.
- The permission catalogue fails to load while creating or editing a member: the form shows an error with a retry instead of an empty picker.
- The catalogue returns a group or permission value the frontend has no Spanish label for (e.g. the backend added one before the frontend caught up): it's still shown, using the raw value as a fallback, but its checkbox is disabled: the form schemas mirror the backend enum, so it can't be granted until the frontend learns the value. This is only a safety net; every known value has a Spanish label.
- Two tabs are open and the member changes the password in one: the other tab picks up the cleared flag through the existing cross-tab session sync.

## Acceptance Criteria
- Login sends `taxIdentifier` from a "CUIT/CUIL" field; an existing company still logs in and sees every section.
- The `user` block from login and refresh is persisted, and is refreshed from `GET /me` on app load.
- A member only sees navigation entries and actions for the permissions they hold; direct URLs to other sections show a "no access" state.
- A 403 from a catalogue endpoint shows a "no longer have access" state and updates the navigation.
- A member with `mustChangePassword` can only reach the change-password screen (and logout) until `PUT /me/password` succeeds, then reaches the dashboard without logging in again.
- The change-password, create-member and registration forms enforce the full password policy (8+ characters, uppercase, number, symbol) and list unmet rules.
- The admin can list, create, view, edit the display name of, replace the permissions of, deactivate and activate members of their company, using the `/user…` endpoints.
- The permission picker is built from `GET /user/permission-catalogue`, grouped by resource.
- The UI prevents creating or activating beyond 10 active members and shows the backend's 409 if it happens anyway.
- There is no way in the UI to delete a member or for the admin to change a member's password.
- Members never see the "Gestion de Usuarios" section.
- A deactivated member ends up on the login screen on their next request.
- Login/auth names are renamed to `CompanyUser…` as listed, while registration names and API paths stay unchanged; the build and lint pass.

## Open questions
- Pay and confirm without `credit_request.view`: the backend accepts them, but the current screens need the credit request's details first. For now the UI requires both permissions. Alternatively, the backend could return the needed details under the pay/confirm permission. Revisit if admins hit this.
- Resolved by the backend implementation:
  - The password-change 403 is detected by its exact message, `Debe cambiar su contraseña para continuar.`; any other 403 is treated as a missing permission. The other messages of this feature are Spanish and shown as is.
  - The catalogue is a list of `{resource, permissions}` groups with no labels; Spanish labels live in the frontend.
  - `GET /user/search` takes no filters and isn't paginated (at most a handful of rows per company).

## Testing Guidelines
Create a test file(s) in the ./tests folder for new feature, and create meaningful test for the following cases, without going too heavy:
- The login schema accepts an 11-digit tax identifier and rejects wrong lengths or non-digits; the login request body sends `taxIdentifier`, not `cuit`.
- The password policy schema accepts a valid password and rejects ones that are too short, or lack an uppercase letter, a number or a symbol, listing each unmet rule; the registration schema applies the same policy.
- The change-password schema rejects a new password equal to the current one or not matching its confirmation.
- The create-member schema mirrors the backend constraints (CUIL format, required display name, password policy, permissions limited to catalogue values, empty selection allowed).
- Login and refresh store the `user` block; app load with a session updates it from `/me`.
- Navigation filtering: the admin sees all entries plus "Gestion de Usuarios"; a member sees only permitted entries and never "Gestion de Usuarios"; a member with no permissions sees the empty-state message.
- Route guarding: a forbidden route shows the "no access" state; a user with `mustChangePassword` is redirected to the change-password screen from any route, and a 403 password-change error from any request does the same.
- A successful password change clears the flag and navigates to the dashboard.
- Member management: the create action is disabled at 10 active members, and 409 conflict/limit errors are shown on the form.
- 422 field errors from the backend (`errors` map) end up on the matching form fields.
- A wrong current password (422) on the change-password screen shows a field error and does not log the user out.
