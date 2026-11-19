import React from 'react'

interface KPITileProps {
  label: string
  value: string | number
  unit?: string
  progress?: number
  icon?: React.ReactNode
  change?: { value: number; label: string }
}

export function KPITile({ label, value, unit, progress, icon, change }: KPITileProps) {
  const pct = Math.min(100, Math.max(0, progress ?? 0))
  const tickCount = 20

  return (
    <div
      style={{
        background: 'var(--color-glass)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--color-glass-border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {icon && (
            <div style={{ marginBottom: 6, color: 'var(--color-orange)', display: 'flex', alignItems: 'center' }}>
              {icon}
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>
              {value}
            </span>
            {unit && (
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-sub)' }}>{unit}</span>
            )}
          </div>
        </div>
        {change && (
          <div style={{
            background: change.value >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: change.value >= 0 ? '#16a34a' : '#dc2626',
            borderRadius: 999,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {change.value >= 0 ? '+' : ''}{change.value}% {change.label}
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div style={{ marginTop: 4 }}>
          <div style={{
            position: 'relative',
            height: 4,
            background: 'rgba(0,0,0,0.06)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${pct}%`,
              background: 'var(--color-orange)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {/* Tick marks */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            {Array.from({ length: tickCount + 1 }).map((_, i) => {
              const tickPct = (i / tickCount) * 100
              const filled = tickPct <= pct
              return (
                <div
                  key={i}
                  style={{
                    width: 1,
                    height: i % 5 === 0 ? 5 : 3,
                    background: filled ? 'var(--color-orange)' : 'rgba(0,0,0,0.12)',
                    borderRadius: 1,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
