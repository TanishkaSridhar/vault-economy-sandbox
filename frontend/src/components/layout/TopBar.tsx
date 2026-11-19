import { useState } from 'react'
import { Search, Bell } from 'lucide-react'

const NAV_PAGES = ['Overview', 'Towns', 'Agents', 'Economy', 'Decisions', 'Runs'] as const
type Page = typeof NAV_PAGES[number]

interface TopBarProps {
  activePage: Page
  onPageChange: (page: Page) => void
  onSearch?: (q: string) => void
}

export function TopBar({ activePage, onPageChange, onSearch }: TopBarProps) {
  const [searchVal, setSearchVal] = useState('')

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 64,
      zIndex: 100,
      background: 'rgba(255,255,255,0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 110,
        marginLeft: 56, // SideRail offset
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #FF6B2C, #D94F10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(255,107,44,0.35)',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="6" width="14" height="10" rx="2" fill="white" fillOpacity="0.9" />
            <circle cx="9" cy="11" r="2.5" fill="rgba(255,107,44,0.9)" />
            <rect x="7.5" y="2" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.7" />
            <circle cx="9" cy="11" r="1" fill="white" />
          </svg>
        </div>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#1A1A2E', letterSpacing: '-0.02em' }}>
          VAULT
        </span>
      </div>

      {/* Pill Nav */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex',
          background: 'rgba(0,0,0,0.04)',
          borderRadius: 999,
          padding: 3,
          gap: 2,
        }}>
          {NAV_PAGES.map(page => {
            const isActive = page === activePage
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : '#6B7280',
                  background: isActive ? '#FF6B2C' : 'transparent',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
                  boxShadow: isActive ? '0 2px 10px rgba(255,107,44,0.35)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {page}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Search + Bell + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(255,255,255,0.8)',
          borderRadius: 999,
          padding: '6px 12px',
          flex: 1,
        }}>
          <Search size={14} color="#6B7280" />
          <input
            type="text"
            placeholder="Search…"
            value={searchVal}
            onChange={e => {
              setSearchVal(e.target.value)
              onSearch?.(e.target.value)
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13,
              color: '#1A1A2E',
              width: 110,
              fontFamily: 'inherit',
            }}
          />
        </div>

        <button style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.8)',
          background: 'rgba(0,0,0,0.05)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Bell size={16} color="#6B7280" />
        </button>

        <div style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: 'linear-gradient(135deg, #FF6B2C, #D94F10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(255,107,44,0.3)',
          flexShrink: 0,
        }}>
          V
        </div>
      </div>
    </div>
  )
}
