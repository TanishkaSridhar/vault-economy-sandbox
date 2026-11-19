import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GlassCard } from '../ui/GlassCard'
import { PageHeader } from '../layout/PageHeader'
import { Badge } from '../ui/Badge'
import { useTurn } from '../../hooks/useTurn'
import { useRunData, useTurnDecisions, getTownStatesAtTurn, getAgentStatesAtTurn } from '../../hooks/useSimData'
import { CozyWorld } from '../world/cozy/CozyWorld'

const TERRAIN_ICONS: Record<string, string> = {
  RIVER: '🌊', PLAINS: '🌾', COAST: '⚓', FOREST: '🌲',
  MARSH: '🌿', HILLS: '⛰️', DESERT: '🏜️', MOUNTAINS: '🏔️',
}
const TERRAIN_COLOURS: Record<string, string> = {
  RIVER: '#4FC3F7', PLAINS: '#81C784', COAST: '#64B5F6', FOREST: '#388E3C',
  MARSH: '#80CBC4', HILLS: '#A5D6A7', DESERT: '#FFB74D', MOUNTAINS: '#B0BEC5',
}

export function Towns() {
  const [searchParams] = useSearchParams()
  const urlTown = searchParams.get('town')
  const [selectedTown, setSelectedTown] = useState<string | null>(urlTown)
  const { turn, runId } = useTurn()
  const { towns, agents, roads, agentStates, townStates, isLoading } = useRunData(runId)
  const turnDecisions = useTurnDecisions(runId, turn)

  const currentTownStates = getTownStatesAtTurn(townStates, turn)
  const currentAgentStates = getAgentStatesAtTurn(agentStates, turn)
  const detailTown = towns.find(t => t.name === selectedTown) ?? null
  const detailState = currentTownStates.find(t => t.town === selectedTown) ?? null
  const townHistory = selectedTown
    ? townStates.filter(ts => ts.town === selectedTown).sort((a, b) => a.turn - b.turn)
    : []
  const agentsHere = selectedTown
    ? currentAgentStates.filter(a => a.town === selectedTown || a.destination === selectedTown)
    : []

  if (isLoading) return (
    <div>
      <PageHeader title="Towns" subtitle="All 8 towns in the simulation world" />
      <GlassCard style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Loading…</GlassCard>
    </div>
  )

  return (
    <div>
      <PageHeader title="Towns" subtitle="All 8 towns in the simulation world" />
      <div style={{ display: 'flex', gap: 20 }}>
        {/* Town gallery */}
        <div style={{ flex: selectedTown ? '0 0 300px' : 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: selectedTown ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {towns.map(town => {
              const state = currentTownStates.find(ts => ts.town === town.name)
              const prevState = townStates.find(ts => ts.town === town.name && ts.turn === Math.max(1, turn - 1))
              const priceChange = state && prevState ? state.price - prevState.price : 0
              const agentCount = currentAgentStates.filter(a => a.town === town.name).length
              const isActive = selectedTown === town.name
              return (
                <GlassCard key={town.name} hoverable onClick={() => setSelectedTown(isActive ? null : town.name)}
                  style={{ padding: 16, border: isActive ? '1.5px solid #FF6B2C' : undefined, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 20 }}>{TERRAIN_ICONS[town.terrain] ?? '🏘️'}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginTop: 6 }}>{town.name}</div>
                      <div style={{ fontSize: 10, color: TERRAIN_COLOURS[town.terrain], fontWeight: 600, marginTop: 2 }}>{town.terrain}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#FF6B2C' }}>
                        {state ? state.price.toFixed(1) : town.start_price.toFixed(1)} 🪙
                      </div>
                      <div style={{ fontSize: 10, color: priceChange > 0 ? '#E53935' : priceChange < 0 ? '#43A047' : '#9CA3AF', marginTop: 2 }}>
                        {priceChange !== 0 ? (priceChange > 0 ? '▲' : '▼') + Math.abs(priceChange).toFixed(1) : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>📦 {state?.stock ?? town.start_stock}</span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>👥 {agentCount}</span>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedTown && detailTown && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {/* 3D diorama */}
            <GlassCard style={{ padding: 0, overflow: 'hidden', height: 420 }}>
              <CozyWorld
                agents={agents}
                towns={towns}
                roads={roads}
                agentStates={agentStates}
                townStates={townStates}
                decisions={turnDecisions}
                focusTown={selectedTown}
                onTownClick={setSelectedTown}
                showLegend={false}
              />
            </GlassCard>

            {/* Info row */}
            <GlassCard style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 20 }}>{TERRAIN_ICONS[detailTown.terrain]}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', marginTop: 4 }}>{detailTown.name}</div>
                  <div style={{ fontSize: 11, color: TERRAIN_COLOURS[detailTown.terrain], fontWeight: 600, marginTop: 2 }}>
                    {detailTown.terrain.charAt(0) + detailTown.terrain.slice(1).toLowerCase()} terrain
                  </div>
                </div>
                {detailState && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#FF6B2C' }}>{detailState.price.toFixed(1)} 🪙</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>Stock: {detailState.stock}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Sold: {detailState.sold} · Bought: {detailState.bought}</div>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Price history */}
            <GlassCard style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Price History</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {townHistory.map(ts => (
                  <div key={ts.turn} style={{
                    textAlign: 'center', padding: '4px 7px', borderRadius: 7,
                    background: ts.turn === turn ? 'rgba(255,107,44,0.15)' : 'rgba(0,0,0,0.04)', minWidth: 40,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ts.turn === turn ? '#FF6B2C' : '#1A1A2E' }}>{ts.price.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: '#9CA3AF' }}>T{ts.turn}</div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Agents here */}
            <GlassCard style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Agents ({agentsHere.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {agentsHere.length === 0 ? (
                  <div style={{ color: '#9CA3AF', fontSize: 12 }}>No agents here this turn.</div>
                ) : agentsHere.map(as => {
                  const agent = agents.find(a => a.name === as.agent)
                  return (
                    <div key={as.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge role={(agent?.role ?? 'Trader') as any} size="sm" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{as.agent}</span>
                        {as.destination && as.destination !== as.town && (
                          <span style={{ fontSize: 10, color: '#9CA3AF' }}>→ {as.destination}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>💰 {as.money.toFixed(1)} · 🌾 {as.food}</div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}
