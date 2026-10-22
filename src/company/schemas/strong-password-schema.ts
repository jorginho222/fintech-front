import { z } from 'zod'

// Mirrors the backend `StrongPassword` constraint.
const PASSWORD_RULES = [
  { label: 'al menos 8 caracteres', test: (value: string) => value.length >= 8 },
  { label: 'una letra mayúscula', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'un número', test: (value: string) => /\d/.test(value) },
  { label: 'un carácter especial', test: (value: string) => /[^A-Za-z\d]/.test(value) },
] as const

export const PASSWORD_POLICY_HINT =
  'Mínimo 8 caracteres, con una mayúscula, un número y un carácter especial.'

export function getUnmetPasswordRules(value: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label)
}

function joinSpanishList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')

  return `${items.slice(0, -1).join(', ')} y ${items.at(-1) ?? ''}`
}

// All unmet rules are reported in one message, so the form lists every one of them at once.
export const strongPasswordSchema = z
  .string()
  .max(4096, 'La contraseña es demasiado larga')
  .superRefine((value, context) => {
    const unmetRules = getUnmetPasswordRules(value)

    if (unmetRules.length > 0) {
      context.addIssue({
        code: 'custom',
        message: `La contraseña debe tener ${joinSpanishList(unmetRules)}.`,
      })
    }
  })
