import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Maximize2, ArrowUpRight, ArrowDownRight, Minus, Handshake, MessageCircle, UtensilsCrossed, Store, Footprints } from 'lucide-react'
import { CozyWorld } from '../world/cozy/CozyWorld'
import { Panel, Figure } from '../ui/Panel'
import { TerrainGlyph } from '../ui/TerrainGlyph'
import { useTurn } from '../../hooks/useTurn'
import { useRunData, useTurnDecisions, type GameEvent } from '../../hooks/useSimData'

const num = (x: number, d = 0) => (Number.isInteger(x) && d === 0 ? String(x) : x.toFixed(d))
const signed = (x: number, d = 0) => (x > 0 ? '+' : x < 0 ? '−' : '±') + num(Math.abs(x), d)
const data = (e: GameEvent): Record<string, unknown> => { try { return e.data_json ? JSON.parse(e.data_json) : {} } catch { return {} } }

/** What the day's events say, in plain sentences, most interesting first. */
function storyOf(events: GameEvent[]) {
  const out: { icon: typeof Handshake; tone: string; text: string }[] = []
  for (const e of events) {
    const x = data(e)
    if (e.type === 'TRADE') out.push({ icon: Handshake, tone: 'var(--warn)', text: `${x.seller} sold ${x.qty} food to ${x.buyer} at ${x.price} in ${e.town}` })
    else if (e.type === 'RUMOUR') out.push({ icon: MessageCircle, tone: x.good ? 'var(--good)' : 'var(--bad)', text: `${e.agent} told ${(x.listeners as string[] | undefined)?.join(', ')} that ${x.about} ${x.good ? 'is a fair dealer' : 'is not to be trusted'}` })
  }
  const hungry = events.filter(e => e.type === 'HUNGRY').map(e => e.agent)
  if (hungry.length) out.push({ icon: UtensilsCrossed, tone: 'var(--bad)', text: `${hungry.join(', ')} went to bed hungry` })
  const toMarket = events.filter(e => e.type === 'MARKET_SALE')
  if (toMarket.length) out.push({ icon: Store, tone: 'var(--water)', text: `${toMarket.length} seller${toMarket.length > 1 ? 's' : ''} sent unsold food to the market (${toMarket.map(e => e.agent).join(', ')})` })
  const trips = events.filter(e => e.type === 'TRAVELLED')
  if (trips.length) out.push({ icon: Footprints, tone: 'var(--soil)', text: `${trips.length} on the road: ${trips.map(e => `${e.agent} to ${data(e).to}`).join(', ')}` })
  return out
}

