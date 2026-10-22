interface ApiErrorBody {
  error?: string
  message?: string
  errors?: unknown
}

export type ApiFieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: ApiFieldErrors

  constructor(status: number, message: string, fieldErrors: ApiFieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// Validation failures come as {"errors": {"field": ["message", ...]}} with HTTP 422.
export function getApiFieldErrors(body: unknown): ApiFieldErrors {
  const { errors } = (body ?? {}) as ApiErrorBody

  if (typeof errors !== 'object' || errors === null || Array.isArray(errors)) {
    return {}
  }

  const fieldErrors: ApiFieldErrors = {}

  for (const [field, messages] of Object.entries(errors)) {
    if (!Array.isArray(messages)) continue

    const textMessages = messages.filter((message): message is string => typeof message === 'string')

    if (textMessages.length > 0) {
      fieldErrors[field] = textMessages
    }
  }

  return fieldErrors
}

export function getApiErrorMessage(body: unknown): string {
  const { error, message } = (body ?? {}) as ApiErrorBody
  const firstFieldMessage = Object.values(getApiFieldErrors(body))[0]?.[0]

  return error ?? message ?? firstFieldMessage ?? 'La solicitud no pudo completarse.'
}
