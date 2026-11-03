# Spec for installment-payment-webhook

branch: claude/feature/installment-payment-webhook

## Summary
The backend is replacing the synchronous installment payment with an asynchronous flow through an external payment webhook service (backend spec: `fintech/_specs/installment-payment-webhook-spec.md`, plan: `fintech/_plans/installment-payment-webhook-plan.md`). Confirming a payment no longer pays the installment: it submits a payment request, and the result (approved, rejected or could not be processed) arrives later. Each installment now carries a **last payment attempt** (status and date), separate from the installment status (pending, paid, overdue), which stays as it is.

This spec covers the frontend side:

- The pay screen asks for confirmation in a modal, calls the renamed endpoint, and on success stays on the same screen showing that the payment was submitted and is processing.
- The pay screen pays the specific installment the user chose, so overdue and retried installments can be paid.
- Processing payments move to their own subcard in the dashboard "Pagos" section and are not shown in the payments calendar.
- Rejected, failed and timed out payments stay in their usual lists with an indicator, and can be paid again.
- The payments calendar gets a color legend.

How each state is shown:

| Payment state | Dashboard "Pagos" | Payments calendar | Credit request installment list | Can pay |
|---|---|---|---|---|
| Pending, no attempt | "Pagos del mes" | Green | "Pendiente" | Yes (no button in the list) |
| Overdue, no attempt | "Pagos vencidos" | Red | "Vencida" | Yes, with a button |
| **Processing** | New "Pagos en proceso" subcard, yellow status with date | Not shown | Yellow processing status | No |
| **Rejected** | Month or overdue list, orange indicator with date | Orange (red if overdue) | Orange status with info icon | Yes, with a button |
| **Processing failed** | Month or overdue list, orange indicator with date | Orange (red if overdue) | Orange status with info icon | Yes, with a button |
| **Processing timeout** | Month or overdue list, orange indicator with date | Orange (red if overdue) | Orange status with info icon | Yes, with a button |
| Approved | Not listed (installment paid) | Not listed | "Pagada" | No |

Attempt labels, from `lastPaymentAttemptStatus`:

| Status | Label |
|---|---|
| `null` | Nothing shown |
| `processing` | Pago en proceso de confirmación |
| `approved` | Nothing shown (the paid status already says so) |
| `rejected` | Pago rechazado |
| `processing_failed` | No se pudo procesar el pago |
| `processing_timeout` | No se pudo confirmar el pago |

Email notifications, the timeout task and the webhook callback are backend-only and need no frontend work.

## Functional Requirements

### Data from the backend
- Installments returned by the credit request detail, the pay request response, the dashboard "Pagos" section and the payments calendar include `lastPaymentAttemptStatus` (one of the statuses above, or `null`) and `lastPaymentAttemptAt` (date-time, or `null`).
- The frontend shows lists and totals as returned; it does not infer attempts, regroup lists or compute totals.
- The error message the payment service sends on a processing failure is not returned by the API and is never shown.
- In the dashboard "Pagos" section, an unknown attempt status, a missing attempt field or a missing list is treated as a malformed response (section error with retry), as with the section's other fields.

### Backend lists and totals
Processing payments are separated by the backend, because hiding them only in the frontend would leave the totals wrong:
- `GET /api/v1/installment/dashboard-payments` returns a third list, `processingPayments` (total amount plus installments, same shape as the other two), with every installment whose last attempt is processing. `monthPayments` and `overduePayments` exclude them, and their totals do not count them.
- `GET /api/v1/installment/pending-to-pay/search` (payments calendar) excludes processing installments from its list and total.
- Total debt keeps counting processing installments, since they are unpaid until approved.

### Choosing the installment to pay
- Every pay link identifies the installment as well as the credit request: `/credit_requests/pay?id=<creditRequestId>&installmentId=<installmentId>`.
- The pay screen shows and pays that installment. Without `installmentId` (e.g. an old bookmark), it uses the credit's upcoming installment, as today.
- If `installmentId` does not belong to the credit, the screen shows "No se encontró la cuota indicada." with a link back to the credit. If the installment is already paid, it shows "Esta cuota ya fue pagada." with the same link.