export function Overview() {
  const navigate = useNavigate()
  const { turn, runId, maxTurn } = useTurn()
  const { agents, towns, roads, agentStates, townStates, events, isLoading } = useRunData(runId)
  const decisions = useTurnDecisions(runId, turn)

  const now = useMemo(() => agentStates.filter(s => s.turn === turn), [agentStates, turn])
  const before = useMemo(() => agentStates.filter(s => s.turn === turn - 1), [agentStates, turn])
  const today = useMemo(() => events.filter(e => e.turn === turn), [events, turn])
  const yesterday = useMemo(() => events.filter(e => e.turn === turn - 1), [events, turn])

  const wealth = now.reduce((s, a) => s + a.money, 0)
  const wealthBefore = before.reduce((s, a) => s + a.money, 0)
  const food = now.reduce((s, a) => s + a.food, 0)
  const foodBefore = before.reduce((s, a) => s + a.food, 0)
  const trades = today.filter(e => e.type === 'TRADE').length
  const tradesBefore = yesterday.filter(e => e.type === 'TRADE').length
  const hungry = today.filter(e => e.type === 'HUNGRY').length
  const hungryBefore = yesterday.filter(e => e.type === 'HUNGRY').length

  const board = useMemo(() => towns.map(t => {
    const s = townStates.find(x => x.town === t.name && x.turn === turn)
    const p = townStates.find(x => x.town === t.name && x.turn === turn - 1)
    return { name: t.name, terrain: t.terrain, price: s?.price ?? t.start_price, change: s && p ? s.price - p.price : 0, stock: s?.stock ?? t.start_stock, sold: s?.sold ?? 0, bought: s?.bought ?? 0, people: now.filter(a => a.town === t.name).length }
  }).sort((a, b) => a.price - b.price), [towns, townStates, turn, now])

  const story = useMemo(() => storyOf(today), [today])

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 64px - 96px - 24px)', minHeight: 560 }}>
      {/* the map */}
      <div style={{ flex: '0 0 56%', position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-strong)', boxShadow: '0 3px 0 -1px var(--line)' }}>
        <CozyWorld agents={agents} towns={towns} roads={roads} agentStates={agentStates} townStates={townStates}
          decisions={decisions} onTownClick={name => navigate(`/towns?town=${name}`)} showLegend={false} />
        <div style={{ position: 'absolute', left: 14, top: 14, zIndex: 3, display: 'flex', gap: 8 }}>
          <div className="cz-overlay" style={{ position: 'static', padding: '6px 12px', fontSize: 15 }}>Day {turn} of {maxTurn}</div>
          <button onClick={() => navigate('/world')} className="cz-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Maximize2 size={14} /> Full screen and playback
          </button>
        </div>
      </div>

      {/* the day, explained */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 4 }}>
        <Panel style={{ flexShrink: 0 }} title={`Day ${turn} at a glance`} hint="Totals across all agents, compared with the day before.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px 20px' }}>
            <Figure label="Money held" value={num(wealth)} unit="coins" note={turn > 1 ? `${signed(wealth - wealthBefore)} since yesterday` : 'first day'} tone={wealth >= wealthBefore ? 'good' : 'bad'} />
            <Figure label="Food held" value={num(food)} unit="food" note={turn > 1 ? `${signed(food - foodBefore)} since yesterday` : 'first day'} tone={food >= foodBefore ? 'good' : 'bad'} />
            <Figure label="Deals between agents" value={trades} note={turn > 1 ? `${tradesBefore} the day before` : undefined} />
            <Figure label="Went hungry" value={hungry} unit={hungry === 1 ? 'agent' : 'agents'} note={turn > 1 ? `${hungryBefore} the day before` : undefined} tone={hungry > hungryBefore ? 'bad' : hungry < hungryBefore ? 'good' : 'plain'} />
          </div>
        </Panel>

        <Panel style={{ flexShrink: 0 }} title="Market board" hint="Price of one food in each town, cheapest first. Click a town for details.">
          <table className="ledger">
            <thead><tr><th>Town</th><th className="r">Price</th><th className="r">Change</th><th className="r">Stock</th><th className="r">Bought / sold</th><th className="r">Here</th></tr></thead>
            <tbody>
              {board.map(t => (
                <tr key={t.name} onClick={() => navigate(`/towns?town=${t.name}`)} style={{ cursor: 'pointer' }}>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TerrainGlyph terrain={t.terrain} size={22} /><strong>{t.name}</strong></span></td>
                  <td className="r"><strong>{num(t.price, 1)}</strong></td>
                  <td className="r" style={{ color: t.change > 0 ? 'var(--bad)' : t.change < 0 ? 'var(--good)' : 'var(--ink-faint)' }}>
                    {t.change > 0 ? <ArrowUpRight size={13} /> : t.change < 0 ? <ArrowDownRight size={13} /> : <Minus size={13} />} {t.change ? num(Math.abs(t.change), 1) : ''}
                  </td>
                  <td className="r">{t.stock}</td>
                  <td className="r" style={{ color: 'var(--ink-sub)' }}>{t.bought} / {t.sold}</td>
                  <td className="r" style={{ color: 'var(--ink-sub)' }}>{t.people}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel style={{ flexShrink: 0 }} title="What happened today" hint="Deals, rumours, travel and hunger on this day.">
          {isLoading ? <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading...</div>
            : story.length === 0 ? <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>A quiet day: nobody traded, travelled or went hungry.</div>
            : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {story.map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.4 }}>
                    <span style={{ flex: 'none', width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--line)', color: s.tone }}><s.icon size={14} /></span>
                    <span style={{ paddingTop: 3 }}>{s.text}</span>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
      </div>
    </div>
  )
}
