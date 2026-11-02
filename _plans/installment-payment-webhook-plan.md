# Plan: Installment Payment Webhook (frontend)

Spec: `_specs/installment-payment-webhook-spec.md` | Branch: `claude/feature/installment-payment-webhook`

## Context

The backend is making installment payment asynchronous (backend spec `fintech/_specs/installment-payment-webhook-spec.md`, plan `fintech/_plans/installment-payment-webhook-plan.md`, same branch name in the backend repo; not implemented yet). For the frontend this means a renamed endpoint, two new fields on every serialized installment, and a new way to present each payment state.

**Backend contract** (backend plan steps 6, 9 and 10):
- `PUT /api/v1/installment/{id}/pay-request` (was `PUT /installment/{id}/pay`) — same permission (`installment.pay`) and ownership check. Answers `202` with the serialized credit request. Errors: `409` `InstallmentPaymentInProcessException` and the existing `409` `InstallmentAlreadyPaidException`.
- `InstallmentSerializer::serialize()` (dashboard, calendar) and `CreditRequestSerializer::serializeInstallment()` (credit detail, pay response) add `lastPaymentAttemptStatus` (`'processing' | 'approved' | 'rejected' | 'processing_failed' | 'processing_timeout' | null`) and `lastPaymentAttemptAt` (ATOM or `null`).
- `GET /api/v1/installment/dashboard-payments` adds `processingPayments` (`{ totalAmount, installments }`). `monthPayments` and `overduePayments` exclude processing installments from their lists and totals.
- `GET /api/v1/installment/pending-to-pay/search` excludes processing installments from its list and total. Total debt keeps counting them.

Existing pieces this builds on:
- `payInstallment` (`src/credit-requests/api/credit-request-api.ts`) and `CreditRequestPayView`, which today pays `creditRequest.upcomingInstallment` and then `goBack()`. `goBack()` already handles returning to the calendar, dashboard or credit.
- The backend's `upcomingInstallment` only considers pending installments, and `Installment::pay()` has no ordering rule. So the pay screen can pay any unpaid installment once it knows which one; today a "Pagar" on an overdue row targets the wrong installment.
- `CreditRequestShowView` (`StatusBadge`, `formatDate`), `PaymentsSection` + `PaymentList`, `PaymentsCalendarView` (`INSTALLMENT_STATUS_DOT_STYLES`), each with `payGate` + `GatedLink`.
- `dashboardPaymentSchema` (`src/payments-calendar/schemas/dashboard-payments-schema.ts`).
- No modal exists in the frontend yet.

## Approach

### 1. Attempt rules — `src/credit-requests/types/installment-payment-attempt.ts`

