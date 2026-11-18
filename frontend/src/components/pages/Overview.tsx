import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'

export function Overview() {
  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Live economy simulation at a glance"
      />
      <GlassCard style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>
          Overview — 3D scene coming in Phase C
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          The interactive 3D world map will be rendered here. KPI tiles, ring gauges, and dot-matrix charts will surround it.
        </p>
      </GlassCard>
    </div>
  )
}
