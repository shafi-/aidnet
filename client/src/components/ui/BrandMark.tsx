import { useId } from 'react'
import { cn } from '@/utils/cn'

interface BrandMarkProps {
  /** px size of the gradient tile */
  size?: 24 | 32 | 48 | 64
  /** render the "AidNet" wordmark next to the mark */
  withWordmark?: boolean
  className?: string
}

const tileSizes: Record<number, string> = {
  24: 'h-6 w-6 rounded-md',
  32: 'h-8 w-8 rounded-lg',
  48: 'h-12 w-12 rounded-xl',
  64: 'h-16 w-16 rounded-2xl',
}

// Inline version of the favicon (client/src/app/icon.svg): white heart on
// the brand gradient tile (DESIGN.md §1). Inlined rather than <img> so it
// resolves under any deployment base path. The gradient id is unique per
// instance — multiple marks on one page must not share paint-server ids.
export function BrandMark({
  size = 32,
  withWordmark = false,
  className,
}: BrandMarkProps) {
  const gradientId = `aidnet-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const mark = (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn('flex-none', tileSizes[size], className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gradientId})`} />
      <path
        fill="#ffffff"
        d="M32 47.5c-.55 0-1.1-.18-1.55-.53C23.6 41.6 15.5 35.1 15.5 27.3c0-5.55 4.45-9.8 9.85-9.8 2.55 0 4.9 1.05 6.65 2.9a9.4 9.4 0 0 1 6.65-2.9c5.4 0 9.85 4.25 9.85 9.8 0 7.8-8.1 14.3-14.95 19.67-.45.35-1 .53-1.55.53Z"
      />
    </svg>
  )

  if (!withWordmark) return mark

  return (
    <span className="flex items-center gap-2.5">
      {mark}
      <span
        className={cn(
          'font-bold tracking-tight',
          size >= 48 ? 'text-3xl' : 'text-xl'
        )}
      >
        AidNet
      </span>
    </span>
  )
}