### Pay screen
- The screen shows the credit reference, the installment position ("N/total") and the total to pay.
- When the last attempt was rejected, failed or timed out, the screen shows its label and date, and the user can pay again. For a timed out attempt it also says that paying again will not charge the installment twice.
- The screen's button reads "Pagar" (was "Confirmar pago"). It does not send the request. It opens a confirmation modal showing the installment position and the amount, with "Cancelar" and "Confirmar pago" actions.
- Cancelling the modal (button or Esc) closes it and sends nothing.
- Confirming in the modal calls `PUT /api/v1/installment/{id}/pay-request` (was `/installment/{id}/pay`). While the request is in flight, both modal actions are disabled, the confirm action reads "Enviando pago…", and the modal cannot be dismissed, so only one request is sent.
- On success (`202`):
  - the modal closes and the screen stays where it is, without navigating away;
  - the "Cancelar" and "Pagar" buttons are hidden;
  - a clearly visible success message says the request was sent, e.g. "Su solicitud de pago fue enviada correctamente. Le notificaremos el resultado por correo electrónico.";
  - the payment information stays visible: credit reference, installment position and total, plus the "Pago en proceso de confirmación" status in yellow with the last attempt date, taken from the response;
  - a "Volver" button returns to the view the user came from (payments calendar, dashboard or credit request). If there is no previous view (e.g. the screen was opened from a bookmark), it goes to the credit request.
- On failure, the modal closes and the screen shows the error, keeping "Cancelar" and "Pagar" available. Backend errors are shown as they come, including the new in-process error (`409`, "El pago de esta cuota está siendo procesado. Espere la confirmación antes de volver a intentarlo.") and the existing "already paid" error. After a `409`, the screen reloads the installment so it reflects its current state, keeping the error visible.
- Opening the screen for an installment already processing (e.g. from a stale view) shows the same payment information and processing status with "Volver" only, without the success message.

### Dashboard "Pagos" section
- The section shows "Pagos del mes" and "Pagos vencidos", plus the new **"Pagos en proceso"** subcard when it has payments, each with its total as returned by the backend.
- When "Pagos en proceso" has payments, it is shown in the middle: "Pagos del mes", "Pagos en proceso", "Pagos vencidos". When it is empty it is not shown at all, and the other two are shown as today.
- "Pagos en proceso" lists processing payments with the same information as the other lists, plus "Pago en proceso de confirmación" in yellow and the last attempt date below the "Cuota N/total · Vence …" line. It has no "Pagar" link. An overdue payment keeps the overdue accent on its due date.
- In "Pagos del mes" and "Pagos vencidos", below the "Cuota N/total · Vence …" line, a rejected, failed or timed out payment shows its indicator in orange with the last attempt date (e.g. "Pago rechazado · 15/10/26").
- These payments keep their "Pagar" link, gated by permissions as today.

### Payments calendar
- Processing payments are not shown, and are not part of the month total (decided by the backend).
- Each chip's dot follows the legend, replacing the current status colors:
  - **Green:** pending, not overdue, with no rejected, failed or timed out attempt.
  - **Orange:** rejected, processing failed or timed out attempt.
  - **Red:** overdue.
- An overdue installment with a rejected, failed or timed out attempt is red, since being overdue is the more urgent fact. Its tooltip still names the attempt.
- The calendar shows a legend (references) explaining the three colors.
- The chip's tooltip includes the attempt label when there is one (e.g. "Cuota N.º 3 — $ 10.000,00 — Pago rechazado").
- A pending installment past its due date that the backend has not marked overdue yet stays green; the frontend does not reclassify it.

### Credit request detail
- The installment list shows, next to the installment status badge:
  - for a processing attempt: "Pago en proceso de confirmación" in yellow;
  - for a rejected, failed or timed out attempt: its label in orange, with an info icon whose tooltip gives the last attempt date and says the installment can be paid again. The tooltip text is also available to screen readers.
- An overdue installment with a rejected attempt shows both "Vencida" and "Pago rechazado".
- The list gets a "Pagar" button on overdue installments and on installments with a rejected, failed or timed out attempt, gated by the pay permissions like other pay links. Processing, paid and other pending installments have none.
- The "Próxima cuota" card shows the same attempt status. Its "Pagar cuota" link is hidden while that installment is processing.
- The "Cuotas pagas" count and the credit request status only change once the backend applies an approved result.

### General
- Attempt labels, colors and the rules for when a payment can be paid are defined once and reused by every view.
- Attempt dates are shown date-only in the app's short format (e.g. 15/10/26), in the user's local time.
- Views show the attempt as of when they were loaded; there is no polling or automatic refresh.
- All new copy uses neutral Spanish with formal "usted".

