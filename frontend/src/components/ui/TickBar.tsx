interface TickBarProps {
  value: number
  max: number
  label: string
  valueLabel?: string
  color?: string
}

export function TickBar({ value, max, label, valueLabel, color = '#FF6B2C' }: TickBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const tickCount = 20

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-sub)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
          {valueLabel ?? `${Math.round(pct)}%`}
        </span>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 0.4s ease',
        }} />
        {/* Tick marks overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1px' }}>
          {Array.from({ length: tickCount - 1 }).map((_, i) => {
            const tickPct = ((i + 1) / tickCount) * 100
            const filled = tickPct <= pct
            return (
              <div
                key={i}
                style={{
                  width: 1,
                  height: i % 4 === 3 ? 6 : 4,
                  background: filled ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.1)',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
