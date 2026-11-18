import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'

export function Agents() {
  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle="AI agent roster, roles & performance"
      />
      <GlassCard style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>
          Agents — coming in Phase C
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          Agent cards with role badges (Farmer / Trader / Diplomat), sparklines for wealth over time, and decision history.
        </p>
      </GlassCard>
    </div>
  )
}
