import { useState, useMemo } from 'react'
import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'
import { Badge } from '../ui/Badge'
import { useTurn } from '../../hooks/useTurn'
import { useRunData } from '../../hooks/useSimData'

const ACTION_ICONS: Record<string, string> = {
  FARM: '🌾', BUY: '🛒', SELL: '💰', TRAVEL: '🛤️', REST: '😴',
  FARM_AND_SELL: '🌾', WAIT: '⏳',
}

export function Decisions() {
  const { turn, runId } = useTurn()
  const { agents, decisions, isLoading } = useRunData(runId)
  const [search, setSearch] = useState('')
  const [filterAgent, setFilterAgent] = useState('All')
  const [filterAction, setFilterAction] = useState('All')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 25

  const agentNames = useMemo(() => ['All', ...Array.from(new Set(decisions.map(d => d.agent))).sort()], [decisions])
  const actions = useMemo(() => ['All', ...Array.from(new Set(decisions.map(d => d.action))).sort()], [decisions])

  const filtered = useMemo(() => {
    let d = decisions
    if (filterAgent !== 'All') d = d.filter(x => x.agent === filterAgent)
    if (filterAction !== 'All') d = d.filter(x => x.action === filterAction)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter(x =>
        x.agent.toLowerCase().includes(q) ||
        x.action.toLowerCase().includes(q) ||
        (x.reason ?? '').toLowerCase().includes(q) ||
        (x.result ?? '').toLowerCase().includes(q)
      )
    }
    return d.sort((a, b) => b.turn - a.turn || (b.id - a.id))
  }, [decisions, filterAgent, filterAction, search])

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  return (
    <div>
      <PageHeader title="Decisions" subtitle={`${filtered.length} decisions logged`} />

      {/* Filters */}
      <GlassCard style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search reason, result, agent…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{
            flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 12, fontSize: 13,
            border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <select value={filterAgent} onChange={e => { setFilterAgent(e.target.value); setPage(0) }}
          style={{ padding: '8px 12px', borderRadius: 12, fontSize: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: 'inherit' }}>
          {agentNames.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0) }}
          style={{ padding: '8px 12px', borderRadius: 12, fontSize: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: 'inherit' }}>
          {actions.map(a => <option key={a}>{a}</option>)}
        </select>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{filtered.length} results</div>
      </GlassCard>

      {/* Table */}
      <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '50px 70px 90px 90px 1fr 80px',
          padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <div>Turn</div><div>Agent</div><div>Action</div><div>Town</div><div>Reason</div><div>Result</div>
        </div>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Loading…</div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>No decisions match your filters.</div>
        ) : paginated.map(d => {
          const agent = agents.find(a => a.name === d.agent)
          const isExpanded = expandedId === d.id
          return (
            <div key={d.id}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '50px 70px 90px 90px 1fr 80px',
                  padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)',
                  fontSize: 12, cursor: 'pointer',
                  background: isExpanded ? 'rgba(255,107,44,0.04)' : d.turn === turn ? 'rgba(255,107,44,0.03)' : undefined,
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ color: d.turn === turn ? '#FF6B2C' : '#6B7280', fontWeight: d.turn === turn ? 700 : 400 }}>
                  {d.turn}
                </div>
                <div style={{ fontWeight: 600, color: '#1A1A2E' }}>{d.agent}</div>
                <div>
                  <span style={{ fontSize: 14 }}>{ACTION_ICONS[d.action] ?? '•'}</span>
                  <span style={{ marginLeft: 4, color: '#6B7280' }}>{d.action}</span>
                </div>
                <div style={{ color: '#6B7280', fontSize: 11 }}>{d.town_before}</div>
                <div style={{ color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.reason ?? '—'}
                </div>
                <div style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 6,
                  background: d.success ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
                  color: d.success ? '#2E7D32' : '#C62828', fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  {d.success ? '✓ OK' : '✗ FAIL'}
                </div>
              </div>
              {isExpanded && (
                <div style={{ padding: '12px 16px 14px', background: 'rgba(255,107,44,0.02)', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 12 }}>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: '#9CA3AF' }}>Result: </span>
                      <span style={{ color: '#1A1A2E' }}>{d.result}</span>
                    </div>
                    {d.amount != null && (
                      <div>
                        <span style={{ color: '#9CA3AF' }}>Amount: </span>
                        <span style={{ color: '#1A1A2E' }}>{d.amount}</span>
                      </div>
                    )}
                    {d.target && (
                      <div>
                        <span style={{ color: '#9CA3AF' }}>Target: </span>
                        <span style={{ color: '#1A1A2E' }}>{d.target}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#9CA3AF' }}>Money: </span>
                      <span style={{ color: '#1A1A2E' }}>{d.money_before?.toFixed(1)} → {d.money_after?.toFixed(1)}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9CA3AF' }}>Food: </span>
                      <span style={{ color: '#1A1A2E' }}>{d.food_before} → {d.food_after}</span>
                    </div>
                    {d.brain_used && (
                      <div>
                        <span style={{ color: '#9CA3AF' }}>Brain: </span>
                        <span style={{ color: '#1A1A2E' }}>{d.brain_used}</span>
                        {d.latency_ms != null && <span style={{ color: '#9CA3AF' }}> ({d.latency_ms}ms)</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </GlassCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', opacity: page === 0 ? 0.4 : 1 }}>
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: '#6B7280', lineHeight: '30px' }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
