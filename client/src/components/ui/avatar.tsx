import { cn } from '@/utils/cn'

interface AvatarProps {
  email: string
  size?: 'sm' | 'lg'
  className?: string
}

function initials(email: string): string {
  const local = email.split('@')[0]?.trim()
  return (local?.[0] ?? '?').toUpperCase()
}

// Initials avatar for signed-in users (DESIGN.md §4). AuthUser carries only
// id + email today; a name can upgrade the label later without changing the
// call sites.
export function Avatar({ email, size = 'sm', className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex flex-none select-none items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground',
        size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm',
        className
      )}
    >
      {initials(email)}
    </span>
  )
}
