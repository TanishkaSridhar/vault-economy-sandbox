import { useState } from 'react'
import { LayoutDashboard, Map, Building2, Users, TrendingUp, List, History, Gauge } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'

const NAV_ITEMS = [
  { icon: LayoutDashboard, page: 'Overview' },
  { icon: Map, page: 'World' },
  { icon: Building2, page: 'Towns' },
  { icon: Users, page: 'Agents' },
  { icon: TrendingUp, page: 'Economy' },
  { icon: List, page: 'Decisions' },
  { icon: History, page: 'Runs' },
] as const

const ITEM = 44 // button height + gap

interface SideRailProps {
  activePage: string
  onPageChange: (page: string) => void
}

export function SideRail({ activePage, onPageChange }: SideRailProps) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const { lowGraphics, toggleLowGraphics } = useSettings()
  const index = NAV_ITEMS.findIndex(i => i.page === activePage)

  return (
    <div style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 56, zIndex: 99,
      background: 'var(--surface)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, paddingBottom: 20,
    }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* the active marker glides between items */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, top: 0, width: 40, height: 40, borderRadius: 11,
          background: 'var(--accent)', boxShadow: 'var(--shadow-press)',
          transform: `translateY(${Math.max(0, index) * ITEM}px)`, opacity: index < 0 ? 0 : 1,
          transition: 'transform 0.35s var(--ease), opacity 0.2s',
        }} />
        {NAV_ITEMS.map(({ icon: Icon, page }) => {
          const isActive = activePage === page
          return (
            <div key={page} style={{ position: 'relative' }}>
              <button
                onClick={() => onPageChange(page)}
                onMouseEnter={() => setTooltip(page)}
                onMouseLeave={() => setTooltip(null)}
                aria-label={page}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  position: 'relative', width: 40, height: 40, borderRadius: 11, border: 'none', cursor: 'pointer',
                  display: 'grid', placeItems: 'center', background: 'transparent',
                  color: isActive ? 'var(--accent-ink)' : 'var(--ink-sub)',
                }}
              >
                <Icon size={18} />
              </button>
              {tooltip === page && <Tip text={page} />}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 'auto', position: 'relative' }}>
        <button
          onClick={toggleLowGraphics}
          onMouseEnter={() => setTooltip('low')}
          onMouseLeave={() => setTooltip(null)}
          aria-label="Toggle low graphics"
          aria-pressed={lowGraphics}
          style={{
            width: 40, height: 40, borderRadius: 11, border: 'none', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            background: lowGraphics ? 'var(--accent-soft)' : 'transparent',
            color: lowGraphics ? 'var(--accent-strong)' : 'var(--ink-faint)',
          }}
        >
          <Gauge size={16} />
        </button>
        {tooltip === 'low' && <Tip text={lowGraphics ? 'Low graphics: on' : 'Low graphics: off'} />}
      </div>
    </div>
  )
}

function Tip({ text }: { text: string }) {
  return (
    <div style={{
      position: 'absolute', left: 50, top: '50%', transform: 'translateY(-50%)',
      background: 'var(--ink)', color: 'var(--surface)', padding: '4px 10px', borderRadius: 7,
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 200,
      animation: 'page-in 0.18s var(--ease) both',
    }}>
      {text}
    </div>
  )
}
