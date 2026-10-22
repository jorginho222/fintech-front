import { describe, expect, it, vi } from 'vitest'

import { ApiError, getApiErrorMessage, getApiFieldErrors } from '@/shared/api/api-error'
import { applyApiFieldErrors } from '@/shared/forms/apply-api-field-errors'

const validationBody = {
  errors: {
    taxIdentifier: ['This value is not valid.'],
    password: ['Password must contain at least one number.', 'Password must contain at least one capital letter.'],
    'permissions[0]': ['The value you selected is not a valid choice.'],
    ignored: 'not a list',
  },
}

describe('API error parsing', () => {
  it('reads field errors from a 422 body', () => {
    expect(getApiFieldErrors(validationBody)).toEqual({
      taxIdentifier: ['This value is not valid.'],
      password: ['Password must contain at least one number.', 'Password must contain at least one capital letter.'],
      'permissions[0]': ['The value you selected is not a valid choice.'],
    })
  })

  it('returns no field errors for an {"error": ...} body', () => {
    expect(getApiFieldErrors({ error: 'No tiene permiso para acceder a este recurso.' })).toEqual({})
    expect(getApiFieldErrors(null)).toEqual({})
  })

  it('uses the error, then the first field message, then a generic text', () => {
    expect(getApiErrorMessage({ error: 'Usuario no encontrado.' })).toBe('Usuario no encontrado.')
    expect(getApiErrorMessage(validationBody)).toBe('This value is not valid.')
    expect(getApiErrorMessage(null)).toBe('La solicitud no pudo completarse.')
  })
})

describe('applyApiFieldErrors', () => {
  it('sets every message of each known field, including indexed list items', () => {
    const setError = vi.fn()
    const error = new ApiError(422, 'This value is not valid.', getApiFieldErrors(validationBody))

    expect(applyApiFieldErrors(error, setError, ['taxIdentifier', 'password', 'permissions', 'displayName'])).toBe(true)
    expect(setError.mock.calls).toEqual([
      ['taxIdentifier', { type: 'server', message: 'This value is not valid.' }],
      [
        'password',
        {
          type: 'server',
          message: 'Password must contain at least one number. Password must contain at least one capital letter.',
        },
      ],
      ['permissions', { type: 'server', message: 'The value you selected is not a valid choice.' }],
    ])
  })

  it('reports when no field matched', () => {
    const setError = vi.fn()

    expect(applyApiFieldErrors(new ApiError(409, 'Conflict.'), setError, ['displayName'])).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})
