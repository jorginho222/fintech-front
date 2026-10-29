# Spec for dashboard-stats

branch: claude/feature/dashboard-stats

## Summary
Show summary figures on the Dashboard, grouped into sections, where each section is backed by its own backend endpoint and shown only to users with the permission of the resource it summarizes (backend spec: `fintech/_specs/dashboard-stats-spec.md`). Further sections are added later, each as its own independent section. This spec covers three sections, all for the authenticated company:

- **Solicitudes de crédito** (implemented): the total number of credit request applications together with how many are approved, rejected and pending evaluation, counted over all time. Backed by `GET /api/v1/credit-request-application/stats`, which returns `total`, `approved`, `rejected` and `evaluationPending` as integers.
- **Créditos en curso** (implemented): figures about the company's active credit requests — how many there are ("Total créditos") and what percentage of their installments has been paid ("Porcentaje pagado"). Backed by `GET /api/v1/credit-request/stats`, which returns `total` as an integer and `paidPercentage` as a number rounded to two decimals, or `null` when the company has no active credit requests. The backend counts only active credit requests, the same ones listed on the "Créditos en curso" screen, so the dashboard and that list stay consistent.
- **Pagos**: two lists of installments to pay, in the same format as the payments calendar. "Pagos del mes" lists the pending installments due in the current month; "Pagos vencidos" lists the overdue installments, whatever month they were due in. Each list shows the total amount of its payments, and each payment shows its amount, due date, position in the credit ("1/12") and the credit reference, with a link to pay it. Backed by `GET /api/v1/installment/dashboard-payments`, which returns both lists in one response, each as a total amount plus its installments (the payments calendar's shape, with the credit's installment count added).

## Functional Requirements

### Common to every section
- Sections are shown on the existing Dashboard view, below the greeting, keeping the current greeting and the "no permissions" notice for members without any permissions.
- Each section requests its figures from its own endpoint; it does not depend on, or wait for, any other dashboard section.
- Each section is shown only to users who have the permission guarding its endpoint (admins always have every permission). Users without it do not see the section at all and no request is made for it; other sections they are allowed to see are unaffected.
- The figures are shown exactly as returned by the backend; the frontend does not compute or adjust them (e.g. it does not derive totals or percentages, filter or regroup lists, nor fetch full lists to count them).
- Each section offers a link to the view it summarizes, so the user can go from the summary to the full view.
- While a section's figures are loading, show a loading state for that section only.
- If a section's request fails, show the error inside that section with a retry action, consistent with the error handling pattern used in other views (e.g. Payments Calendar, Total Debt). Backend `{"error": ...}` messages are shown as they come, per project conventions.
- A 403 for missing permission (e.g. permissions changed since login) is shown as a section-level error, not as a page-wide failure; the password-change 403 keeps its existing global handling.
- Figures cover all time; sections have no date range or other filters, except where a section defines its own period (the "Pagos del mes" list is the current month, as decided by the backend).
- A malformed backend response (missing field or wrong type) is treated as a failed request for that section.
- Sections are shown in navigation order: "Solicitudes de crédito", "Créditos en curso", then "Pagos".
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

### Pagos section
- The section displays two lists, each with its own heading and total:
  - **Pagos del mes**: the pending installments due in the current month.
  - **Pagos vencidos**: the overdue installments, whatever month they were due in, visually marked as overdue (e.g. with the overdue color already used by the payments calendar).
- Each list shows its total amount as returned by the backend, formatted as currency like the payments calendar's monthly total.
- Each payment in a list shows:
  - the credit reference
  - its position in the credit, as "Cuota N/total" (e.g. "Cuota 1/12"), from the installment number and the credit's installment count
  - the due date, date only, in the same short format as the credit request applications list (e.g. 15/10/26), without shifting the day because of time zones
  - the amount to pay, formatted as currency
  - a "Pagar" link to the pay screen of its credit request, the same destination the payments calendar uses
