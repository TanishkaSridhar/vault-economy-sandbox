import { useState } from 'react'
import { Map, Building2, Users, TrendingUp, List, Zap } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'

const NAV_ITEMS = [
  { icon: Map, label: 'Overview', page: 'Overview' },
  { icon: Building2, label: 'Towns', page: 'Towns' },
  { icon: Users, label: 'Agents', page: 'Agents' },
  { icon: TrendingUp, label: 'Economy', page: 'Economy' },
  { icon: List, label: 'Decisions', page: 'Decisions' },
] as const

interface SideRailProps {
  activePage: string
  onPageChange: (page: string) => void
}

export function SideRail({ activePage, onPageChange }: SideRailProps) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const { lowGraphics, toggleLowGraphics } = useSettings()

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 56,
      zIndex: 99,
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '2px 0 16px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 80,
      paddingBottom: 20,
      gap: 4,
    }}>
      {NAV_ITEMS.map(({ icon: Icon, label, page }) => {
        const isActive = activePage === page
        return (
          <div key={page} style={{ position: 'relative' }}>
            <button
              onClick={() => onPageChange(page)}
              onMouseEnter={() => setTooltip(label)}
              onMouseLeave={() => setTooltip(null)}
              title={label}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? '#FF6B2C' : 'transparent',
                color: isActive ? '#fff' : '#6B7280',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 10px rgba(255,107,44,0.35)' : 'none',
              }}
            >
              <Icon size={18} />
            </button>
            {tooltip === label && (
              <div style={{
                position: 'absolute',
                left: 48,
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#1A1A2E',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 200,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}>
                {label}
                <div style={{
                  position: 'absolute',
                  left: -4,
                  top: '50%',
                  width: 8,
                  height: 8,
                  background: '#1A1A2E',
                  transform: 'rotate(45deg) translateY(-50%)',
                }} />
              </div>
            )}
          </div>
        )
      })}
      {/* Low graphics toggle at the bottom */}
      <div style={{ marginTop: 'auto', position: 'relative' }}>
        <button
          onClick={toggleLowGraphics}
          onMouseEnter={() => setTooltip('Low Graphics')}
          onMouseLeave={() => setTooltip(null)}
          title="Toggle low graphics"
          style={{
            width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: lowGraphics ? 'rgba(255,107,44,0.15)' : 'transparent',
            color: lowGraphics ? '#FF6B2C' : '#9CA3AF',
            transition: 'all 0.15s ease',
          }}
        >
          <Zap size={16} />
        </button>
        {tooltip === 'Low Graphics' && (
          <div style={{
            position: 'absolute', left: 48, top: '50%', transform: 'translateY(-50%)',
            background: '#1A1A2E', color: '#fff', padding: '4px 10px',
            borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            pointerEvents: 'none', zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            {lowGraphics ? '⚡ Low Graphics ON' : '⚡ Low Graphics OFF'}
          </div>
        )}
      </div>
    </div>
  )
}
