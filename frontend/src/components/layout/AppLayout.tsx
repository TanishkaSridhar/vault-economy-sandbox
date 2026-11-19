import React from 'react'
import { TopBar } from './TopBar'
import { SideRail } from './SideRail'

interface AppLayoutProps {
  children: React.ReactNode
  activePage: string
  onPageChange: (page: string) => void
}

export function AppLayout({ children, activePage, onPageChange }: AppLayoutProps) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <SideRail activePage={activePage} onPageChange={onPageChange} />
      <TopBar
        activePage={activePage as any}
        onPageChange={onPageChange as any}
      />
      <main style={{
        marginLeft: 56,
        marginTop: 64,
        padding: '24px',
        paddingBottom: 96, // room for Timeline bar
        minHeight: 'calc(100vh - 64px)',
      }}>
        {children}
      </main>
    </div>
  )
}
