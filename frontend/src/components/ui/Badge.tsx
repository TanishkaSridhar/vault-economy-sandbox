interface BadgeProps {
  role: 'Farmer' | 'Trader' | 'Diplomat'
  size?: 'sm' | 'md'
}

const ROLE_CONFIG = {
  Farmer: {
    icon: '🌾',
    bg: 'rgba(134,239,172,0.2)',
    border: 'rgba(134,239,172,0.4)',
    color: '#15803d',
  },
  Trader: {
    icon: '🏪',
    bg: 'rgba(255,107,44,0.12)',
    border: 'rgba(255,107,44,0.3)',
    color: '#D94F10',
  },
  Diplomat: {
    icon: '🕊️',
    bg: 'rgba(147,197,253,0.2)',
    border: 'rgba(147,197,253,0.4)',
    color: '#1d4ed8',
  },
}

export function Badge({ role, size = 'md' }: BadgeProps) {
  const cfg = ROLE_CONFIG[role]
  const small = size === 'sm'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: small ? 4 : 6,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 999,
      padding: small ? '2px 8px' : '4px 12px',
      fontSize: small ? 11 : 13,
      fontWeight: 600,
      color: cfg.color,
    }}>
      <span style={{ fontSize: small ? 12 : 14 }}>{cfg.icon}</span>
      {role}
    </div>
  )
}
