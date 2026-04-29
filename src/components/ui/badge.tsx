import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'deprecated' | 'neutral' | 'info'
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-(--bg-elevated) text-(--text-secondary) border border-(--border-subtle)',
  success: 'bg-[rgba(16,185,129,0.15)] text-(--color-success)',
  warning: 'bg-[rgba(245,158,11,0.15)] text-(--color-warning)',
  danger: 'bg-[rgba(239,68,68,0.15)] text-(--color-danger)',
  deprecated: 'bg-[rgba(249,115,22,0.15)] text-(--color-deprecated)',
  neutral: 'bg-[rgba(107,114,128,0.15)] text-(--color-neutral)',
  info: 'bg-[rgba(59,130,246,0.15)] text-(--color-info)',
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-1.75 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
