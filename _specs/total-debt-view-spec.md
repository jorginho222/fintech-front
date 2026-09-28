# Spec for total-debt-view

branch: claude/feature/total-debt-view

## Summary
Add a new "Total Debt" view where the user picks a limit month and year from a month/year calendar picker. Once a month/year is selected, the view calculates and displays, below the picker, the total outstanding debt due from today through the end of the selected month (i.e. the sum of all pending/overdue installment amounts falling between today and the last day of the selected month, inclusive).

## Functional Requirements
- Add a new navigation entry and route for the "Total Debt" view, consistent with the existing authenticated layout and navigation used by other views (e.g. Dashboard, Payments Calendar).
- The view presents a month/year picker (not a full day-by-day calendar grid) that lets the user choose a limit month and year.
  - The picker defaults to the current month and year on first load.
  - The user can navigate to future months/years only; a limit month earlier than the current month should not be selectable, since the total debt is always computed "from today" forward.
- On selecting a limit month/year, the view requests the total debt from the backend for the range from today's date through the last day of the selected month, and displays the returned total below the picker. The calculation itself (summing installment amounts, handling penalties/partial payments, etc.) is performed by the backend, not the frontend — the frontend only sends the range and renders the returned figure.
- The total is shown as a single, clearly labeled monetary amount (formatted as currency, consistent with existing formatting used in the Payments Calendar view), along with the selected limit month/year so the user has context for what the number represents.
- While the total is being calculated/fetched, show a loading state; the previously displayed total (if any) should not be misleading while loading.
- If the calculation/fetch fails, show an error message and allow the user to retry, consistent with the error handling pattern used in the Payments Calendar view.
- The view should only include installments belonging to the authenticated company, consistent with how other views scope data.

## Possible Edge Cases
- Selected limit month/year is the current month: total debt should include only installments due from today (inclusive) through the end of the current month, not the whole month.
- No pending installments exist within the selected range: total should display as zero, not an empty/error state.
- Selected limit month/year is far in the future (e.g. several years out): the calculation should still resolve correctly and not time out or be capped incorrectly.
- Rapid changes to the selected month/year (e.g. user clicks through several months quickly) should not result in an outdated total being displayed once the latest selection's result resolves.
- Installments that are already overdue (due date before today) should still be counted, since "today" is the lower bound of the range, not a filter that excludes past-due amounts still owed.
- User has zero credit requests / installments at all: the view should handle this gracefully with a total of zero rather than erroring.
- Switching away from the view and back should either preserve or safely reset the selection (default back to current month), but should never show a stale total from a prior session.

## Acceptance Criteria
- A "Total Debt" view is reachable from the main navigation.
- The view renders a month/year picker defaulting to the current month/year, with no day-of-week/day-of-month grid required.
- Attempting to pick a month/year before the current month is prevented or has no effect.
- Selecting a month/year triggers a calculation of total debt from today through the end of that month, and the result is displayed below the picker once available.
- The displayed total updates correctly when a different limit month/year is selected.
- Loading and error states are visibly handled and an error state offers a retry action.
- The total correctly reflects overdue and pending installments within range, and reflects zero when none exist.

## Open questions
- What's the backend to compute total outstanding debt? For now use consistent endpoint, it will be confirmed in a future.
- Should "total debt" include only pending/overdue installments, or also installments not yet due within the range but excluding future periods beyond the range boundary — i.e. is the definition strictly "sum of installment amounts with due date between today and end of selected month," or does it need to account for partial payments/penalties differently? This affects what the backend calculation should include, not the frontend. You should only send the month and year to endpoint
- Is there a maximum selectable limit month/year (e.g. bounded by the longest active credit request term), or is any future month allowed? No limits in month/year
- Should the view show a breakdown (e.g. per month or per credit request) in addition to the single total, or is a single aggregate figure sufficient for this iteration? Don't show breakdown

## Testing Guidelines
Create a test file(s) in the ./tests folder for new feature, and create meaningful test for the following cases, without going too heavy:
- Selecting a limit month/year triggers a request/calculation scoped to the range from today through the end of that month, and the total renders correctly.
- Limit months before the current month cannot be selected.
- Zero pending installments in range renders a zero total rather than an error or empty state.
- A failed calculation/fetch shows an error state with a working retry action.
