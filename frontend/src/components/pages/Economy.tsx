import { useMemo, useState } from 'react'
import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'
import { Sparkline } from '../ui/Sparkline'
import { useTurn } from '../../hooks/useTurn'
import { useRunData } from '../../hooks/useSimData'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'

const TOWN_COLORS = ['#FF6B2C','#4FC3F7','#81C784','#E91E63','#9C27B0','#FF9800','#607D8B','#00BCD4']
const AGENT_COLORS = ['#FF6B2C','#4CAF50','#2196F3','#E91E63','#FF9800','#9C27B0','#00BCD4','#8BC34A',
                      '#F44336','#009688','#3F51B5','#FFC107','#795548','#607D8B','#CDDC39','#FF5722']

export function Economy() {
  const { turn, runId } = useTurn()
  const { towns, agents, agentStates, townStates, isLoading } = useRunData(runId)
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set())

  // Build price history chart data: [{turn: 1, Riverton: 5.2, Valley: 6.0, ...}]
  const priceChartData = useMemo(() => {
    const byTurn: Record<number, Record<string, number>> = {}
    townStates.forEach(ts => {
      if (!byTurn[ts.turn]) byTurn[ts.turn] = { turn: ts.turn }
      byTurn[ts.turn][ts.town] = ts.price
    })
    return Object.values(byTurn).sort((a, b) => a.turn - b.turn)
  }, [townStates])

  // Build agent wealth chart data: [{turn: 1, Meena: 100, Ravi: 90, ...}]
  const wealthChartData = useMemo(() => {
    const byTurn: Record<number, Record<string, number>> = {}
    agentStates.forEach(as => {
      if (!byTurn[as.turn]) byTurn[as.turn] = { turn: as.turn }
      byTurn[as.turn][as.agent] = as.money
    })
    return Object.values(byTurn).sort((a, b) => a.turn - b.turn)
  }, [agentStates])

  // Wealth at current turn for histogram
  const currentWealth = useMemo(() => {
    return agentStates
      .filter(s => s.turn === turn)
      .map(s => ({ name: s.agent, money: s.money }))
      .sort((a, b) => b.money - a.money)
  }, [agentStates, turn])

  const toggleAgent = (name: string) => {
    setActiveAgents(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const shownAgents = activeAgents.size > 0 ? agents.filter(a => activeAgents.has(a.name)) : agents

  if (isLoading) {
    return <div style={{ padding: 20, color: '#9CA3AF' }}>Loading economy data…</div>
  }

  return (
    <div>
      <PageHeader title="Economy" subtitle="Price history, wealth distribution and agent finances" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Price history chart */}
        <GlassCard style={{ padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>
            Food Price History — All Towns
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={priceChartData} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="turn" tick={{ fontSize: 11, fill: '#9CA3AF' }} label={{ value: 'Turn', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {towns.map((town, i) => (
                <Line
                  key={town.name}
                  type="monotone"
                  dataKey={town.name}
                  stroke={TOWN_COLORS[i % TOWN_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Agent wealth over time */}
        <GlassCard style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>
              Agent Wealth Over Time
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 400 }}>
              {agents.map(a => (
                <button key={a.name} onClick={() => toggleAgent(a.name)} style={{
                  padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: activeAgents.has(a.name) || activeAgents.size === 0 ? '#FF6B2C' : 'rgba(0,0,0,0.06)',
                  color: activeAgents.has(a.name) || activeAgents.size === 0 ? '#fff' : '#6B7280',
                  border: 'none',
                }}>
                  {a.name}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={wealthChartData} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="turn" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 12, fontSize: 12 }} />
              {shownAgents.map((agent, i) => (
                <Line
                  key={agent.name}
                  type="monotone"
                  dataKey={agent.name}
                  stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Wealth distribution at current turn */}
        <GlassCard style={{ padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>
            Wealth Distribution — Turn {turn}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentWealth.map((w, i) => {
              const max = currentWealth[0]?.money ?? 1
              const agent = agents.find(a => a.name === w.name)
              return (
                <div key={w.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, fontSize: 11, color: '#9CA3AF', textAlign: 'right' }}>#{i + 1}</div>
                  <div style={{ width: 72, fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{w.name}</div>
                  <div style={{ flex: 1, height: 10, background: 'rgba(0,0,0,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(w.money / max) * 100}%`, height: '100%',
                      background: i < 3 ? '#FF6B2C' : i < 8 ? '#FFB74D' : '#B0BEC5',
                      borderRadius: 5, transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ width: 60, fontSize: 12, color: '#6B7280', textAlign: 'right' }}>
                    {w.money.toFixed(1)} 🪙
                  </div>
                  <div style={{ width: 60, fontSize: 10, color: '#9CA3AF' }}>
                    {agent?.role}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
