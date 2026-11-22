import { useLayoutEffect, useRef, useState } from 'react'

interface SlidingTabsProps<T extends string> {
  tabs: readonly T[]
  active: T | null
  onChange: (tab: T) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
}

/**
 * A row of tabs with one solid pill that glides to the active tab
 * (it measures the buttons, so tabs can have any width).
 */
export function SlidingTabs<T extends string>({ tabs, active, onChange, size = 'md', ariaLabel }: SlidingTabsProps<T>) {
  const wrap = useRef<HTMLDivElement>(null)
  const btns = useRef(new Map<string, HTMLButtonElement>())
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const el = active ? btns.current.get(active) : null
      setPill(el ? { x: el.offsetLeft, w: el.offsetWidth } : null)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrap.current) ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [active, tabs])

  const sm = size === 'sm'
  return (
    <div ref={wrap} role="tablist" aria-label={ariaLabel} style={{
      position: 'relative', display: 'inline-flex', gap: 2, padding: 3,
      background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 999,
    }}>
      <div aria-hidden style={{
        position: 'absolute', top: 3, bottom: 3, left: 0,
        width: pill?.w ?? 0, transform: `translateX(${pill?.x ?? 0}px)`,
        opacity: pill ? 1 : 0,
        background: 'var(--accent)', borderRadius: 999, boxShadow: 'var(--shadow-press)',
        transition: 'transform 0.35s var(--ease), width 0.35s var(--ease), opacity 0.2s',
      }} />
      {tabs.map(tab => {
        const on = tab === active
        return (
          <button
            key={tab}
            ref={el => { if (el) btns.current.set(tab, el); else btns.current.delete(tab) }}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab)}
            style={{
              position: 'relative', zIndex: 1,
              padding: sm ? '5px 13px' : '6px 16px',
              border: 'none', borderRadius: 999, background: 'transparent', cursor: 'pointer',
              fontSize: sm ? 12.5 : 13, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
              color: on ? 'var(--accent-ink)' : 'var(--ink-sub)',
              transition: 'color 0.25s var(--ease)',
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
