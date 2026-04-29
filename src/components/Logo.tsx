import { SatelliteDish } from 'lucide-react'

interface LogoProps {
  size?: number
  showWordmark?: boolean
}

export function Logo({ size = 22, showWordmark = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <SatelliteDish
        size={size}
        style={{ color: 'var(--accent)' }}
        strokeWidth={1.75}
      />
      {showWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          RapidScan
        </span>
      )}
    </div>
  )
}
