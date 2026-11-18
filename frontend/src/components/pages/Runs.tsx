import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'

export function Runs() {
  return (
    <div>
      <PageHeader
        title="Runs"
        subtitle="Simulation run history & comparison"
      />
      <GlassCard style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>
          Runs — coming in Phase C
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          Run cards with metadata, turn count, start/end dates, and side-by-side comparison charts.
        </p>
      </GlassCard>
    </div>
  )
}
