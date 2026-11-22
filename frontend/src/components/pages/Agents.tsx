import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { GlassCard } from '../ui/GlassCard'
import { Panel } from '../ui/Panel'
import { PageHeader } from '../layout/PageHeader'
import { Badge } from '../ui/Badge'
import { Sparkline } from '../ui/Sparkline'
import { SlidingTabs } from '../ui/SlidingTabs'
import { useTurn } from '../../hooks/useTurn'
import { Portrait, PortraitRenderer } from '../world/cozy/Portraits'
import { roleStyle } from '../world/cozy/palette'
import { useRunData, getAgentStatesAtTurn } from '../../hooks/useSimData'

const SORTS = ['Richest', 'Name', 'Role'] as const
const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th')
const repWord = (r?: number) => r == null ? null : r >= 0.4 ? 'excellent' : r >= 0.15 ? 'good' : r > -0.15 ? 'neutral' : r > -0.4 ? 'poor' : 'bad'

export function Agents() {
  const { turn, runId } = useTurn()
  const { agents, agentStates } = useRunData(runId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [sortBy, setSortBy] = useState<typeof SORTS[number]>('Richest')

  const now = useMemo(() => getAgentStatesAtTurn(agentStates, turn), [agentStates, turn])
  const history = useMemo(() => {
    const h: Record<string, number[]> = {}
    for (const s of agentStates) if (s.turn <= turn) (h[s.agent] ??= []).push(s.money)
    return h
  }, [agentStates, turn])

  const byMoney = useMemo(() => [...now].sort((a, b) => b.money - a.money).map(s => s.agent), [now])
  const list = useMemo(() => {
    const l = agents.map(a => ({ ...a, state: now.find(s => s.agent === a.name), rank: byMoney.indexOf(a.name) + 1 }))
    if (sortBy === 'Richest') return l.sort((a, b) => a.rank - b.rank)
    if (sortBy === 'Name') return l.sort((a, b) => a.name.localeCompare(b.name))
    return l.sort((a, b) => a.role.localeCompare(b.role) || a.rank - b.rank)
  }, [agents, now, byMoney, sortBy])

  // Always one agent open (the one in the URL, else the richest), so picking someone
  // swaps the detail in place instead of reflowing the whole grid.
  const asked = searchParams.get('agent')
  const selected = asked && agents.some(a => a.name === asked) ? asked : byMoney[0] ?? agents[0]?.name ?? null
  const setSelected = (name: string) => setSearchParams({ agent: name }, { replace: true })
  const sel = selected ? list.find(a => a.name === selected) : null
  const selHistory = useMemo(() => selected ? agentStates.filter(s => s.agent === selected).sort((a, b) => a.turn - b.turn) : [], [agentStates, selected])
  const hungry = now.filter(s => s.food <= 0).length
  const richest = list.find(a => a.rank === 1)

  return (
    <div>
      <PortraitRenderer names={agents.map(a => a.name)} />
      <PageHeader title="Agents" subtitle="Everyone in the valley: what they hold today and how their fortunes have changed."
        facts={now.length ? [
          { label: 'Agents', value: agents.length },
          { label: 'Richest', value: richest ? `${richest.name}, ${richest.state?.money.toFixed(0)} coins` : '-' },
          { label: 'Out of food', value: hungry },
        ] : undefined}
        actions={<SlidingTabs tabs={SORTS} active={sortBy} onChange={setSortBy} size="sm" ariaLabel="Sort agents" />} />

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {list.map(agent => {
            const rs = roleStyle(agent.role)
            const isSel = selected === agent.name
            const money = agent.state?.money ?? agent.start_money
            const food = agent.state?.food ?? agent.start_food
            return (
              <GlassCard key={agent.name} hoverable={!isSel} onClick={() => setSelected(agent.name)}
                style={{ padding: 0, overflow: 'hidden', ...(isSel ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px var(--accent)' } : {}) }}>
                <div style={{ background: rs.color, padding: '8px 12px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: rs.ink, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{agent.role}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: rs.ink }}>{ordinal(agent.rank)} richest</span>
                </div>
                <div style={{ marginTop: -26 }}><Portrait name={agent.name} role={agent.role} size={58} /></div>
                <div style={{ textAlign: 'center', padding: '6px 12px 0' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 19, lineHeight: 1.1 }}>{agent.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-sub)', marginTop: 2 }}>
                    in {agent.state?.town ?? agent.start_town}{agent.state?.destination && agent.state.destination !== agent.state.town ? `, heading for ${agent.state.destination}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', margin: '10px 0 0', borderTop: '1px solid var(--line)' }}>
                  <div style={{ flex: 1, padding: '7px 12px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coins</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{money.toFixed(0)}</div>
                  </div>
                  <div style={{ flex: 1, padding: '7px 12px', borderLeft: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Food</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: food <= 0 ? 'var(--bad)' : undefined }}>{food}</div>
                  </div>
                </div>
                {(history[agent.name]?.length ?? 0) > 1 && (
                  <div style={{ padding: '0 12px 10px' }}><Sparkline data={history[agent.name]} width={150} height={26} color={rs.ink} /></div>
                )}
              </GlassCard>
            )
          })}
        </div>

        {sel && (
          <div style={{ flex: '0 0 340px', position: 'sticky', top: 88 }}>
            <Panel title={sel.name} hint={`${sel.role}, started in ${sel.start_town} with ${sel.start_money} coins and ${sel.start_food} food`}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
                <Portrait name={sel.name} role={sel.role} size={72} />
                <Badge role={sel.role as 'Farmer' | 'Trader' | 'Diplomat'} />
              </div>
              <table className="ledger">
                <tbody>
                  <tr><td>Where</td><td className="r"><Link to={`/towns?town=${sel.state?.town ?? sel.start_town}`} style={{ color: 'var(--accent-strong)', fontWeight: 700 }}>{sel.state?.town ?? sel.start_town}</Link></td></tr>
                  {sel.state?.destination && sel.state.destination !== sel.state.town && <tr><td>Heading for</td><td className="r">{sel.state.destination}</td></tr>}
                  <tr><td>Coins</td><td className="r"><strong>{(sel.state?.money ?? sel.start_money).toFixed(1)}</strong></td></tr>
                  <tr><td>Food</td><td className="r"><strong>{sel.state?.food ?? sel.start_food}</strong></td></tr>
                  <tr><td>Rank by wealth</td><td className="r">{ordinal(sel.rank)} of {agents.length}</td></tr>
                  {sel.state?.reputation != null && <tr><td>Reputation</td><td className="r">{repWord(sel.state.reputation)} ({sel.state.reputation >= 0 ? '+' : ''}{sel.state.reputation.toFixed(2)})</td></tr>}
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: 'var(--ink-sub)', margin: '14px 0 4px', fontWeight: 600 }}>Coins and food, day by day</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={selHistory} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#ddcfb1" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="turn" tick={{ fontSize: 10.5, fill: '#7f6850' }} tickLine={false} axisLine={{ stroke: '#cbb993' }} />
                  <YAxis tick={{ fontSize: 10.5, fill: '#7f6850' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#faf6ec', border: '1px solid #cbb993', borderRadius: 8, fontSize: 12 }} labelFormatter={t => `Day ${t}`} />
                  <ReferenceLine x={turn} stroke="#8a5f3c" strokeDasharray="4 3" />
                  <Line isAnimationActive={false} type="monotone" dataKey="money" name="coins" stroke="#5b7a34" strokeWidth={2.2} dot={false} />
                  <Line isAnimationActive={false} type="monotone" dataKey="food" name="food" stroke="#c9962e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
