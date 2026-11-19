interface TabSwitchProps {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
}

export function TabSwitch({ tabs, active, onChange }: TabSwitchProps) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'rgba(0,0,0,0.05)',
      borderRadius: 999,
      padding: 3,
      gap: 2,
    }}>
      {tabs.map(tab => {
        const isActive = tab === active
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              padding: '5px 14px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#fff' : 'var(--color-text-sub)',
              background: isActive ? 'var(--color-orange)' : 'transparent',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
              boxShadow: isActive ? '0 2px 8px rgba(255,107,44,0.3)' : 'none',
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
