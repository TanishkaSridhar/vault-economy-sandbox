import { SlidingTabs } from '../ui/SlidingTabs'

const NAV_PAGES = ['Overview', 'World', 'Towns', 'Agents', 'Economy', 'Decisions', 'Runs'] as const
export type Page = typeof NAV_PAGES[number]

interface TopBarProps {
  activePage: Page
  onPageChange: (page: Page) => void
}

export function TopBar({ activePage, onPageChange }: TopBarProps) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 64, zIndex: 100,
      background: 'var(--surface)', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150, marginLeft: 56 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: 'var(--accent)',
          display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-press)',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <rect x="2" y="6" width="14" height="10" rx="2" fill="#f8f5ea" />
            <circle cx="9" cy="11" r="2.5" fill="#44602a" />
            <rect x="7.5" y="2" width="3" height="6" rx="1.5" fill="#f8f5ea" fillOpacity="0.8" />
          </svg>
        </div>
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.02em' }}>VAULT</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontWeight: 600 }}>trade simulation</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <SlidingTabs tabs={NAV_PAGES} active={activePage} onChange={onPageChange} ariaLabel="Pages" />
      </div>

      <div style={{ minWidth: 150 }} />
    </div>
  )
}
