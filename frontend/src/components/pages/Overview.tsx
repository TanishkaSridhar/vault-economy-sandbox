import { useNavigate } from 'react-router-dom'
import { GlassCard } from '../ui/GlassCard'
import { KPITile } from '../ui/KPITile'
import { RingGauge } from '../ui/RingGauge'
import { DotMatrixChart } from '../ui/DotMatrixChart'
import { TickBar } from '../ui/TickBar'
import { TabSwitch } from '../ui/TabSwitch'
import { PageHeader } from '../layout/PageHeader'
import { WorldCanvas } from '../world/WorldCanvas'
import { useTurn } from '../../hooks/useTurn'
import { useRunData, getTownStatesAtTurn, getAgentStatesAtTurn, getEventsUpToTurn } from '../../hooks/useSimData'
import { useState, useMemo, useCallback } from 'react'

const TOWN_NAMES = ['Riverton', 'Valley', 'Port', 'Woodhaven', 'Saltmarsh', 'Hill', 'Sandreach', 'Highpeak']
const PRICE_MIN = 4
const PRICE_MAX = 17

export function Overview() {
  const navigate = useNavigate()
  const { turn, runId, maxTurn } = useTurn()
  const { agents, towns, agentStates, townStates, events, decisions, relationships, isLoading } = useRunData(runId)
  const [activeTab, setActiveTab] = useState('Live')
  const [selectedTown, setSelectedTown] = useState<string | null>(null)

  // Current-turn derived data
  const currentAgentStates = useMemo(() => getAgentStatesAtTurn(agentStates, turn), [agentStates, turn])
  const currentTownStates = useMemo(() => getTownStatesAtTurn(townStates, turn), [townStates, turn])
  const eventsUpToNow = useMemo(() => getEventsUpToTurn(events, turn), [events, turn])

  // KPIs
  const totalWealth = useMemo(() =>
    currentAgentStates.reduce((s, a) => s + a.money, 0), [currentAgentStates])

  const tradesThisTurn = useMemo(() =>
    events.filter(e => e.turn === turn && (e.type === 'BOUGHT' || e.type === 'SOLD')).length,
    [events, turn])

  const hungryCount = useMemo(() =>
    eventsUpToNow.filter(e => e.type === 'HUNGRY').length,
    [eventsUpToNow])

  const tollsPaid = useMemo(() => {
    const travelled = eventsUpToNow.filter(e => e.type === 'TRAVELLED' && e.data_json)
    return travelled.reduce((sum, e) => {
      try { const d = JSON.parse(e.data_json!); return sum + (d.coins ?? 0) } catch { return sum }
    }, 0)
  }, [eventsUpToNow])

  // Avg price for ring gauge (0-100%)
  const avgPrice = currentTownStates.length > 0
    ? currentTownStates.reduce((s, t) => s + t.price, 0) / currentTownStates.length
    : 9
  const priceRingPct = Math.round(((avgPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100)

  // Dot matrix: price history all towns
  const dotData = useMemo(() => {
    const pts: Array<{ x: number; y: number; value: number; label?: string }> = []
    townStates.forEach(ts => {
      const yi = TOWN_NAMES.indexOf(ts.town)
      if (yi === -1) return
      pts.push({ x: ts.turn, y: yi, value: ts.price, label: ts.town })
    })
    return pts
  }, [townStates])

  // Supply vs demand
  const totalSold = currentTownStates.reduce((s, t) => s + t.sold, 0)
  const totalBought = currentTownStates.reduce((s, t) => s + t.bought, 0)
  const maxFlow = Math.max(totalSold, totalBought, 1)

  // Town for the conditions card
  const condTownName = selectedTown ?? currentTownStates[0]?.town ?? TOWN_NAMES[0]
  const condTown = currentTownStates.find(t => t.town === condTownName)
  const condTownPrev = townStates.find(t => t.town === condTownName && t.turn === Math.max(1, turn - 1))

  // Agent states with role for 3D map
  const currentTurnDecisions = useMemo(
    () => decisions.filter(d => d.turn === turn),
    [decisions, turn]
  )
  const prevTurnAgentStates = useMemo(
    () => getAgentStatesAtTurn(agentStates, Math.max(0, turn - 1)),
    [agentStates, turn]
  )
  const currentRelationships = useMemo(
    () => relationships.filter(r => r.turn === turn),
    [relationships, turn]
  )

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 64px - 80px)', overflow: 'hidden' }}>
      {/* Left: 3D World */}
      <div style={{ flex: '0 0 60%', height: '100%', minHeight: 400 }}>
        <WorldCanvas
          onTownClick={(name) => navigate(`/towns?town=${name}`)}
          agentStates={currentAgentStates}
          prevAgentStates={prevTurnAgentStates}
          townStates={currentTownStates.map(t => ({ town: t.town, price: t.price, stock: t.stock }))}
          townMeta={towns.map(t => ({ name: t.name, terrain: t.terrain }))}
          decisions={currentTurnDecisions as any}
          relationships={currentRelationships as any}
          turn={turn}
          style={{ height: '100%' }}
        />
      </div>

      {/* Right: glass cards column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingRight: 4 }}>
        {/* TabSwitch */}
        <TabSwitch
          tabs={['Live', 'Day', 'Week', 'Month']}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* KPI tiles 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <KPITile
            label="Total Wealth"
            value={totalWealth.toFixed(0)}
            unit="🪙"
            progress={Math.min(100, (totalWealth / 500) * 100)}
            icon="💰"
          />
          <KPITile
            label="Trades"
            value={tradesThisTurn}
            unit="this turn"
            progress={Math.min(100, (tradesThisTurn / 20) * 100)}
            icon="🏪"
          />
          <KPITile
            label="Hungry Events"
            value={hungryCount}
            unit="total"
            progress={Math.min(100, (hungryCount / 50) * 100)}
            icon="🍽️"
          />
          <KPITile
            label="Tolls Paid"
            value={tollsPaid.toFixed(1)}
            unit="🪙"
            progress={Math.min(100, (tollsPaid / 100) * 100)}
            icon="🛤️"
          />
        </div>

        {/* Food Price Index ring */}
        <GlassCard style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <RingGauge
              value={priceRingPct}
              label={avgPrice.toFixed(1)}
              sublabel="avg price"
              size={110}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 6 }}>
                Food Price Index
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>
                Turn {turn} of {maxTurn}
              </div>
              {/* Top 3 town prices */}
              {currentTownStates
                .sort((a, b) => b.price - a.price)
                .slice(0, 4)
                .map(ts => (
                  <div key={ts.town} style={{ marginBottom: 6 }}>
                    <TickBar
                      label={ts.town}
                      value={ts.price}
                      max={PRICE_MAX}
                      valueLabel={`${ts.price.toFixed(1)}`}
                    />
                  </div>
                ))
              }
            </div>
          </div>
        </GlassCard>

        {/* Dot matrix price history */}
        <GlassCard style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>
            Price History
          </div>
          <DotMatrixChart
            data={dotData}
            width={320}
            height={100}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {TOWN_NAMES.map((t, i) => (
              <div key={t} style={{ fontSize: 10, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B2C', opacity: 0.4 + i * 0.08 }} />
                {t}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Food supply vs demand */}
        <GlassCard style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>
            Food Flow — Turn {turn}
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <RingGauge
              value={totalBought > 0 ? Math.round((totalSold / (totalSold + totalBought)) * 100) : 50}
              label={`${totalSold}`}
              sublabel="sold"
              size={80}
            />
            <div style={{ flex: 1 }}>
              <TickBar label="Sold to market" value={totalSold} max={maxFlow} valueLabel={`${totalSold}`} />
              <div style={{ marginTop: 6 }}>
                <TickBar label="Bought from market" value={totalBought} max={maxFlow} valueLabel={`${totalBought}`} color="#7C9CB5" />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Town Conditions card */}
        <GlassCard style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Town Conditions</div>
            <select
              value={condTownName}
              onChange={e => setSelectedTown(e.target.value)}
              style={{
                fontSize: 11, color: '#6B7280', border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8, padding: '3px 8px', background: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              }}
            >
              {TOWN_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {condTown ? (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#FF6B2C' }}>
                    {condTown.price.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280' }}>price</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E' }}>
                    {condTown.stock}
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280' }}>stock</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: condTown.price > (condTownPrev?.price ?? condTown.price) ? '#E53935' : '#43A047' }}>
                    {condTownPrev ? (condTown.price - condTownPrev.price >= 0 ? '+' : '') + (condTown.price - condTownPrev.price).toFixed(1) : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280' }}>Δ price</div>
                </div>
              </div>
              {/* Mini 5-turn price forecast row */}
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: 5 }, (_, i) => turn + i).map(t => {
                  const ts = townStates.find(s => s.town === condTownName && s.turn === t)
                  return (
                    <div key={t} style={{
                      flex: 1, textAlign: 'center', padding: '5px 4px',
                      borderRadius: 8, background: t === turn ? 'rgba(255,107,44,0.12)' : 'rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: t === turn ? '#FF6B2C' : '#1A1A2E' }}>
                        {ts ? ts.price.toFixed(1) : '—'}
                      </div>
                      <div style={{ fontSize: 9, color: '#9CA3AF' }}>T{t}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              {isLoading ? 'Loading…' : 'No data for this turn'}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
