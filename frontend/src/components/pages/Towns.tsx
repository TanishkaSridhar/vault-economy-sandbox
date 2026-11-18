import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'

export function Towns() {
  return (
    <div>
      <PageHeader
        title="Towns"
        subtitle="Settlement status, population & resource levels"
      />
      <GlassCard style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏘️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>
          Towns — coming in Phase C
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          Town cards with TickBar progress bars for food, wood, iron, gold, and population stats.
        </p>
      </GlassCard>
    </div>
  )
}
