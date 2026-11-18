import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 24,
    }}>
      <div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: '#1A1A2E',
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: 14,
          color: '#6B7280',
          margin: '4px 0 0',
          fontWeight: 500,
        }}>
          {subtitle}
        </p>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
