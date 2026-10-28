# Spec for dashboard-stats

branch: claude/feature/dashboard-stats

## Summary
Show summary figures on the Dashboard, grouped into sections, where each section is backed by its own backend endpoint and shown only to users with the permission of the resource it summarizes (backend spec: `fintech/_specs/dashboard-stats-spec.md`). Further sections are added later, each as its own independent section. This spec covers two sections, both for the authenticated company:

- **Solicitudes de crédito** (implemented): the total number of credit request applications together with how many are approved, rejected and pending evaluation, counted over all time. Backed by `GET /api/v1/credit-request-application/stats`, which returns `total`, `approved`, `rejected` and `evaluationPending` as integers.
- **Créditos en curso**: figures about the company's active credit requests — how many there are ("Total créditos") and what percentage of their installments has been paid ("Porcentaje pagado"). Backed by `GET /api/v1/credit-request/stats`, which returns `total` as an integer and `paidPercentage` as a number rounded to two decimals, or `null` when the company has no active credit requests. The backend counts only active credit requests, the same ones listed on the "Créditos en curso" screen, so the dashboard and that list stay consistent.

## Functional Requirements

### Common to every section
- Sections are shown on the existing Dashboard view, below the greeting, keeping the current greeting and the "no permissions" notice for members without any permissions.
- Each section requests its figures from its own endpoint; it does not depend on, or wait for, any other dashboard section.
- Each section is shown only to users who have the permission guarding its endpoint (admins always have every permission). Users without it do not see the section at all and no request is made for it; other sections they are allowed to see are unaffected.
- The figures are shown exactly as returned by the backend; the frontend does not compute or adjust them (e.g. it does not derive totals or percentages, nor fetch full lists to count them).
- Each section offers a link to the view it summarizes, so the user can go from the summary to the full list.
- While a section's figures are loading, show a loading state for that section only.
- If a section's request fails, show the error inside that section with a retry action, consistent with the error handling pattern used in other views (e.g. Payments Calendar, Total Debt). Backend `{"error": ...}` messages are shown as they come, per project conventions.
- A 403 for missing permission (e.g. permissions changed since login) is shown as a section-level error, not as a page-wide failure; the password-change 403 keeps its existing global handling.
- Figures cover all time; sections have no date range or other filters.
- A malformed backend response (missing field or wrong type) is treated as a failed request for that section.
- All UI copy uses neutral Spanish with formal "usted".

### Solicitudes de crédito section
- The section displays four clearly labeled figures:
  - Total de solicitudes
  - Aprobadas
  - Rechazadas
  - Pendientes de evaluación
- Status labels and status colors are consistent with the ones already used in the credit request applications list view.
- Zero counts are shown as `0`, never hidden or replaced with an empty state.
- Shown only to users with the credit request application list permission.
- Links to the credit request applications view.

### Créditos en curso section
- The section displays two clearly labeled figures:
  - **Total créditos**: the number of active credit requests, shown as an integer (`0` when there are none).
  - **Porcentaje pagado**: the paid percentage returned by the backend, shown as a percentage with up to two decimals in the app's locale format (e.g. 37,5 %, 33,33 %, 100 %).
- When the backend returns `null` for the percentage, the figure shows "-" instead of a percentage, so a company with no active credits never sees a misleading 0 %.
- A percentage of `0` (active credits with no paid installments yet) is shown as 0 %, not as "-".
- The percentage is shown as a number only, with no progress bar or other visual indicator.
- Shown only to users with the credit request list permission (the same one that guards the "Créditos en curso" list).
- Links to the "Créditos en curso" view.

## Possible Edge Cases

### Common to every section
- Member user with no permissions at all: only the existing "no sections assigned" notice is shown, with no stats sections.
- Member user with only one of the two permissions: only that section is shown, and only its endpoint is called.
- Permission revoked after login: that section's endpoint returns 403; the section shows its error state while the rest of the dashboard keeps working.
- One section fails while the other succeeds: the failing section shows its error and retry, the other shows its figures normally.
- User navigates away from the Dashboard before the requests resolve: no stale result or state update error when they come back; returning to the Dashboard fetches fresh figures.

### Solicitudes de crédito section
- Company has no credit request applications: all four figures show `0`, not an error or an empty-state message.
- Company has applications in only one status: the other status figures show `0`.
- Backend response missing a field or with a non-integer value: treated as a failed request (error state with retry), not rendered as `NaN`/`undefined`.
- Backend later adds a new application status: the total returned by the backend may exceed the sum of the three shown figures; the frontend still shows the backend total as-is.

### Créditos en curso section
- Company has no active credit requests: "Total créditos" shows `0` and "Porcentaje pagado" shows "-".
- Active credit requests with no paid installments yet: percentage shows 0 %.
- Every installment of the active credit requests is paid: percentage shows 100 %.
- Non-exact percentage (e.g. 33.33): shown with its two decimals as returned, not re-rounded to a whole number.
- Whole percentages arrive as decimals (e.g. `100.0`); they are shown without trailing zeros (100 %).
- Backend response with a negative or above-100 percentage, a non-integer total, or a missing field: treated as a failed request (error state with retry).

## Acceptance Criteria

### Common to every section
- Each section is visible only to users with its permission, and its endpoint is not called otherwise.
- Each section has visible loading and error states, and the error state offers a working retry action.
- A failure in one section does not affect the other.
- The existing greeting and "no permissions" notice keep working as before.

### Solicitudes de crédito section
- The Dashboard shows a "Solicitudes de crédito" section with the total, approved, rejected and evaluation-pending counts for the authenticated company.
- The figures match the backend response, including zeros.
- The section links to the credit request applications view.

### Créditos en curso section
- The Dashboard shows a "Créditos en curso" section with "Total créditos" and "Porcentaje pagado" for the authenticated company.
- The figures match the backend response; the percentage keeps up to two decimals.
- With no active credit requests, the total shows `0` and the percentage shows "-".
- The section is visible only to users with the credit request list permission.
- The section links to the "Créditos en curso" view.

## Open questions
- Should the figures refresh automatically (e.g. polling or on window focus), or only when the Dashboard is opened? Only when the Dashboard is opened (and on retry).
- Should each status figure link to the applications list filtered by that status? Not in this iteration; the list has no status filter yet, so the section links only to the unfiltered list.
- Should percentages be shown next to each application status count? No, counts only.
- In which order are the sections shown? "Solicitudes de crédito" first, then "Créditos en curso", following the navigation order.
- What does "Porcentaje pagado" show with no active credits? "-", matching the backend's `null`.

## Testing Guidelines
Create a test file(s) in the ./tests folder for new feature, and create meaningful test for the following cases, without going too heavy:

### Solicitudes de crédito section
- The stats response schema accepts a valid response (including all zeros) and rejects responses with missing or non-integer fields.
- The API client returns the parsed figures on success and surfaces the backend error (both `{"error": ...}` and status code) on failure.
- The permission check used to decide whether the section is shown returns true for admins and for members with the credit request application list permission, and false for members without it.

### Créditos en curso section
- The stats response schema accepts a valid response, a `null` percentage and whole/decimal percentages, and rejects a missing field, a non-integer total, or a percentage outside 0–100.
- The API client returns the parsed figures on success and surfaces the backend error on failure.
- The percentage formatting shows "-" for `null`, "0 %" for zero, and keeps up to two decimals without trailing zeros (e.g. 37,5 %, 33,33 %, 100 %).
- The permission check used to decide whether the section is shown returns true for admins and for members with the credit request list permission, and false for members without it.