- The "Pagar" link is disabled, with the reason shown, when the user lacks the permissions the pay screen requires (installment pay and credit request view), as on the payments calendar. The lists themselves are still shown.
- Payments are listed in the order returned by the backend (due date, oldest first); the frontend does not re-sort or move payments between lists.
- An empty list shows a short message ("No hay pagos del mes." / "No hay pagos vencidos.") together with its total of zero, not an error.
- All payments of each list are shown; a long list scrolls within the section instead of growing the page without limit.
- Shown only to users with the payment calendar view permission.
- Links to the payments calendar view.

## Possible Edge Cases

### Common to every section
- Member user with no permissions at all: only the existing "no sections assigned" notice is shown, with no stats sections.
- Member user with only some of the permissions: only those sections are shown, and only their endpoints are called.
- Permission revoked after login: that section's endpoint returns 403; the section shows its error state while the rest of the dashboard keeps working.
- One section fails while the others succeed: the failing section shows its error and retry, the others show their figures normally.
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

### Pagos section
- Company has no installments to pay: both lists show their empty message and a total of $ 0,00.
- Only one list has payments: the other shows its empty message; the section is not hidden.
- An installment due earlier this month that is now overdue appears only in "Pagos vencidos", as returned by the backend.
- A pending installment whose due date has passed but that the backend hasn't marked overdue yet stays in "Pagos del mes"; the frontend does not reclassify it.
- Several payments of the same credit request: each is listed separately, and each "Pagar" link goes to that credit's pay screen.
- Member with the payment calendar view permission but without installment pay or credit request view: both lists are shown with the "Pagar" links disabled and the missing permission as the reason.
- A due date on the first or last day of a month is shown on that same day, not the day before or after.
- Amounts arrive as decimal strings (e.g. "1234.56"); they are formatted as currency, not shown raw.
- Many overdue payments: the list scrolls inside the section.
- Backend response missing a list, a total or a payment field, or with a non-numeric amount: treated as a failed request (error state with retry).

## Acceptance Criteria

### Common to every section
- Each section is visible only to users with its permission, and its endpoint is not called otherwise.
- Each section has visible loading and error states, and the error state offers a working retry action.
- A failure in one section does not affect the others.
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

### Pagos section
- The Dashboard shows a "Pagos" section with "Pagos del mes" and "Pagos vencidos", each with its total and its payments as returned by the backend.
- Each payment shows the credit reference, "Cuota N/total", the due date and the amount, and has a "Pagar" link to its credit's pay screen.
- The "Pagar" link is disabled for users without the installment pay and credit request view permissions.
- Empty lists show their empty message and a zero total.
- The section is visible only to users with the payment calendar view permission.
- The section links to the payments calendar view.

## Open questions
- Should the figures refresh automatically (e.g. polling or on window focus), or only when the Dashboard is opened? Only when the Dashboard is opened (and on retry).
- Should each status figure link to the applications list filtered by that status? Not in this iteration; the list has no status filter yet, so the section links only to the unfiltered list.
- Should percentages be shown next to each application status count? No, counts only.
- In which order are the sections shown? Navigation order: "Solicitudes de crédito", "Créditos en curso", then "Pagos".
- What does "Porcentaje pagado" show with no active credits? "-", matching the backend's `null`.
- Should the "Pagos" lists be capped (e.g. the first five) with a "see more" link? No, all payments are shown, scrolling within the section when long.
- After paying an installment from the dashboard and coming back, should the lists update? Yes, through the normal refetch when the Dashboard is opened again; no extra refresh mechanism.

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

### Pagos section
- The payments response schema accepts a valid response (including two empty lists with zero totals) and rejects a missing list, total or payment field, or a non-numeric amount.
- The API client returns the parsed lists on success and surfaces the backend error on failure.
- The due date formatting shows the date only and keeps the same calendar day for dates at the start and end of a month.
- The permission check used to decide whether the section is shown returns true for admins and for members with the payment calendar view permission, and false for members without it.
