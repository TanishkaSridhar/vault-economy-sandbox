import React from 'react'

interface PanelProps {
  title?: React.ReactNode
  /** One short line under the title saying what the panel shows. */
  hint?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
  bodyStyle?: React.CSSProperties
}

/** A solid, titled section: a header strip with a ruled edge, then the content. */
export function Panel({ title, hint, actions, children, style, bodyStyle }: PanelProps) {
  return (
    <section style={{
      position: 'relative', background: 'var(--surface)', border: '1px solid var(--line-strong)',
      borderRadius: 12, boxShadow: '0 1px 0 rgba(51,40,29,0.06), 0 3px 0 -1px var(--line)', overflow: 'hidden', ...style,
    }}>
      {title && (
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '10px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 18, lineHeight: 1.1, color: 'var(--ink)' }}>{title}</h2>
            {hint && <div style={{ fontSize: 12, color: 'var(--ink-sub)', marginTop: 2 }}>{hint}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>{actions}</div>}
        </header>
      )}
      <div style={{ padding: 16, ...bodyStyle }}>{children}</div>
    </section>
  )
}

/** A labelled number, read left to right: label, value, small note. */
export function Figure({ label, value, unit, note, tone }: { label: string; value: React.ReactNode; unit?: string; note?: React.ReactNode; tone?: 'good' | 'bad' | 'plain' }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 12.5, color: 'var(--ink-sub)', fontWeight: 600 }}>{unit}</span>}
      </div>
      {note && <div style={{ fontSize: 12, marginTop: 4, color: tone === 'good' ? 'var(--good)' : tone === 'bad' ? 'var(--bad)' : 'var(--ink-sub)' }}>{note}</div>}
    </div>
  )
}
