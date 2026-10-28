const percentageFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

// The backend already sends a percentage (0–100), so it isn't divided for a `percent` formatter.
export function formatPaidPercentage(value: number | null): string {
  return value === null ? '-' : `${percentageFormatter.format(value)} %`
}