One pure module (no React) used by every view:
- `INSTALLMENT_PAYMENT_ATTEMPT_STATUSES` (`as const`) and `type InstallmentPaymentAttemptStatus`, so the zod enum (step 3) and the type share one list.
- `getPaymentAttemptLabel(status): string | null` — the spec's labels; `null` for `null` and `approved`.
- `isPaymentProcessing(status): boolean`.
- `hasFailedPaymentAttempt(status): boolean` — `rejected`, `processing_failed` or `processing_timeout`.
- `getDashboardIndicatorClassName(status): string` — `text-orange-400` for rejected, failed and timeout, `text-amber-300` for processing.
- `getCalendarPaymentTone(status: InstallmentStatus, attempt): 'ok' | 'attention' | 'overdue'` — `overdue` first, then `attention` when `hasFailedPaymentAttempt`, otherwise `ok`.
- `canPayFromInstallmentList(status, attempt): boolean` — false when paid or processing; true when overdue or `hasFailedPaymentAttempt`; otherwise false.
- `formatPaymentAttemptDate(value: string | null): string` — date-only `es-AR` short format, in local time (an instant, unlike due dates, so `formatDueDate` doesn't apply); `null` → `-`; unparsable → returned as-is.

### 2. Installment types and pay URL

- `src/credit-requests/types/credit-request.ts` and `src/payments-calendar/types/payments-calendar.ts` — add `lastPaymentAttemptStatus` and `lastPaymentAttemptAt` to `CreditRequestInstallment` and `PendingInstallment`.
- `buildInstallmentPayUrl(creditRequestId, installmentId): string` and `selectInstallmentToPay(creditRequest, installmentId: string | null): CreditRequestInstallment | null` in a new `src/credit-requests/installment-to-pay.ts`. With an id, it looks in `creditRequest.installments`; without one, it returns `upcomingInstallment`.

### 3. Dashboard payments schema — `src/payments-calendar/schemas/dashboard-payments-schema.ts`

Add to `dashboardPaymentSchema`, all required:
- `status: z.enum(['pending', 'paid', 'overdue'])` — a processing overdue payment needs its overdue accent in the new subcard.
- `lastPaymentAttemptStatus: z.enum(INSTALLMENT_PAYMENT_ATTEMPT_STATUSES).nullable()`
- `lastPaymentAttemptAt: z.string().nullable()`

Add `processingPayments: dashboardPaymentListSchema` to `dashboardPaymentsSchema`.

### 4. API wrapper — `src/credit-requests/api/credit-request-api.ts`

Rename `payInstallment` to `requestInstallmentPayment(id): Promise<CreditRequest | null>`, calling `PUT /installment/{id}/pay-request`. `202` is `response.ok`, and the client returns `null` for an unparsable body, which step 6 handles. The pay view is its only caller.

### 5. Confirmation modal — `src/shared/components/confirm-dialog.tsx`

`ConfirmDialog({ open, title, children, confirmLabel, cancelLabel, isConfirming, onConfirm, onCancel })`, built on the native `<dialog>`, which provides focus trapping, Esc and a backdrop without a new dependency:
- An effect calls `showModal()` / `close()` from `open`.
- The dialog's `cancel` event (Esc) calls `preventDefault()`, then `onCancel()` unless `isConfirming`, so React state stays the source of truth.
- Both buttons are disabled while `isConfirming`.
- Styling matches the app's cards, with `backdrop:bg-black/60`. It needs `m-auto`, since Tailwind's preflight removes the margin that centers a native dialog.

### 6. Pay screen — `src/credit-requests/components/credit-request-pay-view.tsx`

- Read `installmentId` from the search params; `installment = selectInstallmentToPay(creditRequest, installmentId)`.
- Extract the fetch into `loadCreditRequest({ keepError })`, keeping the `isCurrent` guard, so it can also run after a pay request.
- New state: `isConfirmOpen`, `isSubmitted`.
- The screen button, relabeled "Pagar" (was "Confirmar pago"), sets `isConfirmOpen`. `handlePay` runs from the modal:
  - `requestInstallmentPayment(installment.id)`; on success close the modal and set `isSubmitted`, then `setCreditRequest(result)`, or `loadCreditRequest()` when `result` is `null`. No `goBack()`.
  - On error close the modal and show the message as today; on `ApiError` with `status === 409`, also `loadCreditRequest({ keepError: true })`.
  - `setIsPaying(false)` in `finally`.
- Rendering:
  - No installment → existing error card: "No se encontró la cuota indicada." when `installmentId` was given, otherwise the existing "no pending installment" message. `status === 'paid'` → the same card with "Esta cuota ya fue pagada."
  - `isSubmitted` → success message with `role="status"`, emerald, above the payment information.
  - Payment information always stays: reference, "Cuota N/total", total. Subtitle reads "Confirme el pago de la cuota N/total" only while payable.
  - Attempt line with label and `formatPaymentAttemptDate`, in `getDashboardIndicatorClassName` color; for `processing_timeout`, the line "Puede volver a intentarlo: la cuota no se cobrará dos veces."
  - Footer: when `isPaymentProcessing(attempt)` (which covers the submitted state) only "Volver", calling `goBack()`; otherwise "Cancelar" and "Pagar".
- `ConfirmDialog` shows "Cuota N/total" and the amount, with `isConfirming={isPaying}` and "Enviando pago…" as the label in flight.

### 7. Attempt badge — `src/credit-requests/components/payment-attempt-badge.tsx`

Used by the credit request detail only. `PaymentAttemptBadge({ status, at })` renders nothing without a label. Processing: yellow pill, the same style as the "Pendiente" badge (`border-amber-800/80 bg-amber-950/60 text-amber-300`). Failed attempts: orange pill (`border-orange-800/80 bg-orange-950/60 text-orange-300`), with an info icon whose `title` is `Último intento: <date>. Puede volver a pagar esta cuota.`, repeated in an `sr-only` span since `title` isn't reliable for touch or screen readers.

### 8. Credit request detail — `src/credit-requests/components/credit-request-show-view.tsx`

- Installments table: in "Estado", `StatusBadge` and `PaymentAttemptBadge` in a `flex flex-wrap gap-1.5`. New last column with an empty header (`sr-only` "Acciones"): a "Pagar" `GatedLink` to `buildInstallmentPayUrl(...)` when `canPayFromInstallmentList(...)`.
- "Próxima cuota": `PaymentAttemptBadge` next to the status badge; "Pagar cuota" uses `buildInstallmentPayUrl(...)` and isn't rendered while `isPaymentProcessing`.

### 9. Dashboard "Pagos" — `src/dashboard/components/payments-section.tsx`

- Order: "Pagos del mes", "Pagos en proceso", "Pagos vencidos". The middle `PaymentList` is rendered only when `stats.processingPayments.installments.length > 0`, so it needs no empty message.
- Grid: without it, one column on phones and two from `sm` up, as today. With it, one column up to `lg` (two columns would break the middle position) and three from `lg` up.
- Three columns don't fit the `max-w-3xl` container in `src/dashboard/components/dashboard-view.tsx`, so it becomes `max-w-3xl lg:max-w-5xl`, and rows use `flex-wrap` so the amount and "Pagar" can wrap below the reference.
- Rows:
  - Due date accent: `overdue || installment.status === 'overdue'`.
  - Below the "Cuota … · Vence …" line, when there's a label: `{label} · {formatPaymentAttemptDate(at)}` in `getDashboardIndicatorClassName(status)`.
  - "Pagar" uses `buildInstallmentPayUrl(...)` and isn't rendered when `isPaymentProcessing`, so `PaymentList` needs no extra prop.

### 10. Payments calendar — `src/payments-calendar/components/payments-calendar-view.tsx`

- Replace `INSTALLMENT_STATUS_DOT_STYLES` with `CALENDAR_TONE_STYLES`: `ok` `bg-emerald-400`, `attention` `bg-orange-400`, `overdue` `bg-rose-400`, keyed by `getCalendarPaymentTone(...)`.
- Chip `to` uses `buildInstallmentPayUrl(...)`; `title` appends ` — <label>` when there's one.
- Legend below the grid, above "Total del mes", from the same styles: "Pendiente", "Pago rechazado, no procesado o sin confirmar", "Vencida".
- No client-side filter: the backend excludes processing installments, so the list and total stay in agreement.

No changes to `src/App.tsx`, `src/navigation.ts`, permissions, routes or the total debt view.

## Testing

New `tests/installment-payment-attempt.test.ts` (copy the `window`/`localStorage` `vi.hoisted` stub from `tests/dashboard-stats.test.ts`, which the API wrapper test needs through the auth store):

1. **Labels** — `getPaymentAttemptLabel` for all five statuses and `null`.
2. **Indicator color** — orange for `rejected`, `processing_failed` and `processing_timeout`; yellow for `processing`.
3. **Calendar tone** — pending + `null` → `ok`; pending + each failed attempt → `attention`; overdue + `null` and overdue + `rejected` → `overdue`.
4. **List pay rule** — `canPayFromInstallmentList`: true for overdue and for pending with a failed attempt; false for processing (pending and overdue), paid + `approved`, and pending + `null`.
5. **Installment selection** — `selectInstallmentToPay`: an id picks that installment, including an overdue one; an unknown id → `null`; no id → `upcomingInstallment`. `buildInstallmentPayUrl` encodes both ids.
6. **Attempt date** — `formatPaymentAttemptDate`: `null` → `-`; valid ATOM → short date; unparsable → as-is.
7. **API wrapper** — `requestInstallmentPayment` with `fetch` stubbed: `202` with a body → resolves to it and calls `/api/v1/installment/<id>/pay-request` with `PUT`; `409 {"error": …}` → rejects with an `ApiError` with that status and message.

In `tests/dashboard-stats.test.ts`:

8. **Schema** — add the new fields and `processingPayments` to the fixtures. The "strips unknown fields (e.g. `status`)" case switches to another field, e.g. `capitalAmount`. Add: accepts each attempt status with a date; rejects an unknown status, a missing attempt field and a missing `processingPayments`.

The modal and views have no automated tests (no DOM setup in this repo); they're covered below.

## Verification

1. Type-check, build, lint and tests via Docker (see `CLAUDE.md`): `npx tsc -b`, `npm run build && npm run lint`, `npm test`.
2. With the backend branch running (API + `worker`) and `docker compose up -d --build dev`:
   - **Modal:** "Pagar" opens it with nothing sent (network tab); Cancelar and Esc close it; confirming sends one `PUT …/pay-request`.
   - **After `202`:** same screen, no "Cancelar" or "Pagar", success message, payment information, processing status and date. "Volver" returns to the origin; check from the calendar, dashboard and credit request. Reload → no success message, status kept.
   - **Processing:** dashboard shows it only in "Pagos en proceso", in the middle, yellow, no "Pagar"; with no processing payments the subcard isn't shown; "Pagos del mes" total no longer includes it. Calendar doesn't show it or count it. Total debt still counts it. Credit request shows the status in the list, and "Pagar cuota" is hidden.
   - **Rejected and failed:** send `PUT /api/v1/installment-payment-update` with the secret and `REJECTED`, then `PROCESSING_FAILED`; let the worker consume. Dashboard orange indicator with date and "Pagar"; calendar orange; credit request orange with info icon and "Pagar".
   - **Timeout:** set `last_payment_attempt_at` back over 72 business hours and run the task (backend plan, Verification step 5). Dashboard orange indicator; calendar and credit request as above; pay screen shows the "no se cobrará dos veces" line.
   - **Overdue:** red in the calendar and "Pagar" in the credit request list; paying one while an earlier pending installment exists sends that overdue installment's id. Overdue + rejected → red in the calendar, tooltip names the attempt.
   - **Approved:** installment paid, no attempt label, "Cuotas pagas" incremented; a stale pay link shows "Esta cuota ya fue pagada."
   - **Two tabs:** confirming in both → the second shows the backend's `409` message and then the processing state.
   - **Permissions:** member with `payment_calendar.view` only → links disabled with the missing-permission reason.
   - **Legend:** visible in the calendar, matching the dot colors.
