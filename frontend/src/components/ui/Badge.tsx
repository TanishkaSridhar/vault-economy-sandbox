interface BadgeProps {
  role: 'Farmer' | 'Trader' | 'Diplomat'
  size?: 'sm' | 'md'
}

const ROLE_CONFIG = {
  Farmer: { bg: '#dfe6c4', border: '#c3d0a0', color: '#44602a' },
  Trader: { bg: '#f1dfbd', border: '#dfc495', color: '#7a4f24' },
  Diplomat: { bg: '#d6e5e6', border: '#b3cdd0', color: '#33606b' },
}

export function Badge({ role, size = 'md' }: BadgeProps) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.Trader
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
      <span style={{ width: small ? 6 : 7, height: small ? 6 : 7, borderRadius: '50%', background: cfg.color }} />
      {role}
    </div>
  )
}
