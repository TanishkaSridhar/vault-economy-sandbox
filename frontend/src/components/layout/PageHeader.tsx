import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  actions?: React.ReactNode
  /** Key facts shown on the banner (label + value). */
  facts?: { label: string; value: React.ReactNode }[]
}

/** A solid banner at the top of each page: title on the left, a drawn valley on the right. */
export function PageHeader({ title, subtitle, actions, facts }: PageHeaderProps) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', marginBottom: 20, borderRadius: 14,
      background: 'var(--surface)', border: '1px solid var(--line-strong)',
      boxShadow: '0 1px 0 rgba(51,40,29,0.06), 0 3px 0 -1px var(--line)',
      minHeight: 118, display: 'flex', alignItems: 'stretch',
    }}>
      <Valley />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>{title}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-sub)', marginTop: 6, fontWeight: 500, maxWidth: 560 }}>{subtitle}</p>
        {facts && facts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {facts.map(f => (
              <div key={f.label} style={{
                display: 'flex', alignItems: 'baseline', gap: 6, padding: '4px 10px', borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-sub)',
              }}>
                {f.label} <strong style={{ color: 'var(--ink)', fontSize: 13 }}>{f.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 22px 18px', flex: 'none' }}>
          {actions}
        </div>
      )}
    </div>
  )
}

/** Layered hills, a road, a farmhouse and trees, fading in from the right. */
function Valley() {
  return (
    <svg aria-hidden viewBox="0 0 640 140" preserveAspectRatio="xMaxYMax slice"
      style={{ position: 'absolute', right: 0, bottom: 0, height: '100%', width: '62%', pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="ph-fade" x1="0" x2="1">
          <stop offset="0" stopColor="#faf6ec" stopOpacity="1" />
          <stop offset="0.45" stopColor="#faf6ec" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ph-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7eedb" />
          <stop offset="1" stopColor="#f5efdf" />
        </linearGradient>
      </defs>
      <rect width="640" height="140" fill="url(#ph-sky)" />
      <circle cx="560" cy="34" r="16" fill="#f1d99a" opacity="0.8" />
      <path d="M0 96 C 90 70, 170 74, 250 88 S 420 60, 520 70 S 610 64, 640 60 V140 H0z" fill="#c9d5a7" />
      <path d="M0 112 C 110 92, 200 100, 300 106 S 470 86, 560 94 S 620 92, 640 90 V140 H0z" fill="#aabd7c" />
      <path d="M0 126 C 140 114, 260 120, 380 122 S 560 110, 640 112 V140 H0z" fill="#8ea55d" />
      {/* road */}
      <path d="M300 140 C 330 124, 380 118, 430 112 S 520 100, 560 96" fill="none" stroke="#e7d3a6" strokeWidth="6" strokeLinecap="round" />
      {/* farmhouse */}
      <g transform="translate(470 74)">
        <rect x="0" y="10" width="26" height="18" fill="#f2e2c2" />
        <path d="M-3 11 L13 0 L29 11z" fill="#b55a3a" />
        <rect x="10" y="17" width="6" height="11" fill="#8a5f3c" />
        <rect x="31" y="14" width="16" height="14" fill="#c98b5b" />
        <path d="M29 15 L39 7 L49 15z" fill="#7a4f2f" />
      </g>
      {/* trees */}
      {[[400, 92, 1], [418, 96, 0.8], [600, 78, 1.1], [622, 84, 0.85], [350, 104, 0.9]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-1.5" y="6" width="3" height="10" fill="#7a5638" />
          <circle cx="0" cy="2" r="9" fill={i % 2 ? '#6e8f45' : '#d9a74a'} />
        </g>
      ))}
      {/* field rows */}
      {[0, 1, 2, 3].map(i => <path key={i} d={`M${170 + i * 14} 140 L${215 + i * 9} 118`} stroke="#d8c27a" strokeWidth="3" opacity="0.8" />)}
      <rect width="640" height="140" fill="url(#ph-fade)" />
    </svg>
  )
}
