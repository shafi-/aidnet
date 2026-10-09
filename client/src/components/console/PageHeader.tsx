'use client'

/**
 * One h1 per console page with its primary action on the right. The page
 * title is the route — the shell's sidebar carries the rest of the
 * hierarchy, so no breadcrumb chains or nested card headers.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-none items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
