import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import type { ApiError } from '@/shared/api/api-error'

/**
 * Puts the backend's 422 field errors on the matching form fields. Returns whether any field
 * got an error, so the caller can fall back to a form-level message otherwise.
 */
export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<TFieldValues>,
  fields: readonly Path<TFieldValues>[],
): boolean {
  let applied = false

  for (const field of fields) {
    // List items come keyed by index, e.g. `permissions[0]` for `permissions`.
    const messages = Object.entries(error.fieldErrors)
      .filter(([key]) => key === field || key.startsWith(`${field}[`))
      .flatMap(([, fieldMessages]) => fieldMessages)

    if (messages.length > 0) {
      // Every message is kept, so a password lists each unmet rule.
      setError(field, { type: 'server', message: [...new Set(messages)].join(' ') })
      applied = true
    }
  }

  return applied
}
