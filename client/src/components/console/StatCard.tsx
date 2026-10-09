'use client'

import Link from 'next/link'

/**
 * One number the operator needs, with an optional destination. Used for the
 * overview stats row; each card links to where that number is worked on.
 */
export function StatCard({
  label,
  value,
  href,
  tone = 'default',
}: {
  label: string
  value: string | number
  href?: string
  /** 'attention' renders the number in the warning color for queues. */
  tone?: 'default' | 'attention' | 'positive'
}) {
  const valueClass =
    tone === 'attention'
      ? 'text-warning'
      : tone === 'positive'
        ? 'text-success'
        : 'text-foreground'

  const body = (
    <div className="h-full rounded-lg border bg-card p-4 shadow-sm transition-colors">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  )

  if (!href) return body
  return (
    <Link
      href={href}
      className="block rounded-lg hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  )
}
