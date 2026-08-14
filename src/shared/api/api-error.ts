interface ApiErrorBody {
  error?: string
  message?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getApiErrorMessage(body: unknown): string {
  const { error, message } = (body ?? {}) as ApiErrorBody

  return error ?? message ?? 'La solicitud no pudo completarse.'
}
