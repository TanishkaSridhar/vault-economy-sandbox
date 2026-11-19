/**
 * AgentCard — glass popover shown when an agent is clicked.
 * Rendered as an Html overlay in the 3D scene.
 */
import type { CharacterDef } from './characterData'
import { ROLE_ICONS } from './characterData'
import type { AgentState } from '../../hooks/useSimData'

interface AgentCardProps {
  agentState: AgentState
  char: CharacterDef
  onClose: () => void
  extraData?: {
    moneyHistory?: number[]
    lastDecision?: string
    lastReason?: string
    relationships?: Array<{ to: string; trust: number; familiarity: number }>
    role?: string
    destination?: string
  }
}

function MiniSparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 140
  const h = 32
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  })
  const last = values[values.length - 1]
  const trend = values.length > 1 && last > values[0] ? '#4CAF50' : '#FF6B2C'

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={trend}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      <circle
        cx={w}
        cy={h - ((last - min) / range) * (h - 4) - 2}
        r={3}
        fill={trend}
      />
    </svg>
  )
}

function TrustBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
        <span style={{ color: '#888' }}>{label}</span>
        <span style={{ color: '#FF6B2C', fontWeight: 700 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: 4, height: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #FF6B2C, #FFB347)',
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  )
}

export function AgentCard({ agentState, char, extraData, onClose }: AgentCardProps) {
  const { agent, money, food, town, destination } = agentState
  const role = extraData?.role ?? char.role
  const dest = extraData?.destination ?? destination

  return (
    <div
      style={{
        width: 220,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255,255,255,0.9)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(255,107,44,0.12)',
        padding: 16,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: 12,
        color: '#1a1a2e',
        position: 'relative',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          color: '#888',
          lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: `${char.color}22`,
            border: `2px solid ${char.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          {ROLE_ICONS[char.role]}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e' }}>{agent}</div>
          <div
            style={{
              display: 'inline-block',
              background: `${char.color}20`,
              color: char.color,
              borderRadius: 20,
              padding: '1px 8px',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {ROLE_ICONS[char.role]} {role}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          marginBottom: 12,
          background: 'rgba(240,244,255,0.6)',
          borderRadius: 10,
          padding: 8,
        }}
      >
        <Stat icon="📍" label="Location" value={town} />
        {dest && dest !== town && <Stat icon="→" label="Heading" value={dest} />}
        <Stat icon="💰" label="Money" value={`$${money.toFixed(0)}`} />
        <Stat icon="🌾" label="Food" value={food.toFixed(1)} />
      </div>

      {/* Money sparkline */}
      {extraData?.moneyHistory && extraData.moneyHistory.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontWeight: 600 }}>
            MONEY TREND
          </div>
          <MiniSparkline values={extraData.moneyHistory} />
        </div>
      )}

      {/* Last decision */}
      {extraData?.lastDecision && (
        <div
          style={{
            background: 'rgba(255,107,44,0.06)',
            border: '1px solid rgba(255,107,44,0.15)',
            borderRadius: 8,
            padding: 8,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#FF6B2C', marginBottom: 2 }}>
            LAST ACTION
          </div>
          <div style={{ fontWeight: 600, fontSize: 11 }}>{extraData.lastDecision}</div>
          {extraData.lastReason && (
            <div style={{ color: '#666', fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>
              "{extraData.lastReason}"
            </div>
          )}
        </div>
      )}

      {/* Top relationships */}
      {extraData?.relationships && extraData.relationships.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginBottom: 6 }}>
            RELATIONSHIPS
          </div>
          {extraData.relationships.slice(0, 3).map(rel => (
            <div key={rel.to} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 11 }}>{rel.to}</div>
              <TrustBar label="Trust" value={rel.trust} />
              <TrustBar label="Familiarity" value={rel.familiarity / 10} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string | number
}) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>{icon} {label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{value}</div>
    </div>
  )
}
