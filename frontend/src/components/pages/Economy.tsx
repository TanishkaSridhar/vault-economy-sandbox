import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'

export function Economy() {
  return (
    <div>
      <PageHeader
        title="Economy"
        subtitle="Market prices, trade flows & wealth distribution"
      />
      <GlassCard style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📈</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>
          Economy — coming in Phase C
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          Price trend charts, Gini coefficient ring gauge, trade ledger table, and dot-matrix price heatmap.
        </p>
      </GlassCard>
    </div>
  )
}
