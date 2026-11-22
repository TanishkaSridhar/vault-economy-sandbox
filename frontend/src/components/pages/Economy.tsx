import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel } from '../ui/Panel'
import { PageHeader } from '../layout/PageHeader'
import { useTurn } from '../../hooks/useTurn'
import { useRunData } from '../../hooks/useSimData'
import { roleStyle, TERRAIN_ACCENT } from '../world/cozy/palette'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

const AGENT_COLORS = ['#5b7a34', '#4f8a9a', '#a8492c', '#c9962e', '#8a5f3c', '#7d6a9a', '#3f6e55', '#b07a52',
  '#86a35a', '#6fa8b6', '#c96f4f', '#dcb45a', '#a98260', '#9b8ab8', '#5e9175', '#cf9a72']
const AXIS = { fontSize: 11, fill: '#7f6850' }
const TIP = { background: '#faf6ec', border: '1px solid #cbb993', borderRadius: 8, fontSize: 12 }

/** Gini coefficient: 0 = everyone equally rich, 1 = one agent has everything. */
function gini(xs: number[]) {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b), n = s.length, total = s.reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  return s.reduce((acc, x, i) => acc + (2 * (i + 1) - n - 1) * x, 0) / (n * total)
}

export function Economy() {
  const { turn, runId } = useTurn()
  const { towns, agents, agentStates, townStates, isLoading } = useRunData(runId)
  const navigate = useNavigate()
  const [shown, setShown] = useState<Set<string>>(new Set())

  const priceData = useMemo(() => {
    const by: Record<number, Record<string, number>> = {}
    for (const t of townStates) (by[t.turn] ??= { turn: t.turn })[t.town] = t.price
    return Object.values(by).sort((a, b) => a.turn - b.turn)
  }, [townStates])
  const wealthData = useMemo(() => {
    const by: Record<number, Record<string, number>> = {}
    for (const a of agentStates) (by[a.turn] ??= { turn: a.turn })[a.agent] = a.money
    return Object.values(by).sort((a, b) => a.turn - b.turn)
  }, [agentStates])
  const today = useMemo(() => agentStates.filter(s => s.turn === turn).map(s => ({ name: s.agent, money: s.money })).sort((a, b) => b.money - a.money), [agentStates, turn])
  const prices = townStates.filter(t => t.turn === turn).map(t => t.price)
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const g = gini(today.map(t => t.money))

  const toggle = (name: string) => setShown(prev => { const n = new Set(prev); if (n.has(name)) n.delete(name); else n.add(name); return n })
  const visible = shown.size > 0 ? agents.filter(a => shown.has(a.name)) : agents

  if (isLoading) return <div style={{ padding: 20, color: 'var(--ink-faint)' }}>Loading economy data...</div>

  return (
    <div>
      <PageHeader title="Economy" subtitle="How food prices moved in every town, and how wealth spread out (or piled up) among the agents."
        facts={today.length ? [
          { label: 'Average food price', value: avg.toFixed(1) },
          { label: 'Richest vs poorest', value: `${today[0].money.toFixed(0)} vs ${today[today.length - 1].money.toFixed(0)}` },
          { label: 'Inequality (Gini)', value: `${g.toFixed(2)}${g < 0.25 ? ', fairly even' : g < 0.45 ? ', uneven' : ', very uneven'}` },
        ] : undefined} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel title="Food price in every town" hint="One line per town, coloured by its terrain. The dashed line marks the day you are viewing.">
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={priceData} margin={{ top: 4, right: 16, left: -12, bottom: 4 }}>
              <CartesianGrid stroke="#ddcfb1" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="turn" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbb993' }} label={{ value: 'day', position: 'insideBottomRight', offset: -2, fontSize: 11, fill: '#7f6850' }} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TIP} labelFormatter={t => `Day ${t}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine x={turn} stroke="#8a5f3c" strokeDasharray="4 3" />
              {towns.map(t => (
                <Line isAnimationActive={false} key={t.name} type="monotone" dataKey={t.name} stroke={TERRAIN_ACCENT[t.terrain] ?? '#8a5f3c'} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <Panel title="Coins over time" hint="Pick names to compare a few agents; none picked shows everyone."
            bodyStyle={{ paddingTop: 10 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {agents.map((a, i) => {
                const on = shown.has(a.name)
                return (
                  <button key={a.name} onClick={() => toggle(a.name)} style={{
                    padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${on ? AGENT_COLORS[i % AGENT_COLORS.length] : 'var(--line)'}`,
                    background: on ? AGENT_COLORS[i % AGENT_COLORS.length] : 'var(--surface-2)',
                    color: on ? '#f8f5ea' : 'var(--ink-sub)',
                  }}>{a.name}</button>
                )
              })}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={wealthData} margin={{ top: 4, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid stroke="#ddcfb1" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="turn" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbb993' }} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TIP} labelFormatter={t => `Day ${t}`} />
                <ReferenceLine x={turn} stroke="#8a5f3c" strokeDasharray="4 3" />
                {visible.map(a => (
                  <Line isAnimationActive={false} key={a.name} type="monotone" dataKey={a.name} stroke={AGENT_COLORS[agents.indexOf(a) % AGENT_COLORS.length]} strokeWidth={shown.size ? 2.4 : 1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title={`Who holds the money, day ${turn}`} hint="Bars are coloured by role. Click a name to open that agent.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {today.map((w, i) => {
                const role = agents.find(a => a.name === w.name)?.role ?? ''
                const rs = roleStyle(role)
                return (
                  <div key={w.name} className="bar-row" onClick={() => navigate(`/agents?agent=${w.name}`)} title={`Open ${w.name}`} style={{ cursor: 'pointer', borderRadius: 4, display: 'grid', gridTemplateColumns: '24px 70px 1fr 48px', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <span style={{ color: 'var(--ink-faint)', textAlign: 'right' }}>{i + 1}</span>
                    <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</strong>
                    <div style={{ height: 12, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(w.money / (today[0]?.money || 1)) * 100}%`, height: '100%', background: rs.ink, opacity: 0.8, transition: 'width 0.5s var(--ease)' }} />
                    </div>
                    <span style={{ textAlign: 'right', color: 'var(--ink-sub)' }}>{w.money.toFixed(0)}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11.5, color: 'var(--ink-sub)' }}>
              {['Farmer', 'Trader', 'Diplomat'].map(r => (
                <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: roleStyle(r).ink, opacity: 0.8 }} />{r}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
