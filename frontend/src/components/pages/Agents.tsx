import { useState, useMemo } from 'react'
import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'
import { Badge } from '../ui/Badge'
import { Sparkline } from '../ui/Sparkline'
import { TickBar } from '../ui/TickBar'
import { useTurn } from '../../hooks/useTurn'
import { Portrait, PortraitRenderer } from '../world/cozy/Portraits'
import { useRunData, getAgentStatesAtTurn } from '../../hooks/useSimData'

const ROLE_COLOURS = {
  Farmer: { bg: 'rgba(76,175,80,0.1)', border: 'rgba(76,175,80,0.3)', text: '#2E7D32' },
  Trader: { bg: 'rgba(255,107,44,0.1)', border: 'rgba(255,107,44,0.3)', text: '#D94F10' },
  Diplomat: { bg: 'rgba(100,181,246,0.15)', border: 'rgba(100,181,246,0.4)', text: '#1565C0' },
}

export function Agents() {
  const { turn, runId } = useTurn()
  const { agents, agentStates } = useRunData(runId)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'money' | 'name' | 'role'>('money')

  const currentAgentStates = useMemo(
    () => getAgentStatesAtTurn(agentStates, turn),
    [agentStates, turn]
  )

  // Build money history per agent
  const agentMoneyHistory = useMemo(() => {
    const hist: Record<string, number[]> = {}
    for (let t = 1; t <= turn; t++) {
      agentStates.filter(s => s.turn === t).forEach(s => {
        if (!hist[s.agent]) hist[s.agent] = []
        hist[s.agent].push(s.money)
      })
    }
    return hist
  }, [agentStates, turn])

  const sorted = useMemo(() => {
    const list = agents.map(a => {
      const state = currentAgentStates.find(s => s.agent === a.name)
      return { ...a, state }
    })
    if (sortBy === 'money') return list.sort((a, b) => (b.state?.money ?? 0) - (a.state?.money ?? 0))
    if (sortBy === 'name') return list.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'role') return list.sort((a, b) => a.role.localeCompare(b.role))
    return list
  }, [agents, currentAgentStates, sortBy])

  const selectedAgentData = selectedAgent ? sorted.find(a => a.name === selectedAgent) : null
  const selectedHistory = selectedAgent ? (agentMoneyHistory[selectedAgent] ?? []) : []

  return (
    <div>
      <PortraitRenderer names={agents.map(a => a.name)} />
      <PageHeader
        title="Agents"
        subtitle="All 16 simulation agents"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {(['money', 'name', 'role'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: sortBy === s ? '#FF6B2C' : 'rgba(255,255,255,0.7)',
                color: sortBy === s ? '#fff' : '#6B7280',
                border: sortBy === s ? 'none' : '1px solid rgba(0,0,0,0.1)',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Agent grid */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 12 }}>
            {sorted.map((agent, idx) => {
              const roleStyle = ROLE_COLOURS[agent.role as keyof typeof ROLE_COLOURS] ?? ROLE_COLOURS.Trader
              const isSelected = selectedAgent === agent.name
              const moneyHistory = agentMoneyHistory[agent.name] ?? []
              const rank = idx + 1
              return (
                <GlassCard
                  key={agent.name}
                  hoverable
                  onClick={() => setSelectedAgent(isSelected ? null : agent.name)}
                  style={{
                    padding: 14,
                    border: isSelected ? '1.5px solid #FF6B2C' : `1px solid ${roleStyle.border}`,
                    background: isSelected ? 'rgba(255,107,44,0.06)' : `${roleStyle.bg}`,
                    cursor: 'pointer',
                  }}
                >
                  {/* Rank */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: rank <= 3 ? '#FF6B2C' : '#9CA3AF' }}>
                      #{rank}
                    </span>
                    <Badge role={agent.role as any} size="sm" />
                  </div>
                  {/* Villager portrait */}
                  <div style={{ marginBottom: 8 }}>
                    <Portrait name={agent.name} role={agent.role} size={60} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{agent.name}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                      {agent.state?.town ?? agent.start_town}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#FF6B2C', fontWeight: 700 }}>
                      💰 {(agent.state?.money ?? agent.start_money).toFixed(0)}
                    </span>
                    <span style={{ color: '#6B7280' }}>
                      🌾 {agent.state?.food ?? agent.start_food}
                    </span>
                  </div>
                  {moneyHistory.length > 1 && (
                    <div style={{ marginTop: 8 }}>
                      <Sparkline data={moneyHistory} width={130} height={28} />
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedAgentData && (
          <div style={{ flex: '0 0 280px' }}>
            <GlassCard style={{ padding: 20, position: 'sticky', top: 0 }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <Portrait name={selectedAgentData.name} role={selectedAgentData.role} size={88} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E' }}>{selectedAgentData.name}</div>
                <Badge role={selectedAgentData.role as any} size="md" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6B7280' }}>Location</span>
                  <span style={{ fontWeight: 600 }}>{selectedAgentData.state?.town ?? selectedAgentData.start_town}</span>
                </div>
                {selectedAgentData.state?.destination && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#6B7280' }}>Travelling to</span>
                    <span style={{ fontWeight: 600, color: '#FF6B2C' }}>{selectedAgentData.state.destination}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6B7280' }}>Money</span>
                  <span style={{ fontWeight: 700, color: '#FF6B2C' }}>
                    💰 {(selectedAgentData.state?.money ?? selectedAgentData.start_money).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6B7280' }}>Food</span>
                  <span style={{ fontWeight: 600 }}>🌾 {selectedAgentData.state?.food ?? selectedAgentData.start_food}</span>
                </div>

                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Wealth over time</div>
                  <Sparkline data={selectedHistory} width={240} height={50} />
                </div>

                <TickBar
                  label="Relative wealth"
                  value={selectedAgentData.state?.money ?? 0}
                  max={Math.max(...currentAgentStates.map(s => s.money), 1)}
                />
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}
