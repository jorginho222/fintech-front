import { Link, type LinkProps } from 'react-router-dom'

type GatedLinkProps = LinkProps & {
  allowed: boolean
  // Shown when the link is disabled, e.g. which permission is missing.
  reason: string
}

export function GatedLink({ allowed, reason, className, children, ...linkProps }: GatedLinkProps) {
  if (allowed) {
    return (
      <Link className={className} {...linkProps}>
        {children}
      </Link>
    )
  }

  return (
    <span
      aria-disabled="true"
      title={reason}
      className={`${typeof className === 'string' ? className : ''} cursor-not-allowed opacity-50`}
    >
      {children}
      <span className="sr-only"> ({reason})</span>
    </span>
  )
}
