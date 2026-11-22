import { useSearchParams, useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { Panel, Figure } from '../ui/Panel'
import { PageHeader } from '../layout/PageHeader'
import { Badge } from '../ui/Badge'
import { TerrainGlyph } from '../ui/TerrainGlyph'
import { useTurn } from '../../hooks/useTurn'
import { useRunData, useTurnDecisions, getTownStatesAtTurn, getAgentStatesAtTurn } from '../../hooks/useSimData'
import { CozyWorld } from '../world/cozy/CozyWorld'
import { TERRAIN_ACCENT } from '../world/cozy/palette'

const TERRAIN_NOTE: Record<string, string> = {
  RIVER: 'Fertile river land: farmers grow plenty.',
  PLAINS: 'Open farmland: good harvests.',
  FOREST: 'Woodland: modest harvests.',
  HILLS: 'Rolling hills: modest harvests.',
  COAST: 'Sea coast: little farmland.',
  MARSH: 'Wet marsh: poor harvests.',
  DESERT: 'Dry desert: hardly anything grows.',
  MOUNTAINS: 'High mountains: hardly anything grows.',
}
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

export function Towns() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { turn, runId } = useTurn()
  const { towns, agents, roads, agentStates, townStates, isLoading } = useRunData(runId)
  const turnDecisions = useTurnDecisions(runId, turn)

  const nowTowns = getTownStatesAtTurn(townStates, turn)
  const nowAgents = getAgentStatesAtTurn(agentStates, turn)
  // Always one town open, so choosing another only swaps the detail and nothing reflows.
  // The choice lives in the URL, so links from other pages and the back button both work.
  const asked = searchParams.get('town')
  const fallback = [...nowTowns].sort((a, b) => a.price - b.price)[0]?.town ?? towns[0]?.name ?? null
  const selectedTown = asked && towns.some(t => t.name === asked) ? asked : fallback
  const setSelectedTown = (name: string) => setSearchParams({ town: name }, { replace: true })
  const detailTown = towns.find(t => t.name === selectedTown) ?? null
  const detailState = nowTowns.find(t => t.town === selectedTown) ?? null
  const history = selectedTown ? townStates.filter(ts => ts.town === selectedTown).sort((a, b) => a.turn - b.turn) : []
  const here = selectedTown ? nowAgents.filter(a => a.town === selectedTown) : []
  const cheapest = Math.min(...nowTowns.map(t => t.price))
  const dearest = Math.max(...nowTowns.map(t => t.price))

  const header = (
    <PageHeader title="Towns" subtitle="Each town has its own food market. Prices rise when people buy more than they sell, and fall when they sell more."
      facts={nowTowns.length ? [
        { label: 'Towns', value: towns.length },
        { label: 'Cheapest food', value: `${nowTowns.find(t => t.price === cheapest)?.town} at ${cheapest.toFixed(1)}` },
        { label: 'Dearest food', value: `${nowTowns.find(t => t.price === dearest)?.town} at ${dearest.toFixed(1)}` },
      ] : undefined} />
  )

  if (isLoading) return <div>{header}<Panel><div style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>Loading...</div></Panel></div>

  return (
    <div>
      {header}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* town list */}
        <div style={{ flex: '0 0 290px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {towns.map(town => {
              const state = nowTowns.find(ts => ts.town === town.name)
              const prev = townStates.find(ts => ts.town === town.name && ts.turn === turn - 1)
              const change = state && prev ? state.price - prev.price : 0
              const count = nowAgents.filter(a => a.town === town.name).length
              const active = selectedTown === town.name
              return (
                <GlassCard key={town.name} hoverable={!active} onClick={() => setSelectedTown(town.name)}
                  style={{ padding: 0, overflow: 'hidden', ...(active ? { borderColor: 'var(--accent)', backgroundColor: '#fdfaf2', boxShadow: 'inset 4px 0 0 var(--accent), 0 3px 0 -1px var(--line)' } : {}) }}>
                  <div style={{ height: 6, background: TERRAIN_ACCENT[town.terrain] ?? 'var(--soil)' }} />
                  <div style={{ padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <TerrainGlyph terrain={town.terrain} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 20, lineHeight: 1 }}>{town.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-sub)', marginTop: 3 }}>{titleCase(town.terrain)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{(state?.price ?? town.start_price).toFixed(1)}</div>
                      <div style={{ fontSize: 11, marginTop: 3, color: change > 0 ? 'var(--bad)' : change < 0 ? 'var(--good)' : 'var(--ink-faint)' }}>
                        {change > 0 ? <ArrowUpRight size={12} /> : change < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />} {change ? Math.abs(change).toFixed(1) : 'steady'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-sub)' }}>
                    <div style={{ flex: 1, padding: '7px 14px' }}>Stock <strong style={{ color: 'var(--ink)' }}>{state?.stock ?? town.start_stock}</strong></div>
                    <div style={{ flex: 1, padding: '7px 14px', borderLeft: '1px solid var(--line)' }}>People <strong style={{ color: 'var(--ink)' }}>{count}</strong></div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>

        {/* one town in detail */}
        {selectedTown && detailTown && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div style={{ height: 400, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-strong)', boxShadow: '0 3px 0 -1px var(--line)' }}>
              <CozyWorld agents={agents} towns={towns} roads={roads} agentStates={agentStates} townStates={townStates}
                decisions={turnDecisions} focusTown={selectedTown} onTownClick={setSelectedTown} showLegend={false} />
            </div>

            <Panel title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><TerrainGlyph terrain={detailTown.terrain} size={26} />{detailTown.name}</span>}
              hint={TERRAIN_NOTE[detailTown.terrain] ?? titleCase(detailTown.terrain)}>
              {detailState && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
                  <Figure label="Food price" value={detailState.price.toFixed(1)} unit="coins" />
                  <Figure label="Market stock" value={detailState.stock} unit="food" />
                  <Figure label="Bought today" value={detailState.bought} note="from the market" />
                  <Figure label="Sold today" value={detailState.sold} note="to the market" />
                </div>
              )}
            </Panel>

            <Panel title="Price over time" hint={`Food price in ${detailTown.name} at the end of each day. The line marks the day you are viewing.`}>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={history} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="town-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TERRAIN_ACCENT[detailTown.terrain] ?? '#5b7a34'} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={TERRAIN_ACCENT[detailTown.terrain] ?? '#5b7a34'} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#ddcfb1" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="turn" tick={{ fontSize: 11, fill: '#7f6850' }} tickLine={false} axisLine={{ stroke: '#cbb993' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#7f6850' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#faf6ec', border: '1px solid #cbb993', borderRadius: 8, fontSize: 12 }} labelFormatter={t => `Day ${t}`} formatter={v => [Number(v).toFixed(1), 'price']} />
                  <ReferenceLine x={turn} stroke="#8a5f3c" strokeDasharray="4 3" />
                  <Area isAnimationActive={false} type="monotone" dataKey="price" stroke={TERRAIN_ACCENT[detailTown.terrain] ?? '#5b7a34'} strokeWidth={2.5} fill="url(#town-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title={`People in ${detailTown.name}`} hint="Who is here at the end of this day, and what they carry. Click a name to open that agent.">
              {here.length === 0 ? <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Nobody is here today.</div> : (
                <table className="ledger">
                  <thead><tr><th>Name</th><th>Role</th><th className="r">Coins</th><th className="r">Food</th><th>Heading for</th></tr></thead>
                  <tbody>
                    {here.map(a => {
                      const agent = agents.find(x => x.name === a.agent)
                      return (
                        <tr key={a.agent} onClick={() => navigate(`/agents?agent=${a.agent}`)} style={{ cursor: 'pointer' }} title={`Open ${a.agent}`}>
                          <td><strong>{a.agent}</strong></td>
                          <td><Badge role={(agent?.role ?? 'Trader') as 'Farmer' | 'Trader' | 'Diplomat'} size="sm" /></td>
                          <td className="r">{a.money.toFixed(1)}</td>
                          <td className="r" style={{ color: a.food <= 0 ? 'var(--bad)' : undefined }}>{a.food}</td>
                          <td style={{ color: 'var(--ink-sub)' }}>{a.destination && a.destination !== a.town ? a.destination : 'staying'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
