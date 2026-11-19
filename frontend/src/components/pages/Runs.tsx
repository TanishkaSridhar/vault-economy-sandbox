import { useState } from 'react'
import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'
import { useTurn } from '../../hooks/useTurn'
import { useRuns, useRunData } from '../../hooks/useSimData'

function RunCard({ run, isActive, onClick }: { run: any; isActive: boolean; onClick: () => void }) {
  const started = new Date(run.started_at).toLocaleString()
  const finished = run.finished_at ? new Date(run.finished_at).toLocaleString() : null
  const duration = run.started_at && run.finished_at
    ? Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)
    : null

  return (
    <GlassCard
      hoverable
      onClick={onClick}
      style={{
        padding: 20,
        border: isActive ? '1.5px solid #FF6B2C' : undefined,
        background: isActive ? 'rgba(255,107,44,0.04)' : undefined,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: isActive ? '#FF6B2C' : 'rgba(0,0,0,0.06)',
              color: isActive ? '#fff' : '#6B7280',
            }}>
              Run #{run.id}
            </div>
            {isActive && <div style={{ fontSize: 10, color: '#FF6B2C', fontWeight: 600 }}>● ACTIVE</div>}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
            🌱 Seed: <strong style={{ color: '#1A1A2E' }}>{run.seed}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
            🕐 Started: <span style={{ color: '#1A1A2E' }}>{started}</span>
          </div>
          {finished && (
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
              ✅ Finished: <span style={{ color: '#1A1A2E' }}>{finished}</span>
            </div>
          )}
          {run.code_version && (
            <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
              {run.code_version}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#FF6B2C' }}>
            {run.turns_completed}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>of {run.turns_planned} turns</div>
          {duration != null && (
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              {duration < 60 ? `${duration}s` : `${Math.round(duration / 60)}m`}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

export function Runs() {
  const { runId, setRun } = useTurn()
  const { runs, isLoading } = useRuns()
  const [compareId, setCompareId] = useState<number | null>(null)

  // Data for active run KPIs
  const { agentStates: activeStates, events: activeEvents } = useRunData(runId)
  const { agentStates: compStates, events: compEvents } = useRunData(compareId ?? 0)

  const computeKPIs = (agentStates: any[], events: any[], maxTurn: number) => {
    const lastStates = agentStates.filter(s => s.turn === maxTurn)
    const totalMoney = lastStates.reduce((s, a) => s + a.money, 0)
    const hungry = events.filter(e => e.type === 'HUNGRY').length
    const trades = events.filter(e => e.type === 'BOUGHT' || e.type === 'SOLD').length
    return { totalMoney, hungry, trades }
  }

  const activeRun = runs.find(r => r.id === runId)
  const compRun = compareId ? runs.find(r => r.id === compareId) : null
  const activeKPIs = activeRun ? computeKPIs(activeStates, activeEvents, activeRun.turns_completed) : null
  const compKPIs = compRun ? computeKPIs(compStates, compEvents, compRun.turns_completed) : null

  return (
    <div>
      <PageHeader title="Runs" subtitle="All simulation runs — compare and analyse" />

      {isLoading ? (
        <GlassCard style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Loading runs…</GlassCard>
      ) : runs.length === 0 ? (
        <GlassCard style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>No runs yet</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            Run <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: 4 }}>java -jar target/vault.jar 30</code> from the project root to generate data.
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Run list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...runs].reverse().map(run => (
              <div key={run.id} style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                <div style={{ flex: 1 }}>
                  <RunCard
                    run={run}
                    isActive={run.id === runId}
                    onClick={() => setRun(run.id)}
                  />
                </div>
                <button
                  onClick={() => setCompareId(compareId === run.id ? null : run.id)}
                  style={{
                    padding: '0 16px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: compareId === run.id ? 'rgba(100,181,246,0.3)' : 'rgba(255,255,255,0.7)',
                    color: compareId === run.id ? '#1565C0' : '#9CA3AF',
                    border: compareId === run.id ? '1.5px solid #64B5F6' : '1px solid rgba(0,0,0,0.1)',
                    flexShrink: 0,
                  }}
                >
                  {compareId === run.id ? '✓ Compare' : 'Compare'}
                </button>
              </div>
            ))}
          </div>

          {/* Compare panel */}
          {compareId && compRun && (
            <GlassCard style={{ padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>
                Run Comparison
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Metric</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#FF6B2C', textAlign: 'center' }}>Run #{runId}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64B5F6', textAlign: 'center' }}>Run #{compareId}</div>

                {[
                  ['Turns completed', activeRun?.turns_completed, compRun.turns_completed],
                  ['Seed', activeRun?.seed, compRun.seed],
                  ['Total wealth', activeKPIs?.totalMoney.toFixed(1), compKPIs?.totalMoney.toFixed(1)],
                  ['Total trades', activeKPIs?.trades, compKPIs?.trades],
                  ['Hungry events', activeKPIs?.hungry, compKPIs?.hungry],
                ].map(([label, a, b]) => (
                  <div key={label as string} style={{ display: 'contents' }}>
                    <div style={{ padding: '8px 0', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: 12, color: '#6B7280' }}>{label}</div>
                    <div style={{ padding: '8px 0', borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{a ?? '—'}</div>
                    <div style={{ padding: '8px 0', borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{b ?? '—'}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  )
}
