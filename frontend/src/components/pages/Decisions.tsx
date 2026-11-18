import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'

export function Decisions() {
  return (
    <div>
      <PageHeader
        title="Decisions"
        subtitle="Agent decision log & policy outcomes"
      />
      <GlassCard style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>
          Decisions — coming in Phase C
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          Chronological decision feed with agent role badges, action type pills, and outcome impact scores.
        </p>
      </GlassCard>
    </div>
  )
}
