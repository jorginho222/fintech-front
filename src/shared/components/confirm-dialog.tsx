import { useEffect, useRef, type ReactNode, type SyntheticEvent } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  isConfirming: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  isConfirming,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Esc: `open` stays the source of truth, so the browser doesn't close the dialog by itself.
  const handleNativeCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault()
    if (!isConfirming) onCancel()
  }

  // Browsers can skip a prevented `cancel` on a repeated Esc and close the dialog anyway.
  const handleNativeClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (!open) return

    if (isConfirming) {
      event.currentTarget.showModal()
    } else {
      onCancel()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onCancel={handleNativeCancel}
      onClose={handleNativeClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-0 text-left text-slate-100 shadow-xl shadow-black/40 backdrop:bg-black/60"
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight text-slate-100">{title}</h2>
        <div className="mt-3 text-sm text-slate-300">{children}</div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-slate-800 p-4">
        <button
          type="button"
          disabled={isConfirming}
          onClick={onCancel}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={isConfirming}
          onClick={onConfirm}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
