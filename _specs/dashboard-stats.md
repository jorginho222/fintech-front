# Spec for dashboard-stats

branch: claude/feature/dashboard-stats

## Summary
Show summary figures on the Dashboard, grouped into sections, where each section is backed by its own backend endpoint and shown only to users with the permission of the resource it summarizes. This first iteration delivers only the "Solicitudes de crédito" section: for the authenticated company, it shows the total number of credit request applications together with how many are approved, rejected and pending evaluation, counted over all time. The figures come from the backend endpoint `GET /api/v1/credit-request-application/stats` (backend spec: `fintech/_specs/dashboard-stats.md`), which returns `total`, `approved`, `rejected` and `evaluationPending` as integers. Further dashboard sections will be added later, each as its own independent section.

## Functional Requirements
- Add a "Solicitudes de crédito" stats section to the existing Dashboard view, below the greeting, keeping the current greeting and the "no permissions" notice for members without any permissions.
- The section requests its figures from the credit request application stats endpoint on its own; it does not depend on, or wait for, any other dashboard section.
- The section displays four clearly labeled figures:
  - Total de solicitudes
  - Aprobadas
  - Rechazadas
  - Pendientes de evaluación
- Status labels and status colors are consistent with the ones already used in the credit request applications list view.
- The figures are shown exactly as returned by the backend; the frontend does not compute or adjust counts (e.g. it does not derive the total from the breakdown, nor fetch the application list to count it).
- Zero counts are shown as `0`, never hidden or replaced with an empty state.
- The section is shown only to users who have the credit request application list permission (admins always have it). Users without it do not see the section at all and no request is made for it; other sections they are allowed to see are unaffected.
- The section offers a link to the credit request applications view so the user can go from the summary to the full list.
- While the figures are loading, show a loading state for the section only.
- If the request fails, show the error inside the section with a retry action, consistent with the error handling pattern used in other views (e.g. Payments Calendar, Total Debt). Backend `{"error": ...}` messages are shown as they come, per project conventions.
- A 403 for missing permission (e.g. permissions changed since login) is shown as a section-level error, not as a page-wide failure; the password-change 403 keeps its existing global handling.
- Figures cover all time; the section has no date range or other filters.
- All UI copy uses neutral Spanish with formal "usted".

## Possible Edge Cases
- Company has no credit request applications: all four figures show `0`, not an error or an empty-state message.
- Company has applications in only one status: the other status figures show `0`.
- Member user without the credit request application list permission: the section is not rendered and its endpoint is never called.
- Member user with no permissions at all: only the existing "no sections assigned" notice is shown, with no stats sections.
- Permission revoked after login: the endpoint returns 403; the section shows its error state while the rest of the dashboard keeps working.
- Backend response missing a field or with a non-integer value: treated as a failed request (error state with retry), not rendered as `NaN`/`undefined`.
- Backend later adds a new application status: the total returned by the backend may exceed the sum of the three shown figures; the frontend still shows the backend total as-is.
- User navigates away from the Dashboard before the request resolves: no stale result or state update error when they come back; returning to the Dashboard fetches fresh figures.

## Acceptance Criteria
- The Dashboard shows a "Solicitudes de crédito" section with the total, approved, rejected and evaluation-pending counts for the authenticated company.
- The figures match the backend response, including zeros.
- The section is visible only to users with the credit request application list permission, and its endpoint is not called otherwise.
- The section has visible loading and error states, and the error state offers a working retry action.
- The section links to the credit request applications view.
- The existing greeting and "no permissions" notice keep working as before.

## Open questions
- Should the figures refresh automatically (e.g. polling or on window focus), or only when the Dashboard is opened? Only when the Dashboard is opened (and on retry).
- Should each status figure link to the applications list filtered by that status? Not in this iteration; the list has no status filter yet, so the section links only to the unfiltered list.
- Should percentages be shown next to each status count? No, counts only.

## Testing Guidelines
Create a test file(s) in the ./tests folder for new feature, and create meaningful test for the following cases, without going too heavy:
- The stats response schema accepts a valid response (including all zeros) and rejects responses with missing or non-integer fields.
- The API client returns the parsed figures on success and surfaces the backend error (both `{"error": ...}` and status code) on failure.
- The permission check used to decide whether the section is shown returns true for admins and for members with the credit request application list permission, and false for members without it.
