const dueDateFormatter = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' })

// Reads the leading YYYY-MM-DD instead of parsing the whole ATOM string: `new Date()` would
// convert it to the browser's time zone and could move the day.
export function formatDueDate(value: string | null): string {
  if (value === null) return '-'

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value

  const [, year, month, day] = match
  return dueDateFormatter.format(new Date(Number(year), Number(month) - 1, Number(day)))
}