## Possible Edge Cases
- Existing installments with no attempt: shown as today, apart from the calendar's new colors.
- User double-clicks "Confirmar pago" in the modal: the action is disabled after the first click, so one request is sent.
- User confirms the same installment in two tabs: the second gets the `409` in-process message, and the screen then shows the processing state.
- User presses Esc while the request is in flight: the modal stays open until the request finishes.
- User reloads the screen after a successful request: the success message is gone, but the processing status and date remain, with "Volver" only.
- User pays an overdue installment while an earlier pending one exists: the installment they chose is paid, not the upcoming one.
- Several overdue installments in one credit: each row or link pays its own installment.
- The payment is approved while the user is on a view: the view keeps its state until reloaded; a stale pay link reaches the pay screen, which shows "Esta cuota ya fue pagada."
- Payment approved for the last unpaid installment: after reload, the credit shows as paid and has no upcoming installment.
- Overdue installment with a rejected payment: listed in "Pagos vencidos" with the orange indicator, red in the calendar, and both badges with a "Pagar" button in the credit request.
- Pending installment with a timed out attempt: listed in "Pagos del mes" with the orange indicator, orange in the calendar.
- A late approval after a timeout: after reload, the installment is paid and shows no attempt label.
- No processing payments: the "Pagos en proceso" subcard is not shown; "Pagos del mes" and "Pagos vencidos" keep their empty messages when empty.
- Installment due this month becomes processing: it moves from "Pagos del mes" to "Pagos en proceso" on the next load, disappears from the calendar and from its total, and returns if the payment is rejected.
- Member without the pay permissions: "Pagar" links and buttons are disabled with the missing permission as the reason; processing payments have no link at all.
- The `202` response body is unusable: the payment was still submitted, so the screen shows the success message and reloads the installment instead of an error.
- Frontend deployed without the backend changes: the pay request fails, and the dashboard section shows its malformed-response error. Both sides must be deployed together.

## Acceptance Criteria
- The pay screen's "Pagar" button opens a modal and sends nothing; cancelling sends nothing; confirming sends one `PUT /api/v1/installment/{id}/pay-request` for the chosen installment.
- On `202`, the screen does not navigate; "Cancelar" and "Pagar" are hidden; the success message, payment information, processing status and last attempt date are shown; "Volver" returns to the previous view.
- A failed request shows the backend's message and leaves the installment payable, or reflects its processing state after a `409`.
- Pay links from the dashboard, calendar and credit request open the pay screen on that specific installment.
- The dashboard shows processing payments only in "Pagos en proceso", between "Pagos del mes" and "Pagos vencidos", with their status in yellow, their date and no "Pagar" link. With no processing payments, the subcard is not shown.
- Rejected, failed and timed out payments show an orange indicator with date in "Pagos del mes" or "Pagos vencidos", and keep "Pagar".
- The calendar does not show processing payments, uses green, orange and red dots per the legend, and displays the legend.
- The credit request installment list shows the processing status; shows rejected, failed and timed out in orange with an info icon; and has a "Pagar" button on those and on overdue installments.
- No view polls or refreshes on its own.

## Open questions
- Should the pay screen stay open after a successful request? Yes, with the success message, payment information and "Volver".
- Should views poll for the result? No; results can take up to 72 business hours, and the backend emails the company.
- Should approved attempts show a label? No; the paid status already says so.
- What color is an overdue installment with a rejected, failed or timed out attempt in the calendar? Red; the tooltip names the attempt.
- What color is the processing status? Yellow, distinct from the orange and red that signal a problem or a past due date.
- Should the "Pagos en proceso" subcard be hidden when empty? Yes. When it has payments, it goes between the other two.

## Testing Guidelines
Create a test file(s) in the ./tests folder for new feature, and create meaningful test for the following cases, without going too heavy:
- The attempt label helper returns the right label for `processing`, `rejected`, `processing_failed` and `processing_timeout`, and none for `null` and `approved`.
- The attempt indicator color is orange for rejected, failed and timed out attempts, and yellow for processing.
- The calendar color is green for pending with no attempt, orange for rejected, failed and timed out, and red for overdue, including overdue with a rejected attempt.
- The installment list's pay rule allows overdue and rejected, failed or timed out installments, and blocks processing (even when overdue), paid and pending with no attempt.
- Selecting the installment to pay: an `installmentId` picks that installment, including an overdue one; an unknown one gives nothing; no `installmentId` gives the upcoming installment.
- The pay URL includes the encoded credit request and installment identifiers.
- The dashboard payments schema requires the three lists, accepts every attempt status and `null`, and rejects an unknown status and a missing attempt field.
- The pay request API wrapper calls `PUT /api/v1/installment/{id}/pay-request`, resolves with the credit request on `202`, and rejects with an `ApiError` carrying the status and backend message on `409`.
