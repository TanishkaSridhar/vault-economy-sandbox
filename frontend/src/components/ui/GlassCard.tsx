import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  style?: React.CSSProperties
}

/** A solid card (the name is historical: it used to be frosted glass). */
export function GlassCard({ children, className = '', onClick, hoverable = false, style }: GlassCardProps) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
      className={className}
      style={{
        borderWidth: 1, borderStyle: 'solid',
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(51,40,29,0.06), 0 3px 0 -1px var(--line)',
        // hover is a quiet tint, never movement: the layout should feel planted
        backgroundColor: hovered ? '#fdfaf2' : 'var(--surface)',
        borderColor: hovered ? 'var(--ink-faint)' : 'var(--line-strong)',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
