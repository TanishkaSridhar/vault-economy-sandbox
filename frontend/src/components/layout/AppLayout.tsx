import React from 'react'
import { TopBar, type Page } from './TopBar'
import { SideRail } from './SideRail'
import { Backdrop } from './Backdrop'

interface AppLayoutProps {
  children: React.ReactNode
  activePage: string
  onPageChange: (page: string) => void
  /** Full-bleed pages (the World map) fill everything between the bars, with no padding. */
  fullBleed?: boolean
}

export function AppLayout({ children, activePage, onPageChange, fullBleed = false }: AppLayoutProps) {
  return (
    <div style={{ minHeight: '100vh' }}>
      {!fullBleed && <Backdrop />}
      <SideRail activePage={activePage} onPageChange={onPageChange} />
      <TopBar activePage={activePage as Page} onPageChange={onPageChange} />
      <main style={fullBleed ? {
        position: 'fixed', left: 56, top: 64, right: 0, bottom: 0, overflow: 'hidden',
      } : {
        position: 'relative',
        zIndex: 1,
        marginLeft: 56,
        marginTop: 64,
        padding: '24px',
        paddingBottom: 96, // room for the timeline bar
        minHeight: 'calc(100vh - 64px)',
      }}>
        {/* keyed by page so every page change replays the fade-in */}
        <div key={activePage} className="page-enter" style={fullBleed ? { width: '100%', height: '100%' } : undefined}>
          {children}
        </div>
      </main>
    </div>
  )
}
